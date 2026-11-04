import { pool } from "./database";
import { normalizeQuestion } from "./question-normalization";
import { retrieveReply,searchState } from "./question-search";
import type { AccessClaims } from "./security";
import { corpusClarificationKey } from "./conversation-input";
import { buzzCorpus } from "./buzzbooster-corpus";

/** Read a clarification from the SAME approved index. Pending proposals never
 * supply a public answer. Existing field collectors always have precedence. */
export async function approvedCorpusClarification(claims:AccessClaims,conversationId:string,text:string,early=false) {
  const key=corpusClarificationKey(text,early);
  if(!key)return null;
  const state=await searchState(claims.sub);
  if(state.profile!=="buzzbooster")return null;
  const owner=await pool.query(`SELECT s.status FROM sabito_core.conversations c
    LEFT JOIN sabito_core.intent_sessions s ON s.conversation_id=c.id AND s.project_id=c.project_id
    WHERE c.id=$1 AND c.project_id=$2 AND c.external_user_id=$3`,
    [conversationId,claims.sub,claims.externalUserId]);
  if(!owner.rows.length||["collecting","checking"].includes(String(owner.rows[0].status)))return null;
  const topic=buzzCorpus.find(item=>item.key===key)!;
  const entry=state.entries.find(item=>item.title===topic.title);
  return {answer:entry?entry.content.split("\n")[0]:state.settings.no_answer_message,
    reliable:!!entry,documentId:entry?.documentId,suggestions:[],suggestions_label:"",closing_message:""};
}

/** Reuse only the immediately preceding approved public answer. Never turn a
 * backend result, an older topic, or another member's history into public help. */
export async function contextualBuzzReply(claims:AccessClaims,conversationId:string,text:string) {
  const question=normalizeQuestion(text).replace(/[?.!]+$/g,"").trim();
  const explain=/^(?:(?:je veux|je voudrais) savoir )?comment (?:ca|cela) (?:fonctionne|marche)$/.test(question)
    || /^(?:explique moi|expliquez moi|peux tu m expliquer|pourquoi|comment faire alors)$/.test(question);
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
