// Deterministic retrieval only. No model, inference service or generated answer.
import { pool } from "./database";
import { followUpSuggestions,isGreetingSuggestion,type FollowUp } from "./knowledge-follow-ups";
import { readAssistantSettings,onAssistantChange,type AssistantSettings } from "./assistant-settings";
import { normalizeQuestion as normalized } from "./question-normalization";
import { conversationClosing, isClosingAcknowledgement } from "./conversation-closing";
export function normalizeTokens(text:string) {
  const stop=new Set("le la les un une des du de d l au aux et ou je tu il elle nous vous ils elles mon ma mes ton ta tes son sa ses notre votre leur a est sont ce cet cette ces c comment quel quelle quels quelles que qui pour dans sur avec en me m moi puis peux souhaiter souhaite voudrais svp merci".split(" "));
  return (text.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().match(/[\p{L}\p{N}]+/gu)??[])
    .filter(t=>!stop.has(t)).map(t=>t.length>4&&t.endsWith("s")?t.slice(0,-1):t);
}
function grams(s:string) {const value=` ${s} `;return new Set(Array.from({length:Math.max(0,value.length-2)},(_,i)=>value.slice(i,i+3)));}
function dice(a:Set<string>,b:Set<string>) {let n=0;for(const g of a) if(b.has(g)) n++;return a.size+b.size ? 2*n/(a.size+b.size):0;}
function tokenizer(settings:AssistantSettings) {
  const phrases=settings.synonyms.flatMap((group,i)=>group.map(word=>({word:normalized(word),replacement:`syn${i}`})))
    .sort((a,b)=>b.word.length-a.word.length);
  const singles=new Map<string,string>();
  for(const phrase of phrases) {
    const tokens=normalizeTokens(phrase.word);if(tokens.length===1)singles.set(tokens[0],phrase.replacement);
  }
  return (text:string)=>{
    let value=` ${normalized(text)} `;
    for(const phrase of phrases) if(phrase.word.includes(" "))
      value=value.replaceAll(` ${phrase.word} `,` ${phrase.replacement} `);
    return normalizeTokens(value).map(t=>singles.get(t)??t);
  };
}
// Only configured phrases/synonyms can trigger containment. Whole tokens avoid
// matching "recharge" inside "rechargement"; surrounding prose is not penalized.
export function containedTriggerLength(query:string,trigger:string,settings:AssistantSettings):number {
  const tokenize=tokenizer(settings),queryTokens=tokenize(query),triggerTokens=tokenize(trigger);
  if(!triggerTokens.length)return 0;
  return queryTokens.some((_,start)=>triggerTokens.every((token,i)=>queryTokens[start+i]===token))
    ? triggerTokens.length : 0;
}
export function detectIntent(text:string,settings:AssistantSettings):string|undefined {
  const candidates=settings.intents.filter(i=>i.enabled).map(i=>({
    id:i.id,
    contained:Math.max(0,...i.triggers.map(t=>containedTriggerLength(text,t,settings))),
    score:Math.max(0,...i.triggers.map(t=>scoreQuestion(text,t,settings))),
  }));
  const exact=candidates.filter(i=>i.contained>0).sort((a,b)=>b.contained-a.contained);
  // Prefer the most specific configured phrase, but never guess between ties.
  if(exact.length)return !exact[1]||exact[0].contained>exact[1].contained ? exact[0].id : undefined;
  const fuzzy=candidates.filter(i=>i.score>=settings.confidence_threshold).sort((a,b)=>b.score-a.score);
  return fuzzy[0]&&(!fuzzy[1]||fuzzy[0].score-fuzzy[1].score>=0.06)?fuzzy[0].id:undefined;
}
const edits=new Map<string,number>();
function tokenSimilarity(a:string,b:string):number {
  if(a===b)return 1;
  if(a.startsWith("syn")||b.startsWith("syn")||/\d/.test(a+b)||Math.min(a.length,b.length)<4||Math.abs(a.length-b.length)>2)return 0;
  const key=`${a}:${b}`;if(edits.has(key))return edits.get(key)!;
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++) {
    const next=[i];for(let j=1;j<=b.length;j++)next.push(Math.min(next[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1)));
    previous=next;
  }
  const value=previous[b.length]<=2 ? Math.max(0,1-previous[b.length]/Math.max(a.length,b.length)):0;
  if(edits.size>20000)edits.clear();edits.set(key,value);return value;
}
type Entry={documentId:string;title:string;content:string;question:string;tokens:string[];canonical:string;grams:Set<string>;followUps:FollowUp[];exactPriority:number};
type State={settings:AssistantSettings;revision:number;entries:Entry[];df:Map<string,number>;average:number;checked:number};
const cache=new Map<string,State>(),loading=new Map<string,Promise<State>>(),generations=new Map<string,number>();
onAssistantChange(id=>{cache.delete(id);loading.delete(id);generations.set(id,(generations.get(id)??0)+1);});
export async function searchState(projectId:string):Promise<State> {
  const previous=cache.get(projectId);
  if(previous && Date.now()-previous.checked<1000) return previous;
  if(loading.has(projectId)) return loading.get(projectId)!;
  const generation=generations.get(projectId)??0;
  const task=(async()=>{
    const data=await readAssistantSettings(projectId);
    if(previous && previous.revision===data.revision) {previous.checked=Date.now();return previous;}
    const tokenize=tokenizer(data.settings);
    const rows=await pool.query(`SELECT d.id,d.title,d.content,v.variantes_de_question,f.questions_json FROM sabito_core.knowledge_documents d
      LEFT JOIN sabito_core.knowledge_question_variants v ON v.document_id=d.id AND v.project_id=d.project_id
      LEFT JOIN sabito_core.knowledge_follow_ups f ON f.document_id=d.id AND f.project_id=d.project_id
      WHERE d.project_id=$1 AND d.status='ready' ORDER BY d.id`,[projectId]);
    const entries:Entry[]=[];let bytes=0;
    for(const row of rows.rows) {
      bytes+=Buffer.byteLength(String(row.content));if(bytes>32*1024*1024) throw new Error("KNOWLEDGE_INDEX_TOO_LARGE");
      const followUps:FollowUp[]=JSON.parse(String(row.questions_json??"[]"));
      const questions=[
        {question:String(row.title),content:String(row.content),exactPriority:3,followUps},
        ...(JSON.parse(String(row.variantes_de_question??"[]")) as string[])
          .map(question=>({question,content:String(row.content),exactPriority:2,followUps})),
        ...followUps.map(item=>({question:item.question,content:item.answer,exactPriority:1,followUps:[] as FollowUp[]})),
      ];
      for(const {question,content,exactPriority,followUps:nextQuestions} of questions) {
        const tokens=tokenize(question);
        entries.push({documentId:String(row.id),title:String(row.title),content,question,exactPriority,
          followUps:nextQuestions,
          tokens,canonical:normalized(question),grams:grams(tokens.join(" "))});
      }
    }
    const df=new Map<string,number>();
    for(const e of entries) for(const token of new Set(e.tokens)) df.set(token,(df.get(token)??0)+1);
    const state={...data,entries,df,average:entries.reduce((a,e)=>a+e.tokens.length,0)/Math.max(entries.length,1),checked:Date.now()};
    if((generations.get(projectId)??0)===generation) {
      if(cache.size>=32) cache.delete(cache.keys().next().value!);
      cache.set(projectId,state);
    }
    return state;
  })();
  loading.set(projectId,task);
  try{return await task;}finally{if(loading.get(projectId)===task)loading.delete(projectId);}
}
export function scoreQuestion(query:string,question:string,settings:AssistantSettings):number {
  if(normalized(query)===normalized(question) && normalized(query).length>1) return 1;
  const tokenize=tokenizer(settings),a=tokenize(query),b=tokenize(question);
  if(!a.length||!b.length) return 0;
  const overlap=a.reduce((sum,t)=>sum+Math.max(0,...b.map(other=>tokenSimilarity(t,other))),0)/Math.max(a.length,b.length);
  return Math.min(0.99,0.65*overlap+0.35*dice(grams(a.join(" ")),grams(b.join(" "))));
}
export type RankedQuestion={documentId:string;title:string;content:string;question:string;similarity:number;directAnswer:boolean;followUps:FollowUp[];exactPriority:number};
export async function rankedQuestions(projectId:string,query:string):Promise<{settings:AssistantSettings;matches:RankedQuestion[]}> {
  const state=await searchState(projectId),settings=state.settings;
  const tokens=tokenizer(settings)(query).slice(0,100),canonical=normalized(query);
  if(!tokens.length && normalized(query).length<2)return {settings,matches:[]};
  const qgrams=grams(tokens.join(" ")),unique=[...new Set(tokens)],n=state.entries.length;
  const idf=(word:string)=>Math.log(1+(n-(state.df.get(word)??0)+0.5)/((state.df.get(word)??0)+0.5));
  const maxBm=unique.reduce((sum,t)=>sum+idf(t)*2.2,0);
  const best=new Map<string,RankedQuestion>();
  for(const e of state.entries) {
    const exact=e.canonical===canonical;
    let bm=0;
    for(const term of unique) {
      const tf=e.tokens.filter(t=>t===term).length;
      bm+=idf(term)*(tf*2.2)/(tf+1.2*(0.25+0.75*e.tokens.length/Math.max(state.average,1)));
    }
    const keyword=unique.length?unique.reduce((sum,t)=>sum+Math.max(0,...e.tokens.map(other=>tokenSimilarity(t,other))),0)/Math.max(unique.length,new Set(e.tokens).size):0;
    const fuzzy=dice(qgrams,e.grams);
    const similarity=exact?1:Math.min(0.99,0.5*keyword+0.25*(maxBm?Math.min(1,2*bm/maxBm):0)+0.25*fuzzy);
    const item={documentId:e.documentId,title:e.title,content:e.content,question:e.question,similarity,directAnswer:false,followUps:e.followUps,exactPriority:e.exactPriority};
    const previous=best.get(e.documentId);
    if(!previous || previous.similarity<similarity ||
      (similarity===1 && previous.similarity===1 && previous.exactPriority<item.exactPriority)) best.set(e.documentId,item);
  }
  const matches=[...best.values()].sort((a,b)=>b.similarity-a.similarity||
    (a.similarity===1 && b.similarity===1 ? b.exactPriority-a.exactPriority : 0) || a.documentId.localeCompare(b.documentId));
  const first=matches[0];
  const exactEntries=state.entries.filter(entry=>entry.canonical===canonical);
  const highestPriority=Math.max(0,...exactEntries.map(entry=>entry.exactPriority));
  const conflictingExactAnswers=new Set(exactEntries.filter(entry=>entry.exactPriority===highestPriority)
    .map(entry=>entry.content)).size>1;
  // An exact primary question outranks another document's alias/follow-up.
  // Genuine conflicting questions of equal priority must not choose an arbitrary answer.
  const ambiguous=conflictingExactAnswers || first && matches.slice(1).some(other=>first.content!==other.content &&
    (first.similarity===1 ? other.similarity===1 && first.exactPriority===other.exactPriority :
      first.similarity-other.similarity<0.06));
  if(first && first.similarity>=settings.confidence_threshold && !ambiguous) first.directAnswer=true;
  return {settings,matches};
}
export async function retrieveReply(projectId:string,question:string) {
  if(isClosingAcknowledgement(question)) return {
    answer:conversationClosing,reliable:true,suggestions:[] as ReturnType<typeof followUpSuggestions>,
    closing_message:"",suggestions_label:"",
  };
  const {settings,matches}=await rankedQuestions(projectId,question);
  const match=matches[0],reliable=!!match?.directAnswer;
  const exactConflict=!!match && match.similarity===1 && !reliable;
  const tokenize=tokenizer(settings),queryTokens=tokenize(question);
  const suggestions=reliable ? followUpSuggestions(match.documentId,match.followUps) :
    matches.filter(m=>!exactConflict && normalized(m.question)!==normalized(question)
      && !isGreetingSuggestion(m.question) && !isGreetingSuggestion(m.title)
      && m.similarity>=0.35
      && queryTokens.some(q=>tokenize(m.question).some(candidate=>tokenSimilarity(q,candidate)>=0.7)))
      .slice(0,1).map(m=>({document_id:m.documentId,question:m.question}));
  return {answer:reliable?match.content:exactConflict
    ? "Plusieurs réponses approuvées différentes sont configurées pour cette même question. L’équipe doit corriger ces références en conflit avant que je puisse vous donner une réponse fiable."
    :settings.no_answer_message,reliable,
    suggestions,closing_message:"",
    suggestions_label:!reliable && suggestions.length ? "Voulez-vous dire :" : ""};
}

/** A confirmed proposal selects a scoped approved reference, not a second fuzzy search. */
export async function selectedKnowledgeReply(projectId:string,documentId:string,question:string) {
  const {rows}=await pool.query(`SELECT d.title,d.content,v.variantes_de_question,f.questions_json
    FROM sabito_core.knowledge_documents d
    LEFT JOIN sabito_core.knowledge_question_variants v ON v.document_id=d.id AND v.project_id=d.project_id
    LEFT JOIN sabito_core.knowledge_follow_ups f ON f.document_id=d.id AND f.project_id=d.project_id
    WHERE d.project_id=$1 AND d.id=$2 AND d.status='ready'`,[projectId,documentId]);
  const row=rows[0];if(!row)return null;
  const canonical=normalized(question);
  const mainQuestions=[String(row.title),...JSON.parse(String(row.variantes_de_question??"[]")) as string[]];
  const followUps:FollowUp[]=JSON.parse(String(row.questions_json??"[]"));
  const mainMatch=mainQuestions.some(value=>normalized(value)===canonical);
  const followUp=followUps.find(item=>normalized(item.question)===canonical);
  if(!mainMatch && !followUp)return null;
  return {answer:mainMatch?String(row.content):followUp!.answer,reliable:true,
    suggestions:mainMatch?followUpSuggestions(documentId,followUps):[],
    closing_message:"",suggestions_label:""};
}
