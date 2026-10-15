import { randomUUID } from "node:crypto";
import { pool, databaseDialect } from "./database";
import { normalizedText, semanticSimilarity } from "./semantic";

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
    if (!transaction) await connection.query("COMMIT");
    return {documentId,chunks:chunks.length};
  } catch (error) { if (!transaction) await connection.query("ROLLBACK"); throw error; }
  finally { if (!transaction) connection.release(); }
}
async function lexicalSearch(projectId: string, query: string, limit = 5): Promise<KnowledgeMatch[]> {
  const { rows } = databaseDialect === "mysql"
    ? await pool.query(`SELECT kc.content,kd.title,kc.document_id,
      MATCH(kc.content) AGAINST($1 IN NATURAL LANGUAGE MODE) AS relevance
      FROM sabito_core.knowledge_chunks kc
      JOIN sabito_core.knowledge_documents kd ON kd.id=kc.document_id AND kd.project_id=kc.project_id
      WHERE kc.project_id=$2 AND kd.status='ready'
        AND MATCH(kc.content) AGAINST($1 IN NATURAL LANGUAGE MODE)>0
      ORDER BY relevance DESC LIMIT $3`,[query,projectId,limit])
    : await pool.query(`SELECT kc.content,kd.title,kc.document_id,
    ts_rank(to_tsvector('simple',kc.content),websearch_to_tsquery('simple',$1)) AS relevance
    FROM sabito_core.knowledge_chunks kc
    JOIN sabito_core.knowledge_documents kd ON kd.id=kc.document_id AND kd.project_id=kc.project_id
    WHERE kc.project_id=$2 AND kd.status='ready'
      AND to_tsvector('simple',kc.content) @@ websearch_to_tsquery('simple',$1)
    ORDER BY relevance DESC LIMIT $3`,[query,projectId,limit]);
  if (rows.length) return rows.map(row => ({title:String(row.title),content:String(row.content),documentId:String(row.document_id)}));
  const keywords = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [])].slice(0,8);
  if (!keywords.length) return [];
  const result = await pool.query(`SELECT kc.content,kd.title,kc.document_id FROM sabito_core.knowledge_chunks kc
    JOIN sabito_core.knowledge_documents kd ON kd.id=kc.document_id AND kd.project_id=kc.project_id
    WHERE kc.project_id=$1 AND kd.status='ready' AND
      (${keywords.map((_,index) => `LOWER(kc.content) LIKE $${index+2}`).join(" OR ")})
    ORDER BY kc.created_at DESC LIMIT $${keywords.length+2}`,
    [projectId,...keywords.map(word => `%${word}%`),limit]);
  return result.rows.map(row => ({title:String(row.title),content:String(row.content),documentId:String(row.document_id)}));
}

export async function searchKnowledge(projectId:string,query:string,limit=5):Promise<KnowledgeMatch[]> {
  if(normalizedText(query).length<2) return [];
  const headers=await pool.query(`SELECT kd.id,kd.title,q.variantes_de_question
    FROM sabito_core.knowledge_documents kd
    LEFT JOIN sabito_core.knowledge_question_variants q ON q.document_id=kd.id AND q.project_id=kd.project_id
    WHERE kd.project_id=$1 AND kd.status='ready'`,[projectId]);
  const ranked=headers.rows.map(row=>{
    const variants:string[]=JSON.parse(String(row.variantes_de_question??"[]"));
    // A generic heading is useful for suggestions, not sufficient evidence of
    // an exact answer. Approved question variants carry the stronger signal.
    const title=String(row.title);
    const titleScore=normalizedText(title)===normalizedText(query) ? 1 : Math.min(0.7,semanticSimilarity(query,title));
    const questions=variants.map(label=>({label,score:normalizedText(label)===normalizedText(query) ? 1 : semanticSimilarity(query,label)}))
      .sort((a,b)=>b.score-a.score);
    const similarity=Math.max(titleScore,questions[0]?.score??0);
    return {id:String(row.id),title,question:questions[0]?.label??title,similarity};
  }).filter(item=>item.similarity>0).sort((a,b)=>b.similarity-a.similarity || a.id.localeCompare(b.id)).slice(0,limit);
  const matches:KnowledgeMatch[]=[];
  if(ranked.length) {
    const documents=await pool.query(`SELECT id,title,LEFT(content,20000) AS content,CHAR_LENGTH(content) AS full_length
      FROM sabito_core.knowledge_documents WHERE project_id=$1 AND status='ready'
      AND id IN (${ranked.map((_,index)=>`$${index+2}`).join(",")})`,[projectId,...ranked.map(item=>item.id)]);
    for(const item of ranked) {
      const row=documents.rows.find(doc=>doc.id===item.id);
      if(row) matches.push({documentId:item.id,title:item.title,question:item.question,content:String(row.content),similarity:item.similarity,
        directAnswer:item.similarity>=0.85 && Number(row.full_length)<=20000});
    }
  }
  const lexical=await lexicalSearch(projectId,query,limit);
  const combined=[...matches,...lexical.filter(row=>!matches.some(match=>match.documentId===row.documentId))];
  const priority=(row:KnowledgeMatch)=>(row.directAnswer?2:0)+Math.max(row.similarity??0,semanticSimilarity(query,row.content));
  return combined.sort((a,b)=>priority(b)-priority(a)).slice(0,limit);
}
