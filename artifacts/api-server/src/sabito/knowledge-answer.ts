// Local extractive engine from BizConnectAcademy/sabito. No LLM calls.
// French fallback messages and Unicode keywords are the only language adaptations.
import type { KnowledgeMatch } from "./knowledge";
const stopWords = new Set([
  "about","after","again","also","been","before","being","could","from",
  "have","into","more","other","should","that","their","there","these",
  "they","this","those","what","when","where","which","with","would",
  "avec","dans","pour","comment","quel","quelle","quelles","quels","est","les","des","une","que","qui","sur",
  "aux","mon","mes","ton","tes","son","ses","nos","vos","vous","nous","sont","puis","peux",
]);
function keywords(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter(word => !stopWords.has(word)));
}
function sentences(text: string): string[] {
  return text.replace(/\s+/g," ").split(/(?<=[.!?])\s+/).map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 20 && sentence.length <= 600);
}
export function buildKnowledgeAnswer(question: string, matches: KnowledgeMatch[]): string {
  return knowledgeReply(question, matches).answer;
}
export function knowledgeReply(question: string, matches: KnowledgeMatch[]): {answer:string; reliable:boolean} {
  if (!matches.length) return {answer:"Je n’ai pas encore assez de connaissances approuvées sur cette plateforme pour répondre à cette question.",reliable:false};
  const direct=matches.filter(match=>match.directAnswer).sort((a,b)=>(b.similarity??0)-(a.similarity??0));
  const ambiguous=direct.length>1 && (direct[0].similarity??0)-(direct[1].similarity??0)<0.12
    && direct[0].content.trim()!==direct[1].content.trim();
  if(direct.length && !ambiguous) return {answer:direct[0].content,reliable:true};
  const terms = keywords(question);
  const ranked = matches.flatMap((match,sourceIndex) =>
    sentences(match.content).map((sentence,sentenceIndex) => {
      const sentenceTerms = keywords(sentence);
      const score = [...terms].reduce((total,term) => total + (sentenceTerms.has(term) ? 1 : 0),0);
      return {sentence,title:match.title,score,sourceIndex,sentenceIndex};
    })).sort((left,right) => right.score-left.score || left.sourceIndex-right.sourceIndex || left.sentenceIndex-right.sentenceIndex);
  // A single generic overlapping word is not proof that a document answers
  // the question. Keep refusal explicit rather than stitching unrelated facts.
  const supported=ranked.filter(item=>terms.size>0 && item.score/terms.size>=0.65);
  const best=supported[0];
  const sameSource=(item:typeof ranked[number])=>best && (matches[best.sourceIndex].documentId
    ? matches[item.sourceIndex].documentId===matches[best.sourceIndex].documentId : item.sourceIndex===best.sourceIndex);
  const competing=best && supported.some(item=>!sameSource(item) && item.score>=best.score
    && item.sentence.trim()!==best.sentence.trim());
  const seen=new Set<string>();
  const relevant = ambiguous || competing ? [] : supported.filter(item=>sameSource(item) && !seen.has(item.sentence) && !!seen.add(item.sentence)).slice(0,5);
  // Do not present unrelated sentences as an answer.
  if (!relevant.length) {
    const suggestions = [...new Map(matches.map(match => [match.documentId??match.title, match])).values()].slice(0,3);
    return {answer:"Je n'ai pas de réponse exacte, mais voici ce qui pourrait vous aider :\n\n" +
      suggestions.map((match,index) => `${index+1}. ${match.question??match.title}\n${match.content.slice(0,450).trim()}${match.content.length > 450 ? "…" : ""}`).join("\n\n"),reliable:false};
  }
  return {answer:relevant.map(item => item.sentence).join("\n\n"),reliable:true};
}
export function streamParts(content: string, size = 28): string[] {
  return content.match(new RegExp(`.{1,${size}}`,"gs")) ?? [];
}
