import { createHash, randomUUID } from "node:crypto";
import { pool } from "./database";
import { normalizeQuestion } from "./question-normalization";
import { safeVariant } from "./variant-privacy";

export async function recordVariantCandidate(projectId:string,documentId:string,text:string,
  reason:"selection"|"positive_feedback") {
  const formulation=safeVariant(text);
  if(!formulation)return;
  const canonical=normalizeQuestion(formulation);
  const {rows}=await pool.query(`SELECT d.title,v.variantes_de_question FROM sabito_core.knowledge_documents d
    LEFT JOIN sabito_core.knowledge_question_variants v ON v.document_id=d.id AND v.project_id=d.project_id
    WHERE d.id=$1 AND d.project_id=$2 AND d.status='ready'`,[documentId,projectId]);
  if(!rows.length)return;
  const active=[String(rows[0].title),...JSON.parse(String(rows[0].variantes_de_question??"[]"))];
  if(active.some((value:string)=>normalizeQuestion(value)===canonical))return;
  // Bounded per project as well as socket rate limits. Repeated/refused
  // candidates retain their status and can never reactivate themselves.
  await pool.query(`INSERT INTO sabito_core.variant_candidates
    (id,project_id,document_id,formulation,formulation_hash,reason)
    SELECT $1,$2,$3,$4,$5,$6 FROM DUAL WHERE
      (SELECT COUNT(*) FROM sabito_core.variant_candidates WHERE project_id=$2)<2000
    ON DUPLICATE KEY UPDATE occurrences=LEAST(occurrences+1,1000000)`,
    [randomUUID(),projectId,documentId,formulation,createHash("sha256").update(canonical).digest("hex"),reason]);
}
