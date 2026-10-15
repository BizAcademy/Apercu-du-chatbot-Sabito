import { Router } from "express";
import { z } from "zod";
import { getProject } from "./projects";
import { pool } from "./database";
import { answerUnanswered } from "./unanswered";
import { backendStatus } from "./backend-bridge";
import { getConversationMessages } from "./conversations";

// Mounted after the existing /v1/admin authentication middleware.
export const supportAdminRoutes = Router();
supportAdminRoutes.use("/v1/admin/projects/:projectId/unanswered", async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.projectId).success || !await getProject(req.params.projectId as string)) {
    res.status(404).json({ message: "Plateforme introuvable." }); return;
  }
  next();
});
supportAdminRoutes.get("/v1/admin/projects/:projectId/unanswered", async (req, res) => {
  const status = z.enum(["a_traiter", "traite", "all"]).safeParse(req.query.status ?? "a_traiter");
  const page = z.coerce.number().int().min(0).max(100000).safeParse(req.query.page ?? 0);
  if (!status.success || !page.success) { res.status(422).json({message:"Filtre invalide."}); return; }
  const args: unknown[] = [req.params.projectId];
  const filter = status.data === "all" ? "" : " AND statut=$2";
  if (filter) args.push(status.data);
  const count = await pool.query(`SELECT COUNT(*) AS total FROM questions_sans_reponse WHERE plateforme=$1${filter}`, args);
  const { rows } = await pool.query(`SELECT id,question,plateforme,utilisateur_id,statut,
    nombre_de_fois_posee,date_creation,derniere_date,document_id
    FROM questions_sans_reponse WHERE plateforme=$1${filter}
    ORDER BY nombre_de_fois_posee DESC,derniere_date DESC,id LIMIT 50 OFFSET $${args.length + 1}`, [...args, page.data * 50]);
  res.json({ data: rows, total: Number(count.rows[0].total), page: page.data });
});
supportAdminRoutes.post("/v1/admin/projects/:projectId/unanswered/:questionId/answer", async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.questionId);
  const body = z.object({content:z.string().trim().min(20).max(20000)}).strict().safeParse(req.body);
  if (!id.success || !body.success) { res.status(422).json({message:"Une réponse de 20 à 20 000 caractères est requise."}); return; }
  const document = await answerUnanswered(req.params.projectId as string, id.data, body.data.content);
  if (!document) { res.status(409).json({message:"Question introuvable ou déjà traitée. Actualise la liste."}); return; }
  res.status(201).json({success:true,data:document});
});
supportAdminRoutes.get("/v1/admin/projects/:projectId/backend-status",async(req,res)=>{
  const id=z.string().uuid().safeParse(req.params.projectId);
  if (!id.success || !await getProject(id.data)) {res.sendStatus(404);return;}
  res.json(backendStatus(id.data));
});
supportAdminRoutes.get("/v1/admin/projects/:projectId/tickets",async(req,res)=>{
  const id=z.string().uuid().safeParse(req.params.projectId);
  const status=z.enum(["ouvert","ferme","all"]).safeParse(req.query.status??"ouvert");
  const page=z.coerce.number().int().min(0).max(100000).safeParse(req.query.page??0);
  if (!id.success || !status.success || !page.success) {res.sendStatus(422);return;}
  const values:unknown[]=[id.data],where=status.data==="all"?"":" AND status=$2";
  if(where) values.push(status.data);
  const count=await pool.query(`SELECT COUNT(*) AS total FROM sabito_core.support_tickets WHERE project_id=$1${where}`,values);
  const result=await pool.query(`SELECT * FROM sabito_core.support_tickets WHERE project_id=$1${where}
    ORDER BY created_at DESC,id LIMIT 50 OFFSET $${values.length+1}`,[...values,page.data*50]);
  res.json({data:result.rows,total:Number(count.rows[0].total),page:page.data});
});
supportAdminRoutes.patch("/v1/admin/projects/:projectId/tickets/:ticketId",async(req,res)=>{
  const project=z.string().uuid().safeParse(req.params.projectId),id=z.string().uuid().safeParse(req.params.ticketId);
  const body=z.object({status:z.enum(["ouvert","ferme"])}).strict().safeParse(req.body);
  if(!project.success || !id.success || !body.success) {res.sendStatus(422);return;}
  const changed=await pool.query("UPDATE sabito_core.support_tickets SET status=$1,updated_at=CURRENT_TIMESTAMP(6) WHERE id=$2 AND project_id=$3",
    [body.data.status,id.data,project.data]);
  if(!changed.rowCount) {res.sendStatus(404);return;}
  res.json({success:true});
});
supportAdminRoutes.get("/v1/admin/projects/:projectId/tickets/:ticketId/messages",async(req,res)=>{
  const project=z.string().uuid().safeParse(req.params.projectId),id=z.string().uuid().safeParse(req.params.ticketId);
  if(!project.success || !id.success) {res.sendStatus(422);return;}
  const result=await pool.query("SELECT conversation_id FROM sabito_core.support_tickets WHERE id=$1 AND project_id=$2",[id.data,project.data]);
  if(!result.rows.length) {res.sendStatus(404);return;}
  res.json({data:await getConversationMessages(String(result.rows[0].conversation_id))});
});
