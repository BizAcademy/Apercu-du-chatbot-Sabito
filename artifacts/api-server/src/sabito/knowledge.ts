import { randomUUID } from "node:crypto";
import { pool } from "./database";

export type KnowledgeMatch = {title: string; content: string};
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
export async function saveKnowledge(projectId: string, title: string, content: string, existingId?: string) {
  const documentId = existingId ?? randomUUID(), chunks = chunkText(content);
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    if (existingId) {
      const { rowCount } = await connection.query(`UPDATE sabito_core.knowledge_documents
        SET title=$1,content=$2,updated_at=now() WHERE id=$3 AND project_id=$4`,
        [title,content,documentId,projectId]);
      if (!rowCount) { await connection.query("ROLLBACK"); return null; }
      await connection.query(`DELETE FROM sabito_core.knowledge_chunks WHERE document_id=$1 AND project_id=$2`,[documentId,projectId]);
    } else {
      await connection.query(`INSERT INTO sabito_core.knowledge_documents(id,project_id,title,content)
        VALUES ($1,$2,$3,$4)`,[documentId,projectId,title,content]);
    }
    for (const [index,chunk] of chunks.entries()) {
      await connection.query(`INSERT INTO sabito_core.knowledge_chunks(id,project_id,document_id,chunk_index,content)
        VALUES ($1,$2,$3,$4,$5)`,[randomUUID(),projectId,documentId,index,chunk]);
    }
    await connection.query(`INSERT INTO sabito_core.audit_logs(project_id,actor_type,action,metadata)
      VALUES ($1,'admin',$2,$3)`,
      [projectId,existingId ? "knowledge.updated" : "knowledge.created",JSON.stringify({documentId,title,chunks:chunks.length})]);
    await connection.query("COMMIT");
    return {documentId,chunks:chunks.length};
  } catch (error) { await connection.query("ROLLBACK"); throw error; }
  finally { connection.release(); }
}
export async function searchKnowledge(projectId: string, query: string, limit = 5): Promise<KnowledgeMatch[]> {
  const { rows } = await pool.query(`SELECT kc.content,kd.title,
    ts_rank(to_tsvector('simple',kc.content),websearch_to_tsquery('simple',$1)) AS relevance
    FROM sabito_core.knowledge_chunks kc
    JOIN sabito_core.knowledge_documents kd ON kd.id=kc.document_id AND kd.project_id=kc.project_id
    WHERE kc.project_id=$2 AND kd.status='ready'
      AND to_tsvector('simple',kc.content) @@ websearch_to_tsquery('simple',$1)
    ORDER BY relevance DESC LIMIT $3`,[query,projectId,limit]);
  if (rows.length) return rows;
  const keywords = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [])].slice(0,8);
  if (!keywords.length) return [];
  const result = await pool.query(`SELECT kc.content,kd.title FROM sabito_core.knowledge_chunks kc
    JOIN sabito_core.knowledge_documents kd ON kd.id=kc.document_id AND kd.project_id=kc.project_id
    WHERE kc.project_id=$1 AND kd.status='ready' AND
      (${keywords.map((_,index) => `LOWER(kc.content) LIKE $${index+2}`).join(" OR ")})
    ORDER BY kc.created_at DESC LIMIT $${keywords.length+2}`,
    [projectId,...keywords.map(word => `%${word}%`),limit]);
  return result.rows;
}
