// Local extractive engine from BizConnectAcademy/sabito. No LLM calls.
// French fallback messages and Unicode keywords are the only language adaptations.
import type { KnowledgeMatch } from "./knowledge";
const stopWords = new Set([
  "about","after","again","also","been","before","being","could","from",
  "have","into","more","other","should","that","their","there","these",
  "they","this","those","what","when","where","which","with","would",
  "avec","dans","pour","comment","quel","quelle","quelles","quels","est","les","des","une","que","qui","sur",
]);
function keywords(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter(word => !stopWords.has(word)));
}
function sentences(text: string): string[] {
  return text.replace(/\s+/g," ").split(/(?<=[.!?])\s+/).map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 20 && sentence.length <= 600);
}
export function buildKnowledgeAnswer(question: string, matches: KnowledgeMatch[]): string {
  if (!matches.length) return "Je n’ai pas encore assez de connaissances approuvées sur cette plateforme pour répondre à cette question.";
  const terms = keywords(question);
  const ranked = matches.flatMap((match,sourceIndex) =>
    sentences(match.content).map((sentence,sentenceIndex) => {
      const sentenceTerms = keywords(sentence);
      const score = [...terms].reduce((total,term) => total + (sentenceTerms.has(term) ? 1 : 0),0);
      return {sentence,title:match.title,score,sourceIndex,sentenceIndex};
    })).sort((left,right) => right.score-left.score || left.sourceIndex-right.sourceIndex || left.sentenceIndex-right.sentenceIndex);
  const relevant = ranked.filter(item => item.score > 0).slice(0,5);
  // Do not present unrelated sentences as an answer.
  if (!relevant.length) return "J’ai trouvé des références proches, mais pas assez d’informations pour répondre de façon fiable.";
  return relevant.map(item => item.sentence).join("\n\n");
}
export function streamParts(content: string, size = 28): string[] {
  return content.match(new RegExp(`.{1,${size}}`,"gs")) ?? [];
}
