import { Router } from "express";
import { z } from "zod";
import { pool } from "./database";
import { getProject } from "./projects";
import { touchAssistant, invalidateAssistant } from "./assistant-settings";
import { normalizeQuestion } from "./question-normalization";
import { safeVariant } from "./variant-privacy";
import { saveKnowledge } from "./knowledge";

export const reviewMetadataSchema=z.object({
  category:z.string().trim().min(2).max(100),
  keywords:z.array(z.string().trim().min(2).max(80)).min(1).max(30),
  source:z.string().trim().min(10).max(4000),
});
export const knowledgeReviewRoutes=Router();
const base="/v1/admin/projects/:projectId";
knowledgeReviewRoutes.use(`${base}/knowledge-review`,async(req,res,next)=>{
  if(!z.uuid().safeParse(req.params.projectId).success||!await getProject(String(req.params.projectId))){res.sendStatus(404);return;}next();
});
knowledgeReviewRoutes.get(`${base}/knowledge-review`,async(req,res)=>{
  const {rows}=await pool.query(`SELECT d.id,d.title,d.content,d.status,r.category,r.keywords_json,r.source,
    v.variantes_de_question FROM sabito_core.knowledge_documents d
    JOIN sabito_core.knowledge_reviews r ON r.document_id=d.id AND r.project_id=d.project_id
    LEFT JOIN sabito_core.knowledge_question_variants v ON v.document_id=d.id AND v.project_id=d.project_id
    WHERE d.project_id=$1 ORDER BY d.updated_at DESC LIMIT 500`,[req.params.projectId]);
  res.json({data:rows.map(({keywords_json,variantes_de_question,...row})=>({...row,
    keywords:JSON.parse(String(keywords_json??"[]")),variants:JSON.parse(String(variantes_de_question??"[]"))}))});
});
knowledgeReviewRoutes.put(`${base}/knowledge-review/:documentId`,async(req,res)=>{
  const input=reviewMetadataSchema.extend({
    title:z.string().trim().min(2).max(500),content:z.string().trim().min(20).max(20000),
    variants:z.array(z.string().trim().min(2).max(500)).min(5).max(10),
  }).strict().safeParse(req.body);
  const {projectId,documentId}=req.params;
  if(!z.uuid().safeParse(documentId).success||!input.success){res.sendStatus(422);return;}
  const value=input.data;
  const saved=await saveKnowledge(String(projectId),value.title,value.content,String(documentId),undefined,
    value.variants,undefined,value);
  if(!saved){res.sendStatus(404);return;}res.json({ok:true});
});
knowledgeReviewRoutes.post(`${base}/knowledge-review/:documentId/decision`,async(req,res)=>{
  const decision=z.object({decision:z.enum(["approve","reject"])}).strict().safeParse(req.body);
  if(!decision.success||!z.uuid().safeParse(req.params.documentId).success){res.sendStatus(422);return;}
  const id=String(req.params.projectId),document=String(req.params.documentId),connection=await pool.connect();
  try {
    await connection.query("BEGIN");
    const {rows}=await connection.query(`SELECT d.status,r.category,r.source,r.keywords_json,v.variantes_de_question
      FROM sabito_core.knowledge_documents d JOIN sabito_core.knowledge_reviews r
      ON r.document_id=d.id AND r.project_id=d.project_id
      LEFT JOIN sabito_core.knowledge_question_variants v ON v.document_id=d.id AND v.project_id=d.project_id
      WHERE d.id=$1 AND d.project_id=$2 FOR UPDATE`,[document,id]);
    if(!rows.length){await connection.query("ROLLBACK");res.sendStatus(404);return;}
    const row=rows[0],approve=decision.data.decision==="approve";
    const variants=JSON.parse(String(row.variantes_de_question??"[]")) as string[];
    if(approve&&(!reviewMetadataSchema.safeParse({...row,keywords:JSON.parse(String(row.keywords_json))}).success||
      /à documenter|à compléter/i.test(row.source+" "+row.category)||
      variants.length<5||variants.length>10||new Set(variants.map(normalizeQuestion)).size!==variants.length)) {
      await connection.query("ROLLBACK");res.status(422).json({message:"Complétez la source, la catégorie, les mots-clés et 5 à 10 variantes distinctes avant validation."});return;
    }
    await connection.query("UPDATE sabito_core.knowledge_documents SET status=$1,updated_at=now() WHERE id=$2 AND project_id=$3",
      [approve?"ready":"rejected",document,id]);
    await connection.query("UPDATE sabito_core.knowledge_reviews SET reviewed_at=now() WHERE document_id=$1 AND project_id=$2",[document,id]);
    await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
      VALUES($1,'admin',$2,$3)`,[id,approve?"knowledge.approved":"knowledge.rejected",JSON.stringify({documentId:document})]);
    await touchAssistant(id,connection);await connection.query("COMMIT");invalidateAssistant(id);
    res.json({ok:true});
  }catch(error){await connection.query("ROLLBACK");throw error;}finally{connection.release();}
});
knowledgeReviewRoutes.get(`${base}/variant-candidates`,async(req,res)=>{
  if(!z.uuid().safeParse(req.params.projectId).success){res.sendStatus(422);return;}
  const {rows}=await pool.query(`SELECT v.id,v.document_id,v.formulation,v.status,v.reason,v.occurrences,d.title
    FROM sabito_core.variant_candidates v JOIN sabito_core.knowledge_documents d
    ON d.id=v.document_id AND d.project_id=v.project_id
    WHERE v.project_id=$1 ORDER BY v.created_at DESC LIMIT 500`,[req.params.projectId]);
  res.json({data:rows});
});
knowledgeReviewRoutes.post(`${base}/variant-candidates/:candidateId/decision`,async(req,res)=>{
  const input=z.object({decision:z.enum(["approve","reject"])}).strict().safeParse(req.body);
  if(!input.success||!z.uuid().safeParse(req.params.projectId).success||!z.uuid().safeParse(req.params.candidateId).success){res.sendStatus(422);return;}
  const id=String(req.params.projectId),connection=await pool.connect();
  try{
    await connection.query("BEGIN");
    const {rows}=await connection.query(`SELECT v.*,d.title,d.status AS document_status FROM sabito_core.variant_candidates v
      JOIN sabito_core.knowledge_documents d ON d.id=v.document_id AND d.project_id=v.project_id
      WHERE v.id=$1 AND v.project_id=$2 FOR UPDATE`,[req.params.candidateId,id]);
    const row=rows[0];
    if(!row){await connection.query("ROLLBACK");res.sendStatus(404);return;}
    if(row.status!=="pending"){await connection.query("ROLLBACK");res.status(409).json({message:"Cette variante a déjà été examinée."});return;}
    const approve=input.data.decision==="approve";
    if(approve) {
      if(row.document_status!=="ready"||safeVariant(row.formulation)!==row.formulation){await connection.query("ROLLBACK");res.status(422).json({message:"Validez la référence et vérifiez la confidentialité avant cette variante."});return;}
      const current=await connection.query("SELECT variantes_de_question FROM sabito_core.knowledge_question_variants WHERE document_id=$1 AND project_id=$2 FOR UPDATE",[row.document_id,id]);
      const variants=JSON.parse(String(current.rows[0]?.variantes_de_question??"[]")) as string[];
      const key=normalizeQuestion(row.formulation);
      if(![String(row.title),...variants].some(value=>normalizeQuestion(value)===key))variants.push(row.formulation);
      if(variants.length>100){await connection.query("ROLLBACK");res.status(422).json({message:"Limite de 100 variantes atteinte. Supprimez les doublons."});return;}
      await connection.query(`INSERT INTO sabito_core.knowledge_question_variants(document_id,project_id,variantes_de_question)
        VALUES($1,$2,$3) ON DUPLICATE KEY UPDATE variantes_de_question=VALUES(variantes_de_question)`,[row.document_id,id,JSON.stringify(variants)]);
    }
    await connection.query("UPDATE sabito_core.variant_candidates SET status=$1,reviewed_at=now() WHERE id=$2 AND project_id=$3",
      [approve?"approved":"rejected",row.id,id]);
    await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
      VALUES($1,'admin',$2,$3)`,[id,approve?"variant.approved":"variant.rejected",JSON.stringify({candidateId:row.id})]);
    await touchAssistant(id,connection);await connection.query("COMMIT");invalidateAssistant(id);res.json({ok:true});
  }catch(error){await connection.query("ROLLBACK");throw error;}finally{connection.release();}
});
