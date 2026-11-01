import { pool } from "./database";
import { normalizeQuestion } from "./question-normalization";
import { retrieveReply,searchState } from "./question-search";
import type { AccessClaims } from "./security";

/** Reuse only the immediately preceding approved public answer. Never turn a
 * backend result, an older topic, or another member's history into public help. */
export async function contextualBuzzReply(claims:AccessClaims,conversationId:string,text:string) {
  const question=normalizeQuestion(text).replace(/[?.!]+$/g,"").trim();
  const explain=/^(?:(?:je veux|je voudrais) savoir )?comment (?:ca|cela) (?:fonctionne|marche)$/.test(question)
    || /^(?:explique moi|expliquez moi|peux tu m expliquer)$/.test(question);
  const detail=/^(?:plus de details|donne moi plus de details|pouvez vous donner plus de details|peux tu m en dire plus)$/.test(question);
  if(!explain&&!detail)return null;
  if((await searchState(claims.sub)).profile!=="buzzbooster")return null;
  const previous=await pool.query(`SELECT m.id,m.content FROM sabito_core.messages m
    JOIN sabito_core.conversations c ON c.id=m.conversation_id AND c.project_id=m.project_id
    WHERE m.project_id=$1 AND m.conversation_id=$2 AND c.external_user_id=$3
      AND m.role='assistant' AND m.status='completed'
    ORDER BY m.created_at DESC,m.id DESC LIMIT 1`,
    [claims.sub,conversationId,claims.externalUserId]);
  if(!previous.rows[0])return null;
  let previousContent=String(previous.rows[0].content);
  const footer=previousContent.lastIndexOf("\n\nConcernant votre question précédente « ");
  if(footer>=0) {
    const survey=await pool.query(`SELECT id FROM sabito_core.conversation_feedback
      WHERE project_id=$1 AND conversation_id=$2 AND asked_after_message_id=$3 LIMIT 1`,
      [claims.sub,conversationId,previous.rows[0].id]);
    if(survey.rows[0])previousContent=previousContent.slice(0,footer);
  }
  const documents=await pool.query(`SELECT title,content FROM sabito_core.knowledge_documents
    WHERE project_id=$1 AND status='ready' AND content=$2 LIMIT 1`,
    [claims.sub,previousContent]);
  const document=documents.rows[0];
  if(!document||document.content!==previousContent)return null;
  const reply=await retrieveReply(claims.sub,String(document.title));
  if(!reply.reliable||reply.answer!==document.content)return null;
  return detail&&reply.suggestions.length
    ? {...reply,answer:"Quel point souhaitez-vous approfondir ? Choisissez une question ci-dessous."}
    : reply;
}
