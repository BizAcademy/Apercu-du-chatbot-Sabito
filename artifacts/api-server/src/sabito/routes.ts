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

export const coreRoutes = Router();
const idSchema = z.string().uuid();
const identitySchema = z.object({external_user_id:z.string().trim().min(1).max(191).optional()});
const sensitiveLimiter = rateLimit({windowMs:60000,limit:120,standardHeaders:"draft-7",legacyHeaders:false});
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
function tokenResponse(req: Request,res: Response,projectId: string,clientId: string,externalUserId: string,guest=false) {
  const accessToken = signAccessToken({sub:projectId,clientId,externalUserId,scope:["chat:connect"]});
  const url = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  res.json({success:true,data:{access_token:accessToken,token_type:"Bearer",expires_in:tokenTtl,
    socket_url:url,socket_path:"/socket.io",external_user_id:externalUserId,identity_type:guest ? "guest" : "platform_user"}});
}
coreRoutes.post("/v1/auth/token",sensitiveLimiter,async (req,res) => {
  if (!configurationStatus().configured) {res.status(503).json({success:false,message:"Sabito n’est pas encore configuré."});return;}
  const credentials = parseBasicCredentials(req.header("authorization"));
  const body = identitySchema.safeParse(req.body ?? {});
  if (!body.success) {res.status(422).json({success:false,message:"Identité invalide."});return;}
  if (!credentials) {res.status(401).json({success:false,message:"Identifiants de plateforme requis."});return;}
  const project = await authenticateProject(credentials.clientId,credentials.clientSecret);
  if (!project) {res.status(401).json({success:false,message:"Identifiants invalides ou révoqués."});return;}
  tokenResponse(req,res,project.id,project.clientId,body.data.external_user_id ?? `guest:${randomUUID()}`,!body.data.external_user_id);
});
coreRoutes.get("/v1/admin/projects",async (_req,res) => {res.json({success:true,data:await listProjects()});});
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
  const result = await pool.query(`SELECT id,title,content FROM sabito_core.knowledge_documents
    WHERE project_id=$1 AND status='ready' ORDER BY updated_at DESC`,[req.params.projectId]);
  res.json({success:true,data:result.rows});
});
coreRoutes.post("/v1/admin/projects/:projectId/knowledge",async (req,res) => {
  const parsed = AddPlatformKnowledgeBody.safeParse(req.body);
  if (!parsed.success || parsed.data.title.trim().length < 2 || parsed.data.content.trim().length < 20) {
    res.status(422).json({success:false,message:"Titre ou contenu invalide (20 caractères minimum)."});return;
  }
  const document = await saveKnowledge(String(req.params.projectId),parsed.data.title.trim(),parsed.data.content.trim());
  res.status(201).json({success:true,data:document});
});
coreRoutes.put("/v1/admin/projects/:projectId/knowledge/:documentId",async (req,res) => {
  const id = idSchema.safeParse(req.params.documentId), parsed = UpdatePlatformKnowledgeBody.safeParse(req.body);
  if (!id.success || !parsed.success || parsed.data.title.trim().length < 2 || parsed.data.content.trim().length < 20) {
    res.status(422).json({success:false,message:"Document invalide."});return;
  }
  const document = await saveKnowledge(String(req.params.projectId),parsed.data.title.trim(),parsed.data.content.trim(),id.data);
  if (!document) {res.status(404).json({success:false,message:"Document introuvable."});return;}
  res.json({success:true,data:document});
});
coreRoutes.delete("/v1/admin/projects/:projectId/knowledge/:documentId",async (req,res) => {
  const id = idSchema.safeParse(req.params.documentId);
  if (!id.success) {res.status(422).json({success:false,message:"Identifiant invalide."});return;}
  const result = await pool.query(`DELETE FROM sabito_core.knowledge_documents WHERE id=$1 AND project_id=$2`,[id.data,req.params.projectId]);
  if (!result.rowCount) {res.status(404).json({success:false,message:"Document introuvable."});return;}
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
coreRoutes.use((error: {code?:string},req: Request,res: Response,_next: NextFunction) => {
  if (error.code === "23505") {res.status(409).json({success:false,message:"Cet identifiant de plateforme existe déjà."});return;}
  req.log.error({err:error},"Sabito request failed");
  res.status(500).json({success:false,message:"L’opération Sabito a échoué."});
});
