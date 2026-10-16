// Deterministic retrieval only. No model, inference service or generated answer.
import { pool } from "./database";
import { readAssistantSettings,onAssistantChange,type AssistantSettings } from "./assistant-settings";
export function normalizeTokens(text:string) {
  const stop=new Set("le la les un une des du de d l au aux et ou je tu il elle nous vous ils elles mon ma mes ton ta tes son sa ses notre votre leur a est sont ce cet cette ces c comment quel quelle quels quelles que qui pour dans sur avec en me m moi puis peux souhaiter souhaite voudrais svp merci".split(" "));
  return (text.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().match(/[\p{L}\p{N}]+/gu)??[])
    .filter(t=>!stop.has(t)).map(t=>t.length>4&&t.endsWith("s")?t.slice(0,-1):t);
}
const normalized=(s:string)=>s.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
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
type Entry={documentId:string;title:string;content:string;question:string;tokens:string[];canonical:string;grams:Set<string>};
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
    const rows=await pool.query(`SELECT d.id,d.title,d.content,v.variantes_de_question FROM sabito_core.knowledge_documents d
      LEFT JOIN sabito_core.knowledge_question_variants v ON v.document_id=d.id AND v.project_id=d.project_id
      WHERE d.project_id=$1 AND d.status='ready' ORDER BY d.id`,[projectId]);
    const entries:Entry[]=[];let bytes=0;
    for(const row of rows.rows) {
      bytes+=Buffer.byteLength(String(row.content));if(bytes>32*1024*1024) throw new Error("KNOWLEDGE_INDEX_TOO_LARGE");
      const questions=[String(row.title),...JSON.parse(String(row.variantes_de_question??"[]")) as string[]];
      for(const question of [...new Set(questions)]) {
        const tokens=tokenize(question);
        entries.push({documentId:String(row.id),title:String(row.title),content:String(row.content),question,
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
export type RankedQuestion={documentId:string;title:string;content:string;question:string;similarity:number;directAnswer:boolean};
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
    const item={documentId:e.documentId,title:e.title,content:e.content,question:e.question,similarity,directAnswer:false};
    if(!best.has(e.documentId)||best.get(e.documentId)!.similarity<similarity) best.set(e.documentId,item);
  }
  const matches=[...best.values()].sort((a,b)=>b.similarity-a.similarity||a.documentId.localeCompare(b.documentId));
  const first=matches[0],second=matches[1];
  const ambiguous=first && second && first.content!==second.content &&
    (first.similarity===1 ? second.similarity===1 : first.similarity-second.similarity<0.06);
  if(first && first.similarity>=settings.confidence_threshold && !ambiguous) first.directAnswer=true;
  return {settings,matches};
}
export async function retrieveReply(projectId:string,question:string) {
  const {settings,matches}=await rankedQuestions(projectId,question);
  const match=matches[0],reliable=!!match?.directAnswer;
  return {answer:reliable?match.content:settings.no_answer_message,reliable,
    suggestions:matches.filter(m=>!reliable||m.documentId!==match.documentId).slice(0,3)
      .map(m=>({document_id:m.documentId,question:m.question})),closing_message:settings.closing_message,
    suggestions_label:settings.suggestions_label};
}
