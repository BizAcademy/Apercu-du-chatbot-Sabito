import { z } from "zod";
import { guidanceLanguage } from "./public-guidance-language";

export const guidanceBudgetSchema=z.object({
  amount:z.string().max(40).optional(),
  currency:z.enum(["XAF","foreign","unknown"]).default("unknown"),
  funding:z.enum(["wallet","total","unknown"]).default("unknown"),
});
export type GuidanceBudget=z.infer<typeof guidanceBudgetSchema>;

/** These are declared spending constraints, never a statement of actual balance. */
export function guidanceBudget(text:string,previous?:GuidanceBudget,awaiting?:string):GuidanceBudget|undefined {
  const q=guidanceLanguage(text);
  const amount=/(?:budget(?:\s+(?:total|de|maximum|maximal|est|a|en))*\s*[:=]?\s*|j['’ ]ai\s+)(\d[\d ]*(?:[.,]\d+)?)/i.exec(text)?.[1]
    ??/(\d[\d ]*(?:[.,]\d+)?)\s*(?:f\b|fcfa\b|cfa\b|xaf\b|xof\b|usd\b|eur\b|\$|€)/i.exec(text)?.[1]
    ??(awaiting==="usable"?/^\s*(\d[\d ]*(?:[.,]\d+)?)\s*$/.exec(text)?.[1]:undefined);
  if(!previous&&!amount&&!/\bbudget\b/.test(q))return undefined;
  const value:GuidanceBudget=previous?{...previous}:{currency:"unknown",funding:"unknown"};
  if(amount)value.amount=amount.replace(/\s/g,"").replace(",",".");
  if(/\bxaf\b/.test(q))value.currency="XAF";
  else if(/\b(?:xof|usd|eur|euros?|dollars?)\b|[$€]/.test(text.toLowerCase()))value.currency="foreign";
  else if(amount)value.currency=awaiting==="usable"&&previous?.currency==="XAF"?"XAF":"unknown";
  if(/\b(?:portefeuille|deja disponible|deja depose|solde disponible|deja dans mon solde|deja sur mon compte)\b/.test(q))value.funding="wallet";
  else if(/\b(?:frais compris|frais inclus|a deposer|pour deposer|depense totale|somme totale)\b/.test(q))value.funding="total";
  if(awaiting==="usable"&&amount)value.funding="wallet";
  return value;
}

export const budgetAdvice="Avec un petit budget, choisissez un objectif prioritaire plutôt que disperser la somme. Une quantité modeste doit respecter le minimum du service. Choisissez une publication pertinente et accessible selon ses conditions, et continuez à publier du contenu utile et régulier. Ce sont des conseils généraux, sans garantie de ventes, de clients, de viralité, de monétisation ou d’audience active et durable.";
export const purposeAnswer="Buzz Booster permet de commander des services de visibilité et d’engagement pour les réseaux sociaux. Selon les offres réellement disponibles, il peut s’agir de vues, d’abonnés, de mentions J’aime ou d’autres interactions ; cette présentation ne confirme pas leur disponibilité actuelle.\nLe choix dépend de votre objectif : faire découvrir une vidéo, développer l’audience apparente d’un compte ou augmenter les interactions sur une publication. Vous choisissez un service, payez avec votre solde et suivez la commande sur la plateforme. Ces prestations ne garantissent ni ventes, ni monétisation, ni audience active et durable. Elles ne doivent pas être confondues avec la publicité officielle d’un réseau social.\n\nQuel réseau social souhaitez-vous développer ?";
