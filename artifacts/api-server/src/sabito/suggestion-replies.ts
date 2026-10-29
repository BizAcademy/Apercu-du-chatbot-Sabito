import { pool } from "./database";
import { isGreetingSuggestion,selectedFollowUp } from "./knowledge-follow-ups";
import { selectedKnowledgeReply, type retrieveReply } from "./question-search";
import { normalizeQuestion as normalize } from "./question-normalization";
import { isClosingAcknowledgement } from "./conversation-closing";
import { greetingReply } from "./greeting-reply";

type Suggestion = Awaited<ReturnType<typeof retrieveReply>>["suggestions"][number];
const staleAnswer = "Cette question proposée a été modifiée ou supprimée. Posez à nouveau votre question.";

/** Resolve only proposals from the latest completed answer in this member's conversation.
 * Reading the persisted presentation keeps confirmation working across reconnects/restarts.
 * The next answer has no proposals, so a consumed/refused proposal cannot be reused by "oui".
 */
export async function suggestedReply(projectId:string,externalUserId:string,conversationId:string,text:string) {
  if(isClosingAcknowledgement(text) || greetingReply(text)) return null;
  const {rows} = await pool.query(`SELECT p.suggestions_json FROM sabito_core.messages m
    JOIN sabito_core.conversations c ON c.id=m.conversation_id
    LEFT JOIN sabito_core.message_presentations p ON p.message_id=m.id
    WHERE c.id=$1 AND c.project_id=$2 AND c.external_user_id=$3
      AND m.role='assistant' AND m.status='completed'
    ORDER BY m.created_at DESC,m.id DESC LIMIT 1`,[conversationId,projectId,externalUserId]);
  const raw=rows[0]?.suggestions_json;
  const suggestions:Suggestion[]=(typeof raw==="string"?JSON.parse(raw):raw??[])
    .filter((s:Suggestion)=>!isGreetingSuggestion(s.question));
  if (!suggestions.length) return null;
  const normalized=normalize(text);
  const no=/^(non|non merci|non pas maintenant|pas maintenant|pas encore)$/.test(normalized);
  const yes=/^(oui|oui merci|oui s il vous plait|ouais|yes|d accord|bien sur|tout a fait)$/.test(normalized);
  if (no) return {answer:"D’accord, heureux de vous avoir aidé.",reliable:true,suggestions:[] as Suggestion[],closing_message:""};
  const selection=suggestions.find(s=>normalize(s.question)===normalized);
  if (!yes && !selection) return null;
  if (yes && suggestions.length>1) return {
    answer:"Quelle question souhaitez-vous choisir ? Cliquez sur la question proposée ou écrivez-la.",
    reliable:true,suggestions,closing_message:"",
  };
  const chosen=selection??suggestions[0];
  let answer=staleAnswer;
  if ("follow_up_id" in chosen && typeof chosen.follow_up_id==="string") {
    answer=(await selectedFollowUp(projectId,chosen.follow_up_id,chosen.question))?.answer??staleAnswer;
  } else {
    const selected=await selectedKnowledgeReply(projectId,chosen.document_id,chosen.question);
    if(selected)return selected;
  }
  return {answer,reliable:true,suggestions:[] as Suggestion[],closing_message:""};
}
