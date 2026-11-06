import { logger } from "../lib/logger";

const expected:Record<number,number>={1:1500,2:500,3:300};
/** Only the actual fields/text returned by the supplied BCA handlers.
 * Historical entries are not silently rewritten as current commission rules. */
export function bcaCommissionDivergences(operation:string,data:Record<string,unknown>):number[] {
  const entries:{level:number;amount:number}[]=[];
  if(operation==="referral_commission_status"&&typeof data.niveau==="number"&&typeof data.montant==="number")
    entries.push({level:data.niveau,amount:data.montant});
  if(operation==="referral_commissions_recent"&&typeof data.commissions==="string")
    for(const match of data.commissions.matchAll(/^Commission \d+ — niveau ([1-3]) — montant enregistré (\d+(?:\.\d+)?) — statut /gm))
      entries.push({level:Number(match[1]),amount:Number(match[2])});
  return [...new Set(entries.filter(entry=>expected[entry.level]!==undefined&&
    Number.isFinite(entry.amount)&&entry.amount!==expected[entry.level]).map(entry=>entry.level))];
}
export function logBcaCommissionDivergence(projectId:string,operation:string,data:Record<string,unknown>) {
  const levels=bcaCommissionDivergences(operation,data);
  if(levels.length)logger.warn({event:"BCA_REFERRAL_AMOUNT_DIVERGENCE",projectId,operation,levels},
    "Montant de commission enregistré différent du barème propriétaire ; vérification administrateur requise, sans correction automatique.");
}
export function bcaCommissionGuidance(operation:string,data:Record<string,unknown>):string {
  if(!["referral_commission_status","referral_commissions_recent"].includes(operation))return "";
  const base="\n\nLe barème communiqué par le propriétaire est fixe : 1 500 F au niveau 1, 500 F au niveau 2 et 300 F au niveau 3, sous réserve des conditions de BCA. Une écriture personnelle n’est pas un nouveau barème ni une garantie de commission future.";
  return base+(bcaCommissionDivergences(operation,data).length?
    "\nAttention : un montant renvoyé diffère de ce barème. Ce peut être une écriture historique ou une autre condition ; je ne peux pas en déterminer la cause. Une alerte de divergence est journalisée pour l’administrateur. Faites vérifier cette différence au support officiel https://bcachat.bizconnectacademy.com. Aucune valeur n’a été remplacée ni aucun solde corrigé.":"");
}
