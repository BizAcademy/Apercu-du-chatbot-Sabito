import { z } from "zod";
import { defaultAbbreviations } from "./question-spelling";

// Only linguistic keys: identifiers, numbers and negation cannot be installed
// as corrections, including by an administrator.
const protectedWords=new Set(["pas","non","jamais","sans","aucun","aucune","annule","annulee","debite","debitee","rembourse","remboursee"]);
const dictionary=z.record(z.string().regex(/^[a-z]{2,32}$/),z.string().trim().min(2).max(100))
  .refine(value=>Object.keys(value).length<=200 &&
    Object.entries(value).every(([key,replacement])=>!protectedWords.has(key) &&
      (key!=="pa"||replacement==="pas")&&(key!=="nn"||replacement==="non")&&
      /^[\p{L} '’]+$/u.test(replacement)), "Dictionnaire linguistique uniquement, sans nombres ni références.");
export const retrievalSettingsSchema=z.object({
  minimum_score:z.number().min(0.25).max(0.9),
  ambiguity_margin:z.number().min(0.03).max(0.3),
  abbreviations:dictionary,
  corrections:dictionary,
}).strict();
export const defaultRetrievalSettings={
  minimum_score:0.35,ambiguity_margin:0.06,
  abbreviations:defaultAbbreviations,corrections:{} as Record<string,string>,
};
