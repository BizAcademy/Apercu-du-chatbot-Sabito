import { pool } from "./database";
import { isGreetingSuggestion,selectedFollowUp } from "./knowledge-follow-ups";
import { selectedKnowledgeReply,searchState,type retrieveReply } from "./question-search";
import { normalizeQuestion as normalize } from "./question-normalization";
import { isClosingAcknowledgement } from "./conversation-closing";
import { greetingReply } from "./greeting-reply";
import { recordVariantCandidate } from "./variant-candidates";
import { bcaChoiceIndexes,bcaFallback } from "./bca-dialogue-rules";

type Suggestion = Awaited<ReturnType<typeof retrieveReply>>["suggestions"][number];
const staleAnswer = "Cette question proposée a été modifiée ou supprimée. Posez à nouveau votre question.";

/** Resolve only proposals from the latest completed answer in this member's conversation.
 * Reading the persisted presentation keeps confirmation working across reconnects/restarts.
 * The next answer has no proposals, so a consumed/refused proposal cannot be reused by "oui".
 */
export async function suggestedReply(projectId:string,externalUserId:string,conversationId:string,text:string) {
  const state=await searchState(projectId),bca=state.profile==="bca";
  if((!bca&&isClosingAcknowledgement(text)) || greetingReply(text)) return null;
  if(bca) {
    const active=await pool.query(`SELECT status FROM sabito_core.intent_sessions
      WHERE conversation_id=$1 AND project_id=$2 AND status IN ('collecting','checking')`,[conversationId,projectId]);
    if(active.rows.length)return null;
  }
  const {rows} = await pool.query(`SELECT p.suggestions_json,q.content AS original_question FROM sabito_core.messages m
    JOIN sabito_core.conversations c ON c.id=m.conversation_id
    LEFT JOIN sabito_core.messages q ON q.id=m.reply_to_message_id AND q.project_id=m.project_id
    LEFT JOIN sabito_core.message_presentations p ON p.message_id=m.id
    WHERE c.id=$1 AND c.project_id=$2 AND c.external_user_id=$3
      AND m.role='assistant' AND m.status='completed'
       AND m.created_at>=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 24 HOUR)
    ORDER BY m.created_at DESC,m.id DESC LIMIT 1`,[conversationId,projectId,externalUserId]);
  const raw=rows[0]?.suggestions_json;
  const suggestions:Suggestion[]=(typeof raw==="string"?JSON.parse(raw):raw??[])
    .filter((s:Suggestion)=>!isGreetingSuggestion(s.question));
  if (!suggestions.length) return null;
  if(bca) {
    const indexes=bcaChoiceIndexes(text,suggestions.map(item=>item.question),state.settings.retrieval);
    if(!indexes.length)return null;
    const answers:Awaited<ReturnType<typeof selectedKnowledgeReply>>[]=[];
    for(const index of indexes) {
      const chosen=suggestions[index];
      if("follow_up_id" in chosen&&chosen.follow_up_id) {
        const selected=await selectedFollowUp(projectId,chosen.follow_up_id,chosen.question);
        answers.push(selected?{answer:selected.answer,reliable:true,suggestions:[],closing_message:"",suggestions_label:"",documentId:chosen.document_id}:null);
      } else answers.push(await selectedKnowledgeReply(projectId,chosen.document_id,chosen.question));
    }
    if(answers.some(answer=>!answer))return {answer:bcaFallback,reliable:false,suggestions:[] as Suggestion[],closing_message:"",suggestions_label:""};
    if(answers.length===1)return answers[0];
    return {answer:[...new Set(answers.map(answer=>answer!.answer))].join("\n\n"),reliable:true,
      suggestions:answers.flatMap(answer=>answer!.suggestions).filter((item,index,all)=>
        all.findIndex(other=>other.question===item.question)===index).slice(0,3),closing_message:"",suggestions_label:""};
  }
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
    if(selected){
      await recordVariantCandidate(projectId,chosen.document_id,String(rows[0]?.original_question??""),"selection");
      return selected;
    }
  }
  return {answer,reliable:true,suggestions:[] as Suggestion[],closing_message:""};
}
