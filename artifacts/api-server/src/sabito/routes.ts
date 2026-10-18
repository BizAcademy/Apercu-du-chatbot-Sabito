import { randomUUID } from "node:crypto";
import { Router,type Request,type Response,type NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { AddPlatformKnowledgeBody,CreateSabitoProjectBody,UpdatePlatformKnowledgeBody } from "@workspace/api-zod";
import { pool } from "./database";
import { activeCredential,authenticateProject,createProject,getProject,listProjects,rotateProjectCredential } from "./projects";
import { configurationStatus,parseBasicCredentials,signAccessToken,tokenTtl,validAdminKey,verifyAccessToken,type AccessClaims } from "./security";
import { saveKnowledge } from "./knowledge";
import { getConversationMessages } from "./conversations";
import { revokeProjectSockets } from "./socket";
import { widgetOrigins, widgetOriginsSchema } from "./widget";
import { supportAdminRoutes } from "./support-admin";
import { backendBridgeRoutes, revokeBackendJobs } from "./backend-bridge";
import { normalizedText } from "./semantic";
import { assistantAdminRoutes,touchAssistant } from "./assistant-settings";

export const coreRoutes = Router();
const idSchema = z.string().uuid();
const identitySchema = z.object({external_user_id:z.string().trim().min(1).max(191).optional(),
  external_user_name:z.string().trim().min(1).max(100).optional()});
const sensitiveLimiter = rateLimit({windowMs:60000,limit:120,skipSuccessfulRequests:true,standardHeaders:"draft-7",legacyHeaders:false});
coreRoutes.use("/v1",(_req,res,next) => {res.setHeader("Cache-Control","no-store");next();});
coreRoutes.get("/v1/status",(_req,res) => { res.json(configurationStatus()); });
coreRoutes.use("/v1/admin",sensitiveLimiter,(req,res,next) => {
  if (!configurationStatus().configured) {
    res.status(503).json({success:false,message:"Configure les clés Sabito dans les Secrets avant de te connecter."}); return;
  }
  if (!validAdminKey(req.header("x-admin-key") ?? "")) {
    res.status(401).json({success:false,message:"Clé administrateur incorrecte."});return;
  }
  next();
});
function tokenResponse(req: Request,res: Response,projectId: string,clientId: string,externalUserId: string,guest=false,externalUserName?:string) {
  const accessToken = signAccessToken({sub:projectId,clientId,externalUserId,
    externalUserName:!guest?externalUserName:undefined,
    scope:["chat:connect",...(!guest && externalUserId!=="sabito-admin-preview" && !externalUserId.startsWith("guest:") ? ["member:verified"] : [])]});
  const url = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  res.json({success:true,data:{access_token:accessToken,token_type:"Bearer",expires_in:tokenTtl,
    socket_url:url,socket_path:"/socket.io",external_user_id:externalUserId,identity_type:guest ? "guest" : "platform_user"}});
}
coreRoutes.post("/v1/auth/token",sensitiveLimiter,async (req,res) => {
  if (req.headers.origin) {res.status(403).json({message:"L’échange de clés est réservé au serveur de la plateforme."});return;}
  if (!configurationStatus().configured) {res.status(503).json({success:false,message:"Sabito n’est pas encore configuré."});return;}
  const credentials = parseBasicCredentials(req.header("authorization"));
  const body = identitySchema.safeParse(req.body ?? {});
  if (!body.success) {res.status(422).json({success:false,message:"Identité invalide."});return;}
  if (!credentials) {res.status(401).json({success:false,message:"Identifiants de plateforme requis."});return;}
  const project = await authenticateProject(credentials.clientId,credentials.clientSecret);
  if (!project) {res.status(401).json({success:false,message:"Identifiants invalides ou révoqués."});return;}
  tokenResponse(req,res,project.id,project.clientId,body.data.external_user_id ?? `guest:${randomUUID()}`,!body.data.external_user_id,body.data.external_user_name);
});
coreRoutes.get("/v1/admin/projects",async (_req,res) => {res.json({success:true,data:await listProjects()});});
coreRoutes.get("/v1/admin/projects/:projectId/widget", async (req, res) => {
  const id = idSchema.safeParse(req.params.projectId);
  if (!id.success || !await getProject(id.data)) { res.sendStatus(404); return; }
  res.json({ origins: await widgetOrigins(id.data) });
});
coreRoutes.put("/v1/admin/projects/:projectId/widget", async (req, res) => {
  const id = idSchema.safeParse(req.params.projectId), body = widgetOriginsSchema.safeParse(req.body);
  if (!id.success || !body.success) { res.status(422).json({ message: "Saisis les origines HTTPS exactes, sans chemin." }); return; }
  if (!await getProject(id.data)) { res.sendStatus(404); return; }
  await pool.query("INSERT INTO sabito_core.widget_settings (project_id,origins_json) VALUES ($1,$2) ON DUPLICATE KEY UPDATE origins_json=VALUES(origins_json)",
    [id.data, JSON.stringify([...new Set(body.data.origins)])]);
  revokeProjectSockets(id.data);
  res.json({ origins: body.data.origins });
});
coreRoutes.post("/v1/admin/projects",async (req,res) => {
  const parsed = CreateSabitoProjectBody.safeParse(req.body);
  if (!parsed.success || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed.data.slug) ||
    parsed.data.name.trim().length < 2 || parsed.data.assistant_name.trim().length < 2 ||
    parsed.data.system_prompt.trim().length < 20) {
    res.status(422).json({success:false,message:"Vérifie le nom, l’identifiant et les instructions de la plateforme."});return;
  }
  const result = await createProject(parsed.data);
  res.status(201).json({success:true,data:result});
});
coreRoutes.post("/v1/admin/projects/:projectId/credentials/rotate",async (req,res) => {
  const id = idSchema.safeParse(req.params.projectId);
  if (!id.success) {res.status(422).json({success:false,message:"Identifiant invalide."});return;}
  const credentials = await rotateProjectCredential(id.data);
  if (!credentials) {res.status(404).json({success:false,message:"Plateforme introuvable."});return;}
  revokeBackendJobs(id.data);
  revokeProjectSockets(id.data);
  res.json({success:true,data:credentials});
});
coreRoutes.post("/v1/admin/projects/:projectId/test-token",async (req,res) => {
  const id = idSchema.safeParse(req.params.projectId);
  if (!id.success) {res.status(422).json({success:false,message:"Identifiant invalide."});return;}
  const credential = await activeCredential(id.data);
  if (!credential) {res.status(404).json({success:false,message:"Plateforme inactive ou introuvable."});return;}
  tokenResponse(req,res,id.data,credential.client_id,"sabito-admin-preview");
});
coreRoutes.use("/v1/admin/projects/:projectId/knowledge",async (req,res,next) => {
  const id = idSchema.safeParse(req.params.projectId);
  if (!id.success) {res.status(422).json({success:false,message:"Identifiant invalide."});return;}
  if (!await getProject(id.data)) {res.status(404).json({success:false,message:"Plateforme introuvable."});return;}
  next();
});
coreRoutes.get("/v1/admin/projects/:projectId/knowledge",async (req,res) => {
  const result = await pool.query(`SELECT kd.id,kd.title,kd.content,q.variantes_de_question,f.questions_json FROM sabito_core.knowledge_documents kd
    LEFT JOIN sabito_core.knowledge_question_variants q ON q.document_id=kd.id AND q.project_id=kd.project_id
    LEFT JOIN sabito_core.knowledge_follow_ups f ON f.document_id=kd.id AND f.project_id=kd.project_id
    WHERE kd.project_id=$1 AND kd.status='ready' ORDER BY kd.updated_at DESC`,[req.params.projectId]);
  res.json({success:true,data:result.rows.map(({questions_json,...row})=>({...row,
    variantes_de_question:JSON.parse(String(row.variantes_de_question??"[]")),
    follow_up_questions:JSON.parse(String(questions_json??"[]"))}))});
});
coreRoutes.post("/v1/admin/projects/:projectId/knowledge",async (req,res) => {
  const parsed = AddPlatformKnowledgeBody.safeParse(req.body);
  if (!parsed.success || parsed.data.title.trim().length < 2 || parsed.data.content.trim().length < 20) {
    res.status(422).json({success:false,message:"Titre ou contenu invalide (20 caractères minimum)."});return;
  }
  if(parsed.data.variantes_de_question?.length && parsed.data.content.length>20000) {
    res.status(422).json({message:"Une réponse associée à des variantes doit faire au maximum 20 000 caractères."});return;
  }
  if(parsed.data.variantes_de_question?.some(value=>normalizedText(value).length<2)) {
    res.status(422).json({message:"Chaque formulation doit contenir au moins deux lettres ou chiffres."});return;
  }
  if(parsed.data.follow_up_questions?.some(item=>item.question.trim().length<2||!item.answer.trim().length)) {
    res.status(422).json({message:"Chaque question proposée doit contenir une question et une réponse non vides."});return;
  }
  const document = await saveKnowledge(String(req.params.projectId),parsed.data.title.trim(),parsed.data.content.trim(),
    undefined,undefined,parsed.data.variantes_de_question,parsed.data.follow_up_questions);
  res.status(201).json({success:true,data:document});
});
coreRoutes.put("/v1/admin/projects/:projectId/knowledge/:documentId",async (req,res) => {
  const id = idSchema.safeParse(req.params.documentId), parsed = UpdatePlatformKnowledgeBody.safeParse(req.body);
  if (!id.success || !parsed.success || parsed.data.title.trim().length < 2 || parsed.data.content.trim().length < 20) {
    res.status(422).json({success:false,message:"Document invalide."});return;
  }
  if(parsed.data.variantes_de_question?.length && parsed.data.content.length>20000) {
    res.status(422).json({message:"Une réponse associée à des variantes doit faire au maximum 20 000 caractères."});return;
  }
  if(parsed.data.variantes_de_question?.some(value=>normalizedText(value).length<2)) {
    res.status(422).json({message:"Chaque formulation doit contenir au moins deux lettres ou chiffres."});return;
  }
  if(parsed.data.follow_up_questions?.some(item=>item.question.trim().length<2||!item.answer.trim().length)) {
    res.status(422).json({message:"Chaque question proposée doit contenir une question et une réponse non vides."});return;
  }
  const document = await saveKnowledge(String(req.params.projectId),parsed.data.title.trim(),parsed.data.content.trim(),id.data,
    undefined,parsed.data.variantes_de_question,parsed.data.follow_up_questions);
  if (!document) {res.status(404).json({success:false,message:"Document introuvable."});return;}
  res.json({success:true,data:document});
});
coreRoutes.delete("/v1/admin/projects/:projectId/knowledge/:documentId",async (req,res) => {
  const id = idSchema.safeParse(req.params.documentId);
  if (!id.success) {res.status(422).json({success:false,message:"Identifiant invalide."});return;}
  const result = await pool.query(`DELETE FROM sabito_core.knowledge_documents WHERE id=$1 AND project_id=$2`,[id.data,req.params.projectId]);
  if (!result.rowCount) {res.status(404).json({success:false,message:"Document introuvable."});return;}
  await touchAssistant(String(req.params.projectId));
  res.status(204).end();
});
async function authorizedUser(req: Request): Promise<AccessClaims | null> {
  try {
    const token = req.header("authorization")?.replace(/^Bearer /,"") ?? "";
    const claims = verifyAccessToken(token);
    return await activeCredential(claims.sub,claims.clientId) ? claims : null;
  } catch {return null;}
}
coreRoutes.get("/v1/conversations/:conversationId/messages",async (req,res) => {
  const claims = await authorizedUser(req), id = idSchema.safeParse(req.params.conversationId);
  if (!claims) {res.status(401).json({success:false,message:"Connexion expirée ou révoquée."});return;}
  if (!id.success) {res.status(422).json({success:false,message:"Identifiant invalide."});return;}
  const result = await pool.query(`SELECT id FROM sabito_core.conversations
    WHERE id=$1 AND project_id=$2 AND external_user_id=$3`,[id.data,claims.sub,claims.externalUserId]);
  if (!result.rowCount) {res.status(404).json({success:false,message:"Conversation introuvable."});return;}
  res.json({success:true,data:await getConversationMessages(id.data)});
});
coreRoutes.use(supportAdminRoutes);
coreRoutes.use(assistantAdminRoutes);
coreRoutes.use(backendBridgeRoutes);
coreRoutes.use((error: {code?:string},req: Request,res: Response,_next: NextFunction) => {
  if (error.code === "23505") {res.status(409).json({success:false,message:"Cet identifiant de plateforme existe déjà."});return;}
  req.log.error({err:error},"Sabito request failed");
  res.status(500).json({success:false,message:"L’opération Sabito a échoué."});
});
