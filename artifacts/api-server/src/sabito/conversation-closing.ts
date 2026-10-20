import { normalizeQuestion } from "./question-normalization";

export const conversationClosing = "À la prochaine ! N'hésitez pas à revenir si vous avez un souci.";

/** Whole acknowledgement only: never close a real question containing "merci" or "ok". */
export function isClosingAcknowledgement(text: string): boolean {
  return /^(?:(?:merci(?: beaucoup| bien| infiniment)?|ok+|okay|d ?accord|tank(?:s)?|thank(?:s| you)?|c est bon|compris)(?: +|$))+$/
    .test(normalizeQuestion(text));
}
