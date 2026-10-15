import { randomUUID } from "node:crypto";
import { pool } from "./database";
import { normalizedText } from "./semantic";
import { rankedQuestions } from "./question-search";
import { touchAssistant } from "./assistant-settings";

export type KnowledgeMatch = {title: string; content: string; question?:string; documentId?:string; similarity?:number; directAnswer?:boolean};
// Original chunking algorithm, unchanged.
export function chunkText(text: string, maximumLength = 1400, overlap = 150): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    let end = Math.min(cursor + maximumLength, normalized.length);
    if (end < normalized.length) {
      const boundary = Math.max(normalized.lastIndexOf("\n",end),normalized.lastIndexOf(". ",end),normalized.lastIndexOf(" ",end));
      if (boundary > cursor + maximumLength / 2) end = boundary + 1;
    }
    chunks.push(normalized.slice(cursor,end).trim());
    if (end >= normalized.length) break;
    cursor = Math.max(end - overlap,cursor + 1);
  }
  return chunks.filter(Boolean);
}
export async function saveKnowledge(projectId: string, title: string, content: string, existingId?: string,
  transaction?: Awaited<ReturnType<typeof pool.connect>>, variants?:string[]) {
  const documentId = existingId ?? randomUUID(), chunks = chunkText(content);
  const connection = transaction ?? await pool.connect();
  try {
    if (!transaction) await connection.query("BEGIN");
    if (existingId) {
      const { rowCount } = await connection.query(`UPDATE sabito_core.knowledge_documents
        SET title=$1,content=$2,updated_at=now() WHERE id=$3 AND project_id=$4`,
        [title,content,documentId,projectId]);
      if (!rowCount) { if (!transaction) await connection.query("ROLLBACK"); return null; }
      await connection.query(`DELETE FROM sabito_core.knowledge_chunks WHERE document_id=$1 AND project_id=$2`,[documentId,projectId]);
    } else {
      await connection.query(`INSERT INTO sabito_core.knowledge_documents(id,project_id,title,content)
        VALUES ($1,$2,$3,$4)`,[documentId,projectId,title,content]);
    }
    for (const [index,chunk] of chunks.entries()) {
      await connection.query(`INSERT INTO sabito_core.knowledge_chunks(id,project_id,document_id,chunk_index,content)
        VALUES ($1,$2,$3,$4,$5)`,[randomUUID(),projectId,documentId,index,chunk]);
    }
    if (variants!==undefined) {
      const distinct=[...new Map(variants.filter(value=>normalizedText(value).length>=2)
        .map(value=>[normalizedText(value),value.trim()])).values()];
      await connection.query(`INSERT INTO sabito_core.knowledge_question_variants (document_id,project_id,variantes_de_question)
        VALUES ($1,$2,$3) ON DUPLICATE KEY UPDATE variantes_de_question=VALUES(variantes_de_question)`,
        [documentId,projectId,JSON.stringify(distinct)]);
    }
    await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
      VALUES ($1,'admin',$2,$3)`,
      [projectId,existingId ? "knowledge.updated" : "knowledge.created",JSON.stringify({documentId,title,chunks:chunks.length})]);
    await touchAssistant(projectId,connection);
    if (!transaction) await connection.query("COMMIT");
    return {documentId,chunks:chunks.length};
  } catch (error) { if (!transaction) await connection.query("ROLLBACK"); throw error; }
  finally { if (!transaction) connection.release(); }
}
export async function searchKnowledge(projectId:string,query:string,limit=5):Promise<KnowledgeMatch[]> {
  return (await rankedQuestions(projectId,query)).matches.slice(0,limit);
}
