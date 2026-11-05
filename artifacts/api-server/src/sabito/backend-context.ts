import { normalizeQuestion } from "./question-normalization";
import { buzzResultAnswer } from "./buzzbooster-contract";
import type { BackendResult } from "./backend-bridge";
import { greetingReply } from "./greeting-reply";
import { orderReferences,orderRecheck,orderContinue } from "./buzzbooster-orders";

export type BackendObservation={
  operation:string; fields:Record<string,string>; result?:BackendResult;
  checkedAt:string; stage:"observed"|"unavailable"; question:string;
};
export type BackendContext={
  version:1; owner:string; entries:BackendObservation[]; active:boolean;
  activeOperation?:string;
  selected?:string; awaiting?:{operation?:string; mode:"explain"|"read"|"action"};
};
export type Continuation=
  | {kind:"none"} | {kind:"change"}
  | {kind:"clarify"; operation?:string; mode:"explain"|"read"|"action"; candidates:BackendObservation[]}
  | {kind:"explain"|"read"|"action"; observation:BackendObservation; operation:string};
export const observationKey=(entry:Pick<BackendObservation,"operation"|"fields">)=>
  `${entry.operation}:${JSON.stringify(Object.entries(entry.fields).sort(([a],[b])=>a.localeCompare(b)))}`;
/** Filter compatible inputs when changing operation, without renaming a key or
 * substituting a reference from the result. Account-level reads need no target. */
export function continuationFields(operation:string,fields:Record<string,string>) {
  const allowed=operation.startsWith("deposit_")?["deposit_number","transaction_id","phone_number","country","payment_method"]:
    operation.startsWith("order_")?["order_number"]:
    ["referral_reward_status","referee_bonus_status"].includes(operation)?["referral_number"]:
    operation==="wallet_movement_status"?["movement_number","movement_type"]:
    operation==="admin_adjustment_status"?["movement_number"]:[];
  return Object.fromEntries(Object.entries(fields).filter(([name])=>allowed.includes(name)));
}
const targetKey=(entry:BackendObservation)=>JSON.stringify(Object.entries(entry.fields).sort(([a],[b])=>a.localeCompare(b)));
const family=(operation:string)=>operation.startsWith("deposit_")?"deposit":
  operation.startsWith("withdrawal_")?"withdrawal":
  operation.startsWith("transfer_")?"transfer":
  ["ads_campaign_status","ads_refund_status"].includes(operation)?"campaign":
  ["digital_store_fee_status","digital_store_fee_refund_status"].includes(operation)?"store_fee":
  ["digital_purchase_status","formation_payment_status","refund_status"].includes(operation)?"purchase":
  operation.startsWith("order_")?"order":operation.includes("referral")||operation==="referee_bonus_status"?"referral":
  ["wallet_balance","wallet_movement_status","admin_adjustment_status"].includes(operation)?"wallet":operation;
export function parseBackendContext(raw:unknown,owner:string,now=Date.now()):BackendContext|null {
  try {
    const value=typeof raw==="string"?JSON.parse(raw):raw;
    if(!value||value.version!==1||value.owner!==owner||!Array.isArray(value.entries))return null;
    const entries=value.entries.filter((entry:BackendObservation)=>entry&&typeof entry.operation==="string"&&
      entry.fields&&typeof entry.fields==="object"&&!Array.isArray(entry.fields)&&
      Object.values(entry.fields).every(v=>typeof v==="string")&&
      Number.isFinite(Date.parse(entry.checkedAt))&&now-Date.parse(entry.checkedAt)<86400000&&
      Date.parse(entry.checkedAt)<=now&&["observed","unavailable"].includes(entry.stage));
    return {...value,entries:entries.slice(-20)};
  }catch{return null;}
}
export function rememberBackendObservation(previous:BackendContext|null,owner:string,entry:BackendObservation):BackendContext {
  const same=previous?.active&&previous.entries.some(item=>family(item.operation)===family(entry.operation));
  const entries=same?previous!.entries.filter(item=>observationKey(item)!==observationKey(entry)):[];
  entries.push(entry);
  return {version:1,owner,entries:entries.slice(-20),active:true,activeOperation:entry.operation,
    // An explicitly selected target remains selected, but never choose the last
    // of several independently supplied references merely because it is newer.
    selected:same&&previous!.entries.some(item=>targetKey(item)===targetKey(entry))?previous?.selected:undefined};
}
export function backendContinuation(text:string,context:BackendContext|null,profile:"bca"|"buzzbooster"="buzzbooster"):Continuation {
  if(!context?.active||!context.entries.length)return {kind:"none"};
  if(greetingReply(text))return {kind:"none"};
  const q=normalizeQuestion(text);
  // Preserve the existing explicit order/batch grammar (including "celle-ci").
  // The generic "vérifie encore" remains subject to multi-target clarification.
  if(profile==="buzzbooster"&&context.activeOperation==="order_status"&&!context.awaiting&&
    (orderReferences(text,true).length||orderRecheck(text)||orderContinue(text)))return {kind:"none"};
  if(/^(?:changeons de sujet|autre (?:sujet|question)|nouvelle question|parlons d autre chose)\b/.test(q))return {kind:"change"};
  if(/\b(?:otp|mot de passe|code secret|cle privee|phrase de recuperation)\b/.test(q))return {kind:"none"};
  const read=/\b(?:verifie encore|verifier encore|reverifie|reverifier|verifie a nouveau|actualise|statut actuel|etat actuel|maintenant|toujours en attente|ou en est|ou en sont)\b/.test(q)||
    /^(?:verifie|verifiez|verifier)(?: |$)/.test(q)||
    !/^(?:pourquoi|comment|explique|expliquez)\b/.test(q)&&
    /\b(?:est il|est elle|est ce|quel est le statut|quel est son statut|ai je recu)\b/.test(q);
  const action=/\b(?:confirmer|confirme|confirmez|valider|valide|validez|forcer|force|rembourser|rembourse|annuler|annule|crediter|credite|attribuer)\b/.test(q);
  const explain=(profile==="bca"&&/^(?:aidez moi a nouveau(?: dans bca)?|repondez)$/.test(q))||
    /\b(?:comment|pourquoi|explique|expliquer|expliquez|signifie|veut dire|comprendre|distincts?|difference|details|c est quoi)\b/.test(q)||
    /\b(?:credit du portefeuille|attribution d un bonus|confirmation du paiement)\b/.test(q);
  const related=/^(?:et |qu en est il|mon bonus|le bonus|son remboursement)/.test(q);
  let operation:string|undefined;
  const currentFamily=family(context.activeOperation??context.entries[0].operation);
  if(profile==="bca") {
    if(/\bremboursement\b/.test(q)) {
      operation=currentFamily==="withdrawal"?"withdrawal_refund_status":
        currentFamily==="campaign"?"ads_refund_status":currentFamily==="store_fee"?"digital_store_fee_refund_status":
        currentFamily==="purchase"?"refund_status":undefined;
    } else if(/\bfrais\b/.test(q)) {
      operation=currentFamily==="deposit"?"deposit_fee_status":currentFamily==="transfer"?"transfer_fee_status":
        currentFamily==="store_fee"?"digital_store_fee_status":undefined;
    } else if(/\b(?:commission|commissions)\b/.test(q)&&/\bparrainage\b/.test(q))operation="referral_commission_status";
    else if(/\bcode (?:de )?parrainage\b/.test(q))operation="referral_code";
    else if(/\bsolde\b/.test(q)&&!explain)operation="wallet_balance";
    else if(/\bajustement\b/.test(q))operation="admin_adjustment_status";
    else if(/\bmouvement\b/.test(q))operation="wallet_movement_status";
    // A new personal subject uses its own existing intent/consent collector.
    if(!operation&&related&&/\b(?:bonus|remboursement|frais|activation|retrait|transfert|commission|conversion)\b/.test(q)&&
      !explain)return {kind:"none"};
  } else if(/\bbonus (?:du |de mon )?filleul\b/.test(q))operation="referee_bonus_status";
  else if(/\bremboursement\b/.test(q))operation="order_refund_status";
  else if(/\bbonus\b/.test(q)&&!explain&&context.entries.some(e=>family(e.operation)==="deposit"))operation="deposit_bonus_status";
  else if(/\b(?:commission|recompense de parrainage)\b/.test(q))operation="referral_reward_status";
  else if(/\bcode (?:de )?parrainage\b/.test(q))operation="referral_code";
  else if(/\bajustement\b/.test(q))operation="admin_adjustment_status";
  else if(/\bmouvement\b/.test(q))operation="wallet_movement_status";
  else if(/\bsolde\b/.test(q)&&!explain)operation="wallet_balance";
  const mode=read||related&&operation?"read":action?"action":"explain";
  if(!read&&!action&&!explain&&!related&&!context.awaiting)return {kind:"none"};
  if(explain&&!action&&!read&&!operation&&!context.awaiting&&
    !/\b(?:depot|paiement|transaction|commande|retrait|transfert|conversion|remboursement|frais|bonus|parrainage|mouvement|portefeuille|credit|statut|attente|confirmation|resultat|cette reponse|ce resultat|cela|ca)\b/.test(q)&&
    !/^(?:explique(?: moi)?|expliquez(?: moi)?|pourquoi|plus de details)$/.test(q))return {kind:"change"};
  // A general how-to question on another subject must use approved public help.
  const activeFamily=family(context.entries[0].operation);
  if(!context.awaiting&&/\b(?:formation|digital store|catalogue|inscription|nouvelle commande|acheter|nouveau depot|cette plateforme|la plateforme|buzz booster fonctionne|fonctionne buzz booster)\b/.test(q)&&
    !(profile==="bca"&&(operation||/\b(?:ce|cette|mon|ma|statut|paiement|remboursement)\b/.test(q)&&
      ["purchase","store_fee","digital_sale_status","digital_subscription_status"].includes(currentFamily))))return {kind:"change"};
  if(!context.awaiting&&(/\bcommande\b/.test(q)&&activeFamily!=="order"||
    /\bdepot\b/.test(q)&&activeFamily!=="deposit"))return {kind:"none"};
  const intendedOperation=operation??context.awaiting?.operation??context.activeOperation;
  let candidates=context.entries.filter(entry=>!intendedOperation||family(entry.operation)===family(intendedOperation));
  if(operation==="wallet_balance"||operation==="referral_code")
    candidates=[{...context.entries[0],operation,fields:{}}];
  // Prefer the requested operation's observation for the same target, without
  // preferring one target over another based on recency.
  candidates=candidates.sort((a,b)=>Number(b.operation===intendedOperation)-Number(a.operation===intendedOperation));
  // Deduplicate a deposit and its bonus: these are one target, not two.
  candidates=candidates.filter((entry,index,all)=>all.findIndex(other=>targetKey(other)===targetKey(entry))===index);
  if(!candidates.length) {
    if(operation==="wallet_balance"||operation==="referral_code"||operation==="referral_reward_status"||operation==="referee_bonus_status")
      candidates=[{...context.entries[0],fields:{},operation}];
    else return {kind:"none"};
  }
  const raw=text.trim();
  const matches=candidates.filter(entry=>Object.values(entry.fields).some(value=>value&&
    (raw===value||text.includes(value)&&value.length>=4)));
  if(matches.length)candidates=matches;
  else if(context.selected) {
    const selected=candidates.find(entry=>observationKey(entry)===context.selected);
    if(selected)candidates=[selected];
  }
  const pending=context.awaiting;
  if(pending&&!matches.length&&!read&&!action&&!explain&&!related)return {kind:"clarify",...pending,candidates};
  if(candidates.length!==1)return {kind:"clarify",operation:operation??pending?.operation,mode:pending?.mode??mode,candidates};
  const observation=candidates[0];
  return {kind:pending?.mode??mode,observation,operation:operation??pending?.operation??observation.operation};
}
export function explainBackendObservation(entry:BackendObservation,text:string):string {
  const date=new Date(entry.checkedAt).toISOString();
  if(entry.stage==="unavailable"||!entry.result||["error","forbidden","not_found","invalid_input"].includes(entry.result.status))
    return "La dernière consultation n’a pas permis de vérifier cette opération. Aucun paiement, crédit, bonus ou remboursement n’est confirmé. Vous pouvez demander une nouvelle vérification.";
  const answer=buzzResultAnswer(entry.operation,entry.result);
  const heading=`D’après la consultation du ${date} (aucune nouvelle consultation effectuée) :`;
  if(family(entry.operation)==="deposit") {
    const q=normalizeQuestion(text);
    const split="La confirmation du paiement par le prestataire, le crédit enregistré dans votre portefeuille et l’attribution éventuelle d’un bonus sont trois éléments différents. Autoriser un paiement auprès de votre opérateur est encore une étape distincte. Chaque état doit être vérifié séparément ; une information absente ne signifie pas zéro ni un crédit effectué.";
    return `${heading}\n${answer??"Les données disponibles ne permettent pas de préciser le statut."}\n\n${split}`+
      (/\b(?:confirm|valid|forcer)/.test(q)?"\n\nSabito consulte les données enregistrées dans Buzz Booster ; cette lecture ne prouve pas une nouvelle interrogation du prestataire. Je ne peux ni confirmer le paiement ni forcer un crédit ou un bonus. Les démarches dépendent du moyen de paiement utilisé ; une procédure Mobile Money ne s’applique pas à un paiement crypto.":"");
  }
  return `${heading}\n${answer??"Les données disponibles ne permettent pas de préciser le statut."}\n\nCette consultation est en lecture seule : elle ne déclenche aucun remboursement, crédit ni changement de commande. Je peux vérifier l’état enregistré, mais pas inventer une procédure d’action.`;
}
