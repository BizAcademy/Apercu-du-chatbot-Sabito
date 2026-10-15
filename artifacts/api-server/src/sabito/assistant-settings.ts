import { Router } from "express";
import { z } from "zod";
import { pool } from "./database";
import { getProject } from "./projects";

export const identifier=z.string().regex(/^[a-z][a-z0-9_]{1,63}$/).refine(s=>!["constructor","prototype"].includes(s));
const text=z.string().trim().min(1).max(4000);
export const intentDefinition=z.object({
  id:identifier,name:z.string().trim().min(2).max(100),enabled:z.boolean(),
  triggers:z.array(z.string().trim().min(2).max(500)).min(1).max(30),
  fields:z.array(z.object({name:identifier,prompt:text,type:z.enum(["text","identifier","country"]),
    min_length:z.number().int().min(1).max(500),max_length:z.number().int().min(1).max(500)}).strict()
    .refine(f=>f.min_length<=f.max_length)).max(15),
  backend_function:identifier,guest_message:text,
  responses:z.object({success:text,pending:text,not_found:text,error:text}).strict(),
}).strict().refine(v=>new Set(v.fields.map(f=>f.name)).size===v.fields.length);
export const settingsSchema=z.object({
  confidence_threshold:z.number().min(0.35).max(1),
  synonyms:z.array(z.array(z.string().trim().min(2).max(80)).min(2).max(20)).max(100),
  greeting_member:text,greeting_guest:text,greeting_member_no_name:text,
  closing_message:z.string().max(4000),no_answer_message:text,suggestions_label:text,
  privacy_message:text,invalid_field_message:text,cancelled_message:text,checking_message:text,ticket_message:text,
  intents:z.array(intentDefinition).max(100),
}).strict().refine(s=>new Set(s.intents.map(i=>i.id)).size===s.intents.length);
export type AssistantSettings=z.infer<typeof settingsSchema>;
export type IntentDefinition=z.infer<typeof intentDefinition>;
const fields:IntentDefinition["fields"]=[
  {name:"deposit_number",prompt:"Quel est votre numéro de dépôt ?",type:"identifier",min_length:1,max_length:100},
  {name:"country",prompt:"Dans quel pays avez-vous effectué ce dépôt ?",type:"country",min_length:2,max_length:80},
  {name:"payment_method",prompt:"Quel moyen de paiement avez-vous utilisé ?",type:"text",min_length:2,max_length:80},
  {name:"transaction_id",prompt:"Quel est l’ID de la transaction ?",type:"identifier",min_length:1,max_length:128},
];
export function defaultSettings(bca=true):AssistantSettings {
  const guide=bca ? "Connectez-vous à votre compte Biz Connect Academy, cliquez sur les trois traits en haut à gauche, cliquez sur Mes gains, vous verrez votre code parrain."
    : "Connectez-vous à votre compte sur cette plateforme pour accéder à votre code parrain. Si vous ne le trouvez pas, contactez l’équipe.";
  return {confidence_threshold:0.72,synonyms:[
    ["dépôt","recharge","versement"],["voir","accéder","consulter","retrouver","afficher"],
    ["cours","formation","leçon","module"],["prix","tarif","coût"],["connexion","connecter","login"],
    ["parrain","parrainage","affiliation"],["paiement","payer","règlement"],["aide","assistance","support"],
  ],greeting_member:"Bonjour {nom_utilisateur} 👋, comment puis-je vous aider ?",
    greeting_guest:"Bonjour, comment puis-je vous aider ? Connectez-vous pour les demandes liées à votre compte.",
    greeting_member_no_name:"Bonjour, comment puis-je vous aider ?",
    closing_message:"À la prochaine ! N'hésitez pas à revenir si vous avez un souci.",
    no_answer_message:"Je n’ai pas de réponse exacte à cette question dans les références approuvées.",
    suggestions_label:"Voulez-vous dire :",privacy_message:"Ne communiquez jamais de mot de passe ni de code de paiement. Vous pouvez écrire « annuler ».",
    invalid_field_message:"Cette information n’a pas le format attendu.",cancelled_message:"La vérification est annulée. Comment puis-je vous aider ?",
    checking_message:"Une vérification est déjà en cours pour cette conversation. Merci de patienter.",
    ticket_message:"Je ne peux pas vérifier cette information de façon fiable pour le moment. Un ticket a été créé pour l’équipe : {ticket_id}.",
    intents:[
      {id:"account_activation",name:"Compte non activé",enabled:true,backend_function:"account_activation",fields,
        triggers:["Mon compte n’est pas activé","Compte non activé","Activer mon compte","Compte inactif"],guest_message:"Une connexion membre vérifiée est nécessaire pour consulter vos données personnelles.",
        responses:{success:"Le backend confirme que votre compte est activé.",pending:"Le backend indique que votre compte n’est pas encore activé.",
          not_found:"Le backend ne retrouve pas cette opération.",error:"La vérification de votre compte a échoué."}},
      {id:"deposit_status",name:"Dépôt non reçu",enabled:true,backend_function:"deposit_status",fields,
        triggers:["Mon dépôt n’est pas reçu","Dépôt non reçu","Vérifier mon dépôt","Où est mon dépôt","Dépôt en attente"],guest_message:"Une connexion membre vérifiée est nécessaire pour consulter vos données personnelles.",
        responses:{success:"Le backend confirme que votre dépôt a été reçu.",pending:"Le backend indique que votre dépôt est encore en attente.",
          not_found:"Le backend ne retrouve pas cette opération.",error:"La vérification du dépôt a échoué."}},
      {id:"referral_code",name:"Code parrain",enabled:true,backend_function:"referral_code",fields:[],
        triggers:["Mon code parrain","Code parrain","Code de parrainage","Mon lien de parrainage"],guest_message:guide,
        responses:{success:"Votre code parrain est : {code_parrain}",pending:"Votre code parrain est en cours de préparation.",
          not_found:"Le backend ne retrouve pas votre code parrain.",error:"La vérification du code parrain a échoué."}},
    ]};
}
const invalidators=new Set<(projectId:string)=>void>();
export function onAssistantChange(fn:(projectId:string)=>void) {invalidators.add(fn);}
export function invalidateAssistant(projectId:string) {for(const fn of invalidators) fn(projectId);}
export async function touchAssistant(projectId:string,executor:Pick<typeof pool,"query">=pool) {
  await executor.query(`INSERT INTO sabito_core.assistant_settings(project_id,config_json,revision) VALUES ($1,'{}',1)
    ON DUPLICATE KEY UPDATE revision=revision+1`,[projectId]);
  invalidateAssistant(projectId);
}
export async function readAssistantSettings(projectId:string) {
  const result=await pool.query(`SELECT s.config_json,s.revision,p.slug,p.name FROM sabito_core.projects p
    LEFT JOIN sabito_core.assistant_settings s ON s.project_id=p.id WHERE p.id=$1`,[projectId]);
  const row=result.rows[0];if(!row) throw new Error("PROJECT_NOT_FOUND");
  const bca=/\bbca\b|sabitobca|biz\s*connect\s*academy/i.test(`${row.slug} ${row.name}`);
  return {settings:settingsSchema.parse({...defaultSettings(bca),...JSON.parse(String(row.config_json??"{}"))}),revision:Number(row.revision??0)};
}
export const assistantAdminRoutes=Router();
assistantAdminRoutes.get("/v1/admin/projects/:projectId/assistant-settings",async(req,res)=>{
  if(!z.string().uuid().safeParse(req.params.projectId).success || !await getProject(String(req.params.projectId))) {res.sendStatus(404);return;}
  res.json(await readAssistantSettings(String(req.params.projectId)));
});
assistantAdminRoutes.put("/v1/admin/projects/:projectId/assistant-settings",async(req,res)=>{
  const id=String(req.params.projectId);
  const body=z.object({settings:settingsSchema,expected_revision:z.number().int().min(0)}).strict().safeParse(req.body);
  if(!z.string().uuid().safeParse(id).success || !body.success) {res.status(422).json({message:"Réglages invalides. Vérifie les noms, les champs et les modèles."});return;}
  if(!await getProject(id)) {res.sendStatus(404);return;}
  const connection=await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query("INSERT IGNORE INTO sabito_core.assistant_settings(project_id,config_json,revision) VALUES ($1,'{}',0)",[id]);
    const current=await connection.query("SELECT revision FROM sabito_core.assistant_settings WHERE project_id=$1 FOR UPDATE",[id]);
    if(Number(current.rows[0].revision)!==body.data.expected_revision) {
      await connection.query("ROLLBACK");res.status(409).json({message:"Ces réglages ont changé. Recharge-les avant d’enregistrer."});return;
    }
    await connection.query("UPDATE sabito_core.assistant_settings SET config_json=$2,revision=revision+1 WHERE project_id=$1",
      [id,JSON.stringify(body.data.settings)]);
    await connection.query("COMMIT");invalidateAssistant(id);
    res.json(await readAssistantSettings(id));
  } catch(error) {await connection.query("ROLLBACK");throw error;} finally {connection.release();}
});
