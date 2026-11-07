import { bcaConversationHelp } from "./bca-conversation-help";
import { bcaNovemberRoute } from "./bca-november-questions";
import { bcaCurrentTurn } from "./bca-current-questions";
import { createHash } from "node:crypto";
import { z } from "zod";
import { pool } from "./database";
import { searchState,retrieveReply,selectedKnowledgeReply } from "./question-search";
import { bcaGuides } from "./bca-guide-data";
import { bcaDialogueDrafts,bcaFallback,bcaWarmClosing,bcaTestPrompt,bcaScenario,bcaPositiveEmotion,bcaQuestionParts } from "./bca-dialogue-rules";
import type { AccessClaims } from "./security";
import { normalizeQuestion } from "./question-normalization";
import { bcaSocialAnswer } from "./bca-session";

type Reply={answer:string;reliable:boolean;documentId?:string;
  suggestions:{document_id:string;question:string;follow_up_id?:string}[];
  closing_message:string;suggestions_label:string};
/** Use only existing approved questions; never invent filler buttons. */
export function bcaRelatedReply(state:Pick<Awaited<ReturnType<typeof searchState>>,"entries"|"settings">,answer:Reply):Reply {
  if(!answer.reliable||answer.suggestions.length>=2)return answer;
  const source=state.entries.find(entry=>entry.exactPriority===3&&entry.content===answer.answer);
  const subject=source&&bcaQuestionParts(source.title,state.settings.retrieval).subject;
  if(!source||!subject)return answer;
  const suggestions=[...answer.suggestions,...state.entries.filter(entry=>entry.exactPriority===3&&
    entry.documentId!==source.documentId&&bcaQuestionParts(entry.title,state.settings.retrieval).subject===subject)
    .map(entry=>({document_id:entry.documentId,question:entry.question}))]
    .filter((item,index,all)=>all.findIndex(other=>other.question===item.question)===index).slice(0,3);
  return {...answer,suggestions};
}
const schema=z.object({
  kind:z.literal("bca-dialogue"),
  subject:z.enum(["digital-store","ads","referral","formations","income","deposit","withdrawal","account"]).optional(),
  request:z.enum(["how","why","where","check"]).optional(),
  entities:z.record(z.string(),z.string().max(100)).default({}),
  document:z.object({id:z.string().uuid(),question:z.string().max(2000)}).optional(),
  choices:z.array(z.object({document_id:z.string(),question:z.string().max(2000),follow_up_id:z.string().optional()})).max(3).default([]),
  awaiting:z.literal("test").optional(),private:z.boolean().default(false),
});
type Context=z.infer<typeof schema>;
const empty=():Context=>({kind:"bca-dialogue",entities:{},choices:[],private:false});
const reply=(answer:string,reliable=true):Reply=>({answer,reliable,documentId:undefined,suggestions:[],suggestions_label:"",closing_message:""});
async function context(claims:AccessClaims,conversationId:string) {
  const found=await pool.query(`SELECT g.context_json,s.status FROM sabito_core.conversations c
    LEFT JOIN sabito_core.public_guidance_context g ON g.conversation_id=c.id AND g.project_id=c.project_id
      AND g.updated_at>=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 24 HOUR)
    LEFT JOIN sabito_core.intent_sessions s ON s.conversation_id=c.id AND s.project_id=c.project_id
    WHERE c.id=$1 AND c.project_id=$2 AND c.external_user_id=$3`,
    [conversationId,claims.sub,claims.externalUserId]);
  const row=found.rows[0];
  if(!row)return {owned:false,blocked:true,value:undefined};
  let value:Context|undefined;
  try {value=schema.parse(JSON.parse(String(row.context_json)));}catch{/* Expired or unrelated context is not evidence. */}
  return {owned:true,blocked:["collecting","checking"].includes(String(row.status)),value};
}
export async function bcaDialogueReply(claims:AccessClaims,conversationId:string,text:string):Promise<Reply|null> {
  const state=await searchState(claims.sub);
  if(state.profile!=="bca")return null;
  const current=await context(claims,conversationId);
  if(!current.owned||current.blocked)return null;
  // Explicit owner rules/public course choices precede fuzzy suggestions and
  // satisfaction collection. The helper preserves edited admin references.
  const ownerRoute=bcaNovemberRoute(text);
  if(ownerRoute?.answer||ownerRoute?.key.startsWith("current-")||bcaCurrentTurn(text)||normalizeQuestion(text)==="comment y acceder") {
    const owner=await bcaConversationHelp(claims,conversationId,text);
    if(owner)return owner;
  }
  const social=bcaSocialAnswer(text);
  if(social)return reply(social);
  if(bcaPositiveEmotion(text))return reply(bcaWarmClosing);
  const parts=bcaQuestionParts(text,state.settings.retrieval),q=parts.normalized,prior=current.value;
  const approved=async(key:string)=>{
    const item=bcaDialogueDrafts.find(item=>item.key===key);
    const entry=state.entries.find(entry=>entry.exactPriority===3&&entry.title===item?.title);
    if(entry) {
      const answer=await selectedKnowledgeReply(claims.sub,entry.documentId,entry.question);
      return answer?bcaRelatedReply(state,answer):reply(bcaFallback,false);
    }
    const exact=state.entries.filter(entry=>entry.canonical===normalizeQuestion(text));
    if(exact.length&&new Set(exact.map(entry=>entry.content)).size===1)return retrieveReply(claims.sub,text);
    return reply(bcaFallback,false);
  };
  if(prior?.awaiting==="test") {
    if(/^(?:oui|oui campagne test|test|campagne test|1)$/.test(q))return approved("test-days");
    if(/^(?:non|non payante|payante|campagne payante|2)$/.test(q))return approved("paid-days");
    if(/^(?:ok|d accord|vas y|tous|les deux)$/.test(q)) {
      const result=reply("S’agit-il d’une campagne test ? Choisissez Oui ou Non pour suivre le bon parcours.");
      result.suggestions=[{document_id:conversationId,question:"Oui"},{document_id:conversationId,question:"Non"}];
      return result;
    }
  }
  const scenario=bcaScenario(text,state.settings.retrieval);
  if(scenario==="third-day") {
    const result=reply(bcaTestPrompt);
    result.suggestions=[{document_id:conversationId,question:"Oui"},{document_id:conversationId,question:"Non"}];
    return result;
  }
  if(scenario==="rejected-training"||scenario==="account-link"||scenario==="wrong-commission")return approved(scenario);
  if(scenario==="income") {
    const entries=["member-bca-overview","member-income"].map(key=>{
      const title=bcaGuides.find(guide=>guide.key===key)?.title;
      return state.entries.find(entry=>entry.exactPriority===3&&entry.title===title);
    });
    if(entries.some(entry=>!entry))return reply(bcaFallback,false);
    const answers=await Promise.all(entries.map(entry=>selectedKnowledgeReply(claims.sub,entry!.documentId,entry!.question)));
    if(answers.some(answer=>!answer))return reply(bcaFallback,false);
    const result=reply([...new Set(answers.map(answer=>answer!.answer))].join("\n\n"));
    result.suggestions=answers.flatMap(answer=>answer!.suggestions).filter((item,index,all)=>
      all.findIndex(other=>other.question===item.question)===index).slice(0,3);
    return result;
  }
  if(prior&&!prior.private&&!prior.awaiting) {
    if(/^(?:pourquoi|comment|et apres|et ensuite|apres|la suite|et pourquoi|et comment)$/.test(q)&&prior.document)
      return selectedKnowledgeReply(claims.sub,prior.document.id,prior.document.question);
    // Complement an explicitly named subject with an existing public guide;
    // a "check" request must stay in the authorized backend flow.
    if(parts.subject&&parts.subject!=="account"&&prior.request&&prior.request!=="check"&&
      q.split(" ").length<=6&&!parts.request&&!/\d/.test(q)&&
      (/^et pour\b/.test(q)||q.split(" ").length<=3&&!/\b(?:oui|non|option|ou)\b/.test(q))) {
      const key=({"digital-store":"23",ads:"27",referral:"18",formations:"20",income:"member-income",
        deposit:"10",withdrawal:"13",account:"05"} as const)[parts.subject];
      const title=bcaGuides.find(guide=>guide.key===key)?.title;
      const entry=state.entries.find(entry=>entry.exactPriority===3&&entry.title===title);
      if(entry)return selectedKnowledgeReply(claims.sub,entry.documentId,entry.question);
    }
  }
  return null;
}
export async function bcaDialogueSuggestions(projectId:string,answer:string) {
  if(!answer.startsWith("Parlez-vous de la campagne test, de la publication/vérification"))return null;
  const state=await searchState(projectId);
  return ["28","30","support-publish"].flatMap(key=>{
    const title=bcaGuides.find(guide=>guide.key===key)?.title;
    const entry=state.entries.find(entry=>entry.exactPriority===3&&entry.title===title);
    return entry?[{document_id:entry.documentId,question:entry.question}]:[];
  });
}
export async function saveBcaDialogue(claims:AccessClaims,conversationId:string,text:string,value:{
  answer:string;reliable:boolean;suggestions:{document_id:string;question:string;follow_up_id?:string}[];
},privateAnswer:boolean) {
  const state=await searchState(claims.sub);
  if(state.profile!=="bca")return;
  const old=await context(claims,conversationId);
  if(!old.owned)return;
  const parts=bcaQuestionParts(text,state.settings.retrieval);
  const sameSubject=!parts.subject||parts.subject===old.value?.subject;
  const next:Context={...empty(),subject:parts.subject??old.value?.subject,
    request:parts.request??(sameSubject?old.value?.request:undefined),
    entities:sameSubject?{...old.value?.entities}:{},private:privateAnswer};
  // Names are descriptive context only. They never become member identities or
  // backend lookup fields, and secret-looking phrases are not extracted.
  for(const match of text.matchAll(/\b(formation|campagne|compte)\s+[«"“]([^»"”\n]{1,100})[»"”]/giu))
    next.entities[match[1].toLowerCase()]=match[2];
  if(!privateAnswer&&value.reliable) {
    const entry=state.entries.find(entry=>entry.exactPriority===3&&entry.content===value.answer);
    next.document=entry?{id:entry.documentId,question:entry.question}:undefined;
    if(!entry&&sameSubject&&/^(?:pourquoi|comment|et apres|et ensuite|merci|super|genial)$/.test(parts.normalized))
      next.document=old.value?.document;
    next.choices=value.suggestions.slice(0,3);
    if(value.answer.startsWith(bcaTestPrompt))next.awaiting="test";
  }
  await pool.query(`INSERT INTO sabito_core.public_guidance_context(conversation_id,project_id,context_json,answer_hash)
    VALUES($1,$2,$3,$4) ON DUPLICATE KEY UPDATE context_json=VALUES(context_json),answer_hash=VALUES(answer_hash),updated_at=CURRENT_TIMESTAMP(6)`,
    [conversationId,claims.sub,JSON.stringify(next),createHash("sha256").update(value.answer).digest("hex")]);
}
