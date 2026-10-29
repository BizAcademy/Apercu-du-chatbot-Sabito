import { normalizeQuestion } from "./question-normalization";

const greeting = /^(?:bonjour|bonsoir|salut|coucou|hello|hi|hey|bjr|bsr|slt|bon matin)(?: |$)/;
const wellbeing = /^(?:comment (?:tu vas|vas tu|va tu|allez vous|vous allez|ca va)|ca va(?: bien)?|tu vas bien|vous allez bien|j espere que (?:tu vas|vous allez) bien)$/;

/** Whole social message only. A greeting before a real request must not hide that request. */
export function greetingReply(text: string): string | null {
  const normalized = normalizeQuestion(text);
  let rest = normalized;
  let greeted = false;
  while (greeting.test(rest)) {
    rest = rest.replace(greeting, "");
    greeted = true;
  }
  if (greeted) rest = rest.replace(/^(?:sabito(?: ai)?|a tous|a toutes|tout le monde)(?: |$)/, "");
  const asksWellbeing = wellbeing.test(rest);
  if ((!greeted && !asksWellbeing) || (rest && !asksWellbeing)) return null;
  const salutation = /^bonsoir(?: |$)/.test(normalized) ? "Bonsoir" :
    /^(?:salut|coucou|hello|hi|hey|slt)(?: |$)/.test(normalized) ? "Salut" : "Bonjour";
  return `${salutation} !${asksWellbeing ? " Je suis là et prêt à vous aider." : ""} Que puis-je faire pour vous ?`;
}
