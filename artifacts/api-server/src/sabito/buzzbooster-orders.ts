import { createHash } from "node:crypto";
import type { BackendResult } from "./backend-bridge";
import { normalizeQuestion } from "./question-normalization";

export const orderBatchSize=10;
export const orderConcurrency=2;
export const orderAnswerHash=(answer:string)=>createHash("sha256").update(answer).digest("hex");
export function orderContext(numbers:string[],answer:string,remaining:string[]=[]):Record<string,string> {
  return {__last_orders:JSON.stringify(numbers),__remaining_orders:JSON.stringify(remaining),__answer_hash:orderAnswerHash(answer)};
}
export function explicitOrderRead(text:string):boolean {
  const q=normalizeQuestion(text);
  return /\bcommandes?\b/.test(q)&&/\b(?:verifie|verifier|verifiez|reverifie|reverifier|suivre|suivi|statut|etat|ou est|ou en|en est|en sont)\b/.test(q)&&
    !/\b(?:annule|annuler|supprime|supprimer|modifie|modifier|payer|achete|acheter)\b/.test(q);
}
const list="[#]?\\d{1,128}(?:(?:\\s*[,;|\\n]\\s*|\\s+(?:et|puis)\\s+|\\s+)[#]?\\d{1,128})*";
const numberTokens=(value:string)=>Array.from(value.matchAll(/\d+/g),m=>m[0]);
/** Anchored context grammar: never mine every number from an arbitrary sentence. */
export function orderReferences(text:string,inOrderContext=false):string[] {
  const raw=text.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase(),q=normalizeQuestion(text);
  if(/\b(?:otp|pin|mot de passe|code secret|code de verification)\b/.test(q))return [];
  if(/\b(?:annule|annuler|supprime|supprimer|modifie|modifier|payer|achete|acheter)\b/.test(q))return [];
  const references:string[]=[];
  if(explicitOrderRead(text)) {
    const labeled=new RegExp(`\\bcommandes?\\s*(?:(?:n(?:umeros?|o)?\\s*[°º:]?|numeros?)\\s*)?[:#]?\\s*(${list})(?![\\d\\w./-])`,"g");
    for(const match of raw.matchAll(labeled)) {
      const values=numberTokens(match[1]);
      const tail=raw.slice((match.index??0)+match[0].length);
      // A quantity or monetary amount is not another order number.
      if(/^\s*(?:abonnes?|followers|vues?|likes?|commentaires?|partages?|xaf|xof|usd|jours?|heures?)\b/.test(tail))values.pop();
      references.push(...values);
    }
  }
  const contextual=new RegExp(`^(?:(?:et\\s+)?(?:celle[ -]ci(?: aussi)?|celle[ -]la|verifie(?: aussi)?|maintenant|et|pardon|correction|c est|voici|(?:le bon |la bonne )?(?:numero(?: de (?:ma |la )?commande)?|reference|commande)(?: est)?)\\s*[:=#]?\\s*)?(${list})\\s*[?.!]*$`);
  const standalone=contextual.exec(raw.trim());
  const listedVerification=new RegExp(`^(?:verifie|verifier|verifiez)\\s+(${list})\\s*[?.!]*$`).exec(raw.trim());
  if(inOrderContext&&standalone)references.push(...numberTokens(standalone[1]));
  else if(listedVerification&&numberTokens(listedVerification[1]).length>1)references.push(...numberTokens(listedVerification[1]));
  return [...new Set(references)];
}
export const orderRecheck=(text:string)=>/^(?:reverifie|verifie a nouveau|actualise)(?: (?:celle ci|celle la|cette commande|la commande|son statut))?$/.test(normalizeQuestion(text));
export const orderContinue=(text:string)=>/^(?:suite|la suite|commandes suivantes|lot suivant|continue|continuer)$/.test(normalizeQuestion(text));
export type OrderOutcome={number:string;result?:BackendResult;technicalError?:string;sessionMissing?:boolean};
function value(value:unknown):string {
  return value===null||value===undefined||value===""?"Non disponible":String(value).replace(/<[^>]*>/g,"").replace(/[\r\n|]/g," ").slice(0,250);
}
export function orderOutcomeAnswer(outcome:OrderOutcome):string {
  const {number,result}=outcome,heading=`Commande : ${number}`;
  if(outcome.sessionMissing)return `${heading}\nConnexion membre nécessaire : cette commande n’a pas été vérifiée. Reconnectez-vous à Buzz Booster.`;
  if(outcome.technicalError||!result||!["ok","success","confirmed","pending","failed","not_found","forbidden","invalid_input"].includes(result.status)||result.status==="error")
    return `${heading}\nLa vérification n’a pas abouti. Le statut de la commande est non disponible ; cela ne signifie pas que la commande a échoué.${outcome.technicalError?` ${outcome.technicalError}`:""}`;
  if(["not_found","forbidden","invalid_input"].includes(result.status))
    return `${heading}\nCommande introuvable ou non accessible à votre compte avec ces informations. Vérifiez le numéro de commande et renvoyez-la pour continuer la vérification. Aucune donnée d’un autre membre n’est affichée.`;
  const data=result.data??{};
  const returned=data.order_number??data.numero_commande;
  if(returned!==undefined&&String(returned).replace(/^0+(?=\d)/,"")!==number.replace(/^0+(?=\d)/,""))
    return `${heading}\nLa vérification n’a pas abouti : le résultat ne permet pas de confirmer cette commande. Aucun statut n’est affirmé.`;
  const business=data.order_status??data.statut_commande??data.statut??data.status;
  const statuses:Record<string,string>={pending:"En attente",processing:"En cours",in_progress:"En cours",completed:"Terminé",
    partial:"Partiel",canceled:"Annulé",cancelled:"Annulé",failed:"Échoué",refunded:"Remboursé"};
  const status=typeof business==="string"?(statuses[normalizeQuestion(business).replaceAll(" ","_")]??value(business)):"Non disponible";
  const amount=data.montant??data.amount,currency=data.devise??data.currency;
  return [heading,`Service : ${value(data.service??data.service_name??data.nom_service)}`,`Statut : ${status}`,
    `Quantité commandée : ${value(data.quantite??data.quantity)}`,
    `Quantité restante : ${value(data.quantite_restante??data.remains)}`,
    amount!==undefined?`Montant : ${value(amount)} ${value(currency)}`:"",
    business===undefined?"Le backend n’a pas retourné de statut métier. Aucune progression ni livraison n’est confirmée.":
      "Vous pouvez consulter l’évolution dans Ordres. Aucun délai ni preuve de livraison supplémentaire n’est confirmé.",
  ].filter(Boolean).join("\n");
}
