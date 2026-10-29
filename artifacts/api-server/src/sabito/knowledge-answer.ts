// Answers are authored records, not extracts or generated text.
import type { KnowledgeMatch } from "./knowledge";
import { conversationClosing,isClosingAcknowledgement } from "./conversation-closing";
import { greetingReply } from "./greeting-reply";
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
  const greeting = greetingReply(question);
  if(greeting)return {answer:greeting,reliable:true};
  if(isClosingAcknowledgement(question))return {answer:conversationClosing,reliable:true};
  const direct=matches.filter(match=>match.directAnswer).sort((a,b)=>(b.similarity??0)-(a.similarity??0));
  const ambiguous=direct.length>1 && (direct[0].similarity??0)-(direct[1].similarity??0)<0.12
    && direct[0].content.trim()!==direct[1].content.trim();
  if(direct.length && !ambiguous) return {answer:direct[0].content,reliable:true};
  return {answer:"Je n’ai pas encore assez de connaissances approuvées sur cette plateforme pour répondre à cette question.",reliable:false};
}
export function streamParts(content: string, size = 512): string[] {
  return content.match(new RegExp(`.{1,${size}}`,"gs")) ?? [];
}
