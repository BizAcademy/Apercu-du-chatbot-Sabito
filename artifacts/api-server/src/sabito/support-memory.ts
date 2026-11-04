import { createHash,randomUUID } from "node:crypto";
import { pool } from "./database";
import { normalizeQuestion } from "./unanswered";
import { greetingReply } from "./greeting-reply";
import { isClosingAcknowledgement } from "./conversation-closing";
import { opaqueConversationInput } from "./conversation-input";
import { recordVariantCandidate } from "./variant-candidates";

export function substantialQuestion(text:string) {
  const q=normalizeQuestion(text);
  return !opaqueConversationInput(text)&&!greetingReply(text)&&!isClosingAcknowledgement(text)&&q.split(" ").length>=2&&
    !/^(oui|non|ok|suite|page suivante|reverifie celle ci|aidez moi a nouveau|aide moi a nouveau)$/.test(q)&&
    !/^(et |celle |maintenant |voici |le bon numero|mon otp|mon code|code otp)/.test(q)&&
    !/^[\d\s]+$/.test(q);
}
const short=(text:string)=>text.replace(/\s+/g," ").slice(0,170);
const positive=/^(oui|oui merci|oui ca m a aide|oui c est resolu|je suis satisfait|c est resolu|probleme resolu|satisfait|parfait|tout est bon)$/;
const negative=/^(non|non merci|pas encore|non pas encore|pas satisfait|je ne suis pas satisfait|non ca ne marche pas|ca ne marche pas|non toujours pas)$/;
const retry=/^(oui|oui merci|aidez moi a nouveau|aide moi a nouveau|recommence|reprenons|oui aidez moi a nouveau|je veux de l aide)$/;
type Turn={answer?:string;query?:string;fallbackQuestion?:string;feedbackOnly?:boolean};
export async function supportMemoryTurn(projectId:string,conversationId:string,text:string,assistantId:string):Promise<Turn> {
  const result=await pool.query(`SELECT f.*,m.content AS question FROM sabito_core.conversation_feedback f
    JOIN sabito_core.messages m ON m.id=f.question_message_id
    WHERE f.project_id=$1 AND f.conversation_id=$2 AND (f.status='asked' OR f.help_pending=TRUE)
    ORDER BY f.asked_at DESC,f.id DESC LIMIT 1`,[projectId,conversationId]);
  const row=result.rows[0];
  if(!row)return {};
  const last=await pool.query(`SELECT id FROM sabito_core.messages WHERE conversation_id=$1 AND role='assistant'
    AND status='completed' ORDER BY created_at DESC,id DESC LIMIT 1`,[conversationId]);
  if(last.rows[0]?.id!==row.asked_after_message_id)return {};
  const q=normalizeQuestion(text);
  if(row.status==="asked"&&(positive.test(q)||negative.test(q))) {
    const good=positive.test(q);
    const changed=await pool.query(`UPDATE sabito_core.conversation_feedback SET status=$1,help_pending=$2,
      answered_at=CURRENT_TIMESTAMP(6),asked_after_message_id=$3 WHERE id=$4 AND project_id=$5 AND status='asked'`,
      [good?"satisfied":"unsatisfied",!good,assistantId,row.id,projectId]);
    if(!changed.rowCount)return {};
    if(good&&row.answer_message_id) {
      const linked=await pool.query("SELECT document_id FROM sabito_core.knowledge_answer_links WHERE message_id=$1 AND project_id=$2",
        [row.answer_message_id,projectId]);
      if(linked.rows[0])await recordVariantCandidate(projectId,String(linked.rows[0].document_id),String(row.question),"positive_feedback");
    }
    return {feedbackOnly:true,answer:good?"Excellent ! Heureux d’avoir pu vous aider.":
      `D’accord. À quel niveau avez-vous besoin d’aide pour votre question « ${short(row.question)} » ? Précisez ce qui bloque, ou dites « aidez-moi à nouveau » pour que nous reprenions ensemble.`};
  }
  if(row.help_pending) {
    await pool.query("UPDATE sabito_core.conversation_feedback SET help_pending=FALSE WHERE id=$1 AND project_id=$2",[row.id,projectId]);
    if(retry.test(q))return {query:row.question};
    if(/^(non|non merci|pas maintenant)$/.test(q))return {feedbackOnly:true,answer:"D’accord, je reste disponible si vous souhaitez reprendre cette question."};
    // A precise new subject must never be replaced with the old one.
    if(/^(je bloque|je n arrive|ca bloque|c est l etape|a l etape|le probleme|toujours|encore)/.test(q))
      return {fallbackQuestion:row.question};
  }
  if(row.status==="asked")await pool.query(`UPDATE sabito_core.conversation_feedback SET status='declined'
    WHERE id=$1 AND project_id=$2 AND status='asked'`,[row.id,projectId]);
  return {};
}
export async function trackSupportQuestion(projectId:string,conversationId:string,messageId:string,text:string) {
  if(!substantialQuestion(text))return false;
  await pool.query(`INSERT IGNORE INTO sabito_core.conversation_feedback(id,project_id,conversation_id,question_message_id,question_hash)
    VALUES($1,$2,$3,$4,$5)`,[randomUUID(),projectId,conversationId,messageId,
    createHash("sha256").update(normalizeQuestion(text)).digest("hex")]);
  return true;
}
export async function appendPreviousSatisfaction(projectId:string,conversationId:string,userId:string,assistantId:string,answer:string) {
  const state=await pool.query("SELECT status FROM sabito_core.intent_sessions WHERE conversation_id=$1 AND project_id=$2",[conversationId,projectId]);
  const eligible=!state.rows[0]||state.rows[0].status==="complete";
  await pool.query(`UPDATE sabito_core.conversation_feedback SET answer_message_id=$1,eligible=$2
    WHERE question_message_id=$3 AND project_id=$4`,[assistantId,eligible,userId,projectId]);
  if(!eligible)return answer;
  const connection=await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query("SELECT id FROM sabito_core.conversations WHERE id=$1 AND project_id=$2 FOR UPDATE",[conversationId,projectId]);
    const previous=await connection.query(`SELECT f.id,m.content AS question FROM sabito_core.conversation_feedback f
      JOIN sabito_core.messages m ON m.id=f.question_message_id
      WHERE f.project_id=$1 AND f.conversation_id=$2 AND f.status='pending' AND f.eligible=TRUE
      AND f.question_message_id<>$3
      AND f.question_hash<>(SELECT question_hash FROM sabito_core.conversation_feedback WHERE question_message_id=$3)
      ORDER BY f.created_at DESC,f.id DESC LIMIT 1 FOR UPDATE`,[projectId,conversationId,userId]);
    if(previous.rows[0]) {
      const row=previous.rows[0];
      await connection.query(`UPDATE sabito_core.conversation_feedback SET status='asked',asked_at=CURRENT_TIMESTAMP(6),
        asked_after_message_id=$1 WHERE id=$2`,[assistantId,row.id]);
      answer+=`\n\nConcernant votre question précédente « ${short(row.question)} », cette réponse vous a-t-elle aidé ou avez-vous pu résoudre le problème ? Répondez par oui ou non.`;
    }
    await connection.query("COMMIT");
    return answer;
  } catch(error){await connection.query("ROLLBACK");throw error;}
  finally{connection.release();}
}
