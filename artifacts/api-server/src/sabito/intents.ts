import { randomUUID } from "node:crypto";
import { pool } from "./database";
import { requestBackend, type BackendOperation, type BackendResult } from "./backend-bridge";
import type { AccessClaims } from "./security";
import { normalizeQuestion, recordUnanswered } from "./unanswered";

const transactionFields = [
  {name:"deposit_number",prompt:"Quel est votre numéro de dépôt ?",valid:(s:string)=>/^[\p{L}\p{N}._/-]{1,100}$/u.test(s)},
  {name:"country",prompt:"Dans quel pays avez-vous effectué ce dépôt ?",valid:(s:string)=>/^[\p{L} .'-]{2,80}$/u.test(s)},
  {name:"payment_method",prompt:"Quel moyen de paiement avez-vous utilisé ?",valid:(s:string)=>s.length>=2&&s.length<=80},
  {name:"transaction_id",prompt:"Quel est l’ID de la transaction ?",valid:(s:string)=>/^[\p{L}\p{N}._/-]{1,128}$/u.test(s)},
];
// Extend this registry with fixed operations, validators and result formatters.
// Never let a message choose an arbitrary URL, database query or user identity.
export const intentRegistry = {
  account_activation:{name:"Compte non activé",backendOperation:"account_activation",
    required:transactionFields,detect:/(compte.*(non activ|pas activ|inactif|desactiv)|activ.*compte)/,
    formatResult:(result:BackendResult)=>formatResult("account_activation",result)},
  deposit_status:{name:"Dépôt non reçu",backendOperation:"deposit_status",
    required:transactionFields,detect:/(depot.*(non recu|pas recu|manquant|attente|statut)|(?:statut|verifi|ou est).*depot)/,
    formatResult:(result:BackendResult)=>formatResult("deposit_status",result)},
  referral_code:{name:"Code parrain",backendOperation:"referral_code",
    required:[],detect:/(code.*parrain|code.*affili|lien.*parrain|mon parrainage)/,
    formatResult:(result:BackendResult)=>formatResult("referral_code",result)},
} satisfies Record<BackendOperation,{name:string;backendOperation:BackendOperation;required:typeof transactionFields;detect:RegExp;formatResult:(result:BackendResult)=>string|null}>;
const referralGuide="Connectez-vous à votre compte Biz Connect Academy, cliquez sur les trois traits en haut à gauche, cliquez sur Mes gains, vous verrez votre code parrain.";
export function isVerifiedMember(claims:AccessClaims) {
  return claims.scope.includes("member:verified") && !claims.externalUserId.startsWith("guest:")
    && claims.externalUserId!=="sabito-admin-preview";
}
async function ticket(projectId:string,conversationId:string,claims:AccessClaims,intent:BackendOperation,reason:string,
  executor:Pick<typeof pool,"query">=pool) {
  await executor.query(`INSERT INTO sabito_core.support_tickets
    (id,project_id,conversation_id,external_user_id,intent,reason) VALUES ($1,$2,$3,$4,$5,$6)
    ON DUPLICATE KEY UPDATE status='ouvert',reason=VALUES(reason),updated_at=CURRENT_TIMESTAMP(6)`,
    [randomUUID(),projectId,conversationId,isVerifiedMember(claims)?claims.externalUserId:null,intent,reason]);
  const result=await executor.query("SELECT id FROM sabito_core.support_tickets WHERE project_id=$1 AND conversation_id=$2 AND intent=$3",
    [projectId,conversationId,intent]);
  return String(result.rows[0].id);
}
function formatResult(intent:BackendOperation,result:BackendResult):string|null {
  if (intent==="referral_code") return result.status==="ok" ? `Votre code parrain est : ${result.code}` : null;
  const messages:Record<string,string> = intent==="account_activation" ? {
    active:"Le backend confirme que votre compte est activé.",
    inactive:"Le backend indique que votre compte n’est pas encore activé.",
    pending:"Le backend indique que la transaction est en attente ; l’activation n’est pas encore confirmée.",
    failed:"Le backend indique que la transaction a échoué ; l’activation n’est pas confirmée.",
  } : {
    confirmed:"Le backend confirme que votre dépôt a été reçu.",
    pending:"Le backend indique que votre dépôt est encore en attente.",
    failed:"Le backend indique que votre dépôt a échoué.",
  };
  return messages[result.status as keyof typeof messages] ?? null;
}
export async function handleIntent(claims:AccessClaims, conversationId:string, text:string):Promise<string|null> {
  const normalized=normalizeQuestion(text);
  const detected=(Object.keys(intentRegistry) as BackendOperation[]).find(name=>intentRegistry[name].detect.test(normalized));
  const connection=await pool.connect();
  let intent:BackendOperation,fields:Record<string,string>,originalQuestion=text;
  try {
    await connection.query("BEGIN");
    const owner=await connection.query("SELECT id FROM sabito_core.conversations WHERE id=$1 AND project_id=$2 AND external_user_id=$3 FOR UPDATE",
      [conversationId,claims.sub,claims.externalUserId]);
    if(!owner.rows.length) throw new Error("CONVERSATION_NOT_FOUND");
    const {rows}=await connection.query(`SELECT intent,original_question,collected_json,status,
      (updated_at < CURRENT_TIMESTAMP(6) - INTERVAL 30 SECOND) AS stale FROM sabito_core.intent_sessions
      WHERE conversation_id=$1 AND project_id=$2 FOR UPDATE`,[conversationId,claims.sub]);
    const current=rows[0];
    if (current?.status==="checking") {
      if (Number(current.stale)===1) {
        const id=await ticket(claims.sub,conversationId,claims,current.intent as BackendOperation,"BACKEND_INTERRUPTED",connection);
        await recordUnanswered(claims.sub,String(current.original_question),isVerifiedMember(claims)?claims.externalUserId:undefined,connection);
        await connection.query("UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}' WHERE conversation_id=$1",[conversationId]);
        await connection.query("COMMIT");
        return `La vérification a été interrompue. Aucune conclusion n’a été tirée. Un ticket a été créé pour l’équipe : ${id}.`;
      }
      await connection.query("COMMIT");return "Une vérification est déjà en cours pour cette conversation. Merci de patienter.";
    }
    if (/^(annuler|annule|stop|abandonner)$/.test(normalized) && current?.status==="collecting") {
      await connection.query("UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}' WHERE conversation_id=$1",[conversationId]);
      await connection.query("COMMIT");return "La vérification est annulée. Comment puis-je vous aider ?";
    }
    if (!detected && current?.status!=="collecting") {await connection.query("COMMIT");return null;}
    intent=detected ?? current.intent as BackendOperation;
    if (!(intent in intentRegistry)) {await connection.query("COMMIT");return null;}
    fields=(!detected || (detected===current?.intent && current.status==="collecting")) && current
      ? JSON.parse(String(current.collected_json)) : {};
    if(current?.status==="collecting" && (!detected || detected===current.intent)) originalQuestion=String(current.original_question);
    const definition:{required:typeof transactionFields;detect:RegExp}=intentRegistry[intent];
    if (intent==="referral_code" && !isVerifiedMember(claims)) {
      const project=await connection.query("SELECT slug,name FROM sabito_core.projects WHERE id=$1",[claims.sub]);
      const label=normalizeQuestion(`${project.rows[0]?.slug??""} ${project.rows[0]?.name??""}`);
      const guide=/\bbca\b|sabitobca|biz\s*connect\s*academy/.test(label) ? referralGuide
        : "Connectez-vous à votre compte sur cette plateforme pour accéder à votre code parrain. Si vous ne le trouvez pas, contactez l’équipe.";
      await connection.query("UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}' WHERE conversation_id=$1 AND project_id=$2",
        [conversationId,claims.sub]);
      await connection.query("COMMIT");return guide;
    }
    const missing=definition.required.find(field=>!fields[field.name]);
    if (missing && !detected) {
      const value=text.trim();
      if (!missing.valid(value)) {await connection.query("COMMIT");return `Cette information n’a pas le format attendu. ${missing.prompt} Vous pouvez écrire « annuler ».`;}
      fields[missing.name]=value;
    }
    const next=definition.required.find(field=>!fields[field.name]);
    await connection.query(`INSERT INTO sabito_core.intent_sessions (conversation_id,project_id,intent,collected_json,status,original_question)
      VALUES ($1,$2,$3,$4,$5,$6) ON DUPLICATE KEY UPDATE intent=VALUES(intent),collected_json=VALUES(collected_json),
      original_question=VALUES(original_question),
      status=VALUES(status),updated_at=CURRENT_TIMESTAMP(6)`,
      [conversationId,claims.sub,intent,JSON.stringify(fields),next?"collecting":"checking",originalQuestion]);
    await connection.query("COMMIT");
    if (next) return `${next.prompt} Ne communiquez jamais de mot de passe ni de code de paiement. Vous pouvez écrire « annuler ».`;
  } catch(error) {await connection.query("ROLLBACK");throw error;}
  finally {connection.release();}
  let reason="BACKEND_UNAVAILABLE";
  try {
    if (!isVerifiedMember(claims)) {reason="MEMBER_AUTH_REQUIRED";throw new Error(reason);}
    const definition=intentRegistry[intent!];
    const response=await requestBackend(claims.sub,claims.externalUserId,definition.backendOperation,fields!);
    const answer=definition.formatResult(response);
    if (answer) return answer;
    reason="BACKEND_UNVERIFIED_RESULT";
  } catch (error) {
    const code=error instanceof Error ? error.message : "";
    if (["BACKEND_OFFLINE","BACKEND_TIMEOUT","BACKEND_BUSY","MEMBER_AUTH_REQUIRED"].includes(code)) reason=code;
  } finally {
    await pool.query(`UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}',updated_at=CURRENT_TIMESTAMP(6)
      WHERE conversation_id=$1 AND project_id=$2`,[conversationId,claims.sub]);
  }
  const id=await ticket(claims.sub,conversationId,claims,intent!,reason);
  await recordUnanswered(claims.sub,originalQuestion,isVerifiedMember(claims)?claims.externalUserId:undefined);
  return `Je ne peux pas vérifier cette information de façon fiable pour le moment. Un ticket a été créé pour l’équipe : ${id}.${reason==="MEMBER_AUTH_REQUIRED" ? " Une connexion membre vérifiée est nécessaire pour consulter vos données personnelles." : ""}`;
}
