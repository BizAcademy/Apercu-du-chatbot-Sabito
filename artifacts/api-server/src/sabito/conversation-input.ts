import { normalizeQuestion } from "./question-normalization";

/** Classification only: the original input is never rewritten or stored as an alias. */
export function opaqueConversationInput(text:string) {
  const value=text.trim();
  return /^https?:\/\/\S+$/iu.test(value)||
    /^(?:BUZZ_|BB-|PIM|POM)[\p{L}\p{N}_-]+$/iu.test(value)||
    /^#?\d[\d .()-]*$/u.test(value)||
    /^(?=[\p{L}\p{N}_/-]*\d)[\p{L}\p{N}_/-]{4,160}$/u.test(value);
}
export function incompleteConversationInput(text:string) {
  return /^(?:pourquoi|aidez moi|aide moi(?: pardon)?|quel est le|comment faire(?: alors)?|j aimerais savoir comment|oui|je suis connecte|je suis connecter|aide moi a ouvrir)$/.test(normalizeQuestion(text));
}
/** Narrow ambiguity guards, not a second answer-search engine. */
export function corpusClarificationKey(text:string,early=false):string|undefined {
  const q=normalizeQuestion(text);
  if(/\bbca\b/.test(q)&&/\b(?:fonctionne|fonctionnement|travail|site|application)\b/.test(q))return "fonctionnement";
  if(/^(?:mon )?depo[t]? recue?$/.test(q))return "depot-attente";
  if(/^je veux annul[éeer]*$/u.test(q))return "annuler";
  if(early)return undefined;
  if(opaqueConversationInput(text))return /^https?:/i.test(text.trim())?"lien":"reference";
  if(/^(?:je suis connecte|je suis connecter|aide moi a ouvrir)$/.test(q))return "acces";
  if(q==="oui")return "consentement";
  if(incompleteConversationInput(text))return "incomplet";
  return undefined;
}
