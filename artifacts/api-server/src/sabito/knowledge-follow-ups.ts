import { createHash } from "node:crypto";
import { pool } from "./database";

export type FollowUp = {question:string;answer:string};
export function followUpId(documentId:string,item:FollowUp) {
  // Content-bound identifier: an old button must not silently return an edited answer.
  return `${documentId}:${createHash("sha256").update(JSON.stringify(item)).digest("hex").slice(0,24)}`;
}
export function followUpSuggestions(documentId:string,items:FollowUp[]) {
  return items.map(item=>({document_id:documentId,question:item.question,follow_up_id:followUpId(documentId,item)}));
}
export async function selectedFollowUp(projectId:string,id:string,question:string) {
  const documentId=id.split(":")[0];
  const {rows}=await pool.query(`SELECT f.questions_json FROM sabito_core.knowledge_follow_ups f
    JOIN sabito_core.knowledge_documents d ON d.id=f.document_id AND d.project_id=f.project_id
    WHERE f.project_id=$1 AND f.document_id=$2 AND d.status='ready'`,[projectId,documentId]);
  const items:FollowUp[]=JSON.parse(String(rows[0]?.questions_json??"[]"));
  return items.find(item=>followUpId(documentId,item)===id && item.question===question)??null;
}
