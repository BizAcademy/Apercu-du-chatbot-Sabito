import type { IntentDefinition } from "./assistant-settings";
import type { BackendResult } from "./backend-bridge";
export const buzzOperations=["deposit_status","deposit_bonus_status","order_status","order_refund_status","referral_code",
  "referral_reward_status","referee_bonus_status","wallet_balance","wallet_movement_status","admin_adjustment_status"];
const depositOps=new Set(["deposit_status","deposit_bonus_status"]);
export function alignBuzzIntent(intent:IntentDefinition):IntentDefinition {
  const operation=intent.backend_function;
  let fields=intent.fields.map(field=>{
    const name=["order_status","order_refund_status"].includes(operation)&&field.name==="order_id"?"order_number"
      : ["wallet_movement_status","admin_adjustment_status"].includes(operation)&&field.name==="transaction_id"?"movement_number"
      : operation==="referral_reward_status"&&field.name==="reward_reference"?"referral_number":field.name;
    const prompt=name==="order_number"?"Veuillez communiquer le numéro de commande affiché dans Ordres, et non une référence de paiement."
      :name==="movement_number"?"Quel est le numéro du mouvement affiché dans Transactions ?"
      :name==="referral_number"?"Quelle référence de parrainage permet de préciser cette récompense ?":field.prompt;
    return {...field,name,prompt};
  });
  // These exact legacy defaults requested an unnecessary reference before any lookup.
  if(operation==="referral_reward_status" && intent.fields.length===1 &&
    intent.fields[0].name==="reward_reference" &&
    intent.fields[0].prompt==="Quelle est la référence de la commission de parrainage à vérifier ?")fields=[];
  return {...intent,fields};
}
export function optionalBuzzField(operation:string,name?:string):IntentDefinition["fields"][number]|undefined {
  if(["referral_reward_status","referee_bonus_status"].includes(operation)&&(!name||name==="referral_number"))
    return {name:"referral_number",prompt:"Quelle référence de parrainage permet de préciser cette récompense ?",type:"identifier",min_length:1,max_length:128};
  if(depositOps.has(operation)&&["country","payment_method"].includes(name??""))
    return {name:name!,prompt:name==="country"?"Dans quel pays avez-vous effectué ce dépôt ?":"Quelle méthode de paiement avez-vous utilisée pour ce dépôt ?",type:"text",min_length:2,max_length:128};
  if(operation==="wallet_movement_status"&&name==="movement_type")
    return {name,prompt:"Quel type de mouvement souhaitez-vous préciser dans Transactions ?",type:"text",min_length:2,max_length:128};
  return undefined;
}
export function buzzDepositIdentifier(input:string):{name:string;value:string}|undefined {
  const value=input.trim();
  const reference=/(?:^|\s)(BUZZ_[\p{L}\p{N}_-]+|BB-[\p{L}\p{N}_-]+|(?:PIM|POM)[\p{L}\p{N}_-]+)\s*[.!]?$/iu.exec(value)?.[1];
  if(reference)return {name:/^(?:PIM|POM)/i.test(reference)?"transaction_id":"deposit_number",value:reference};
  const labeled=/^(?:mon |le |numéro de |numero de )?(?:téléphone|telephone|phone|dépôt|depot)\s*[:=]\s*(.+)$/iu.exec(value);
  if(labeled) return {name:/(?:phone|telephone|téléphone)/i.test(value.split(/[:=]/)[0])?"phone_number":"deposit_number",value:labeled[1].trim()};
  if(/^\+\d[\d ()-]{6,19}$/.test(value))return {name:"phone_number",value};
  return undefined;
}
/** Restrict emitted keys to the existing platform contract; never change identity. */
export function buzzBackendFields(operation:string,fields:Record<string,string>):Record<string,string> {
  const values=Object.fromEntries(Object.entries(fields).filter(([key])=>!key.startsWith("__")));
  if(depositOps.has(operation)) {
    const input=values.deposit_number??values.transaction_id??values.phone_number;
    if(input) {
      const classified=buzzDepositIdentifier(input);
      if(classified) {
        delete values.deposit_number;delete values.transaction_id;delete values.phone_number;
        values[classified.name]=classified.value;
      }
    }
  }
  const allowed=depositOps.has(operation)?["deposit_number","transaction_id","phone_number","country","payment_method"]
    : ["order_status","order_refund_status"].includes(operation)?["order_number"]
    : ["referral_reward_status","referee_bonus_status"].includes(operation)?["referral_number"]
    : operation==="wallet_movement_status"?["movement_number","movement_type"]
    : operation==="admin_adjustment_status"?["movement_number"]:[];
  if(Object.keys(values).some(key=>!allowed.includes(key)))throw new Error("BACKEND_UNVERIFIED_RESULT");
  return values;
}
const labels:Record<string,string>={
  statut:"Statut",status:"Statut",order_status:"Statut de la commande",statut_commande:"Statut de la commande",
  service:"Service",quantite:"Quantité",quantity:"Quantité",quantite_restante:"Quantité restante",remains:"Quantité restante",
  montant:"Montant",amount:"Montant",devise:"Devise",currency:"Devise",date:"Date",created_at:"Date",
  reference:"Référence",order_number:"Numéro de commande",numero_commande:"Numéro de commande",
  deposit_number:"Référence du dépôt",transaction_id:"Identifiant de paiement",movement_number:"Numéro du mouvement",
  referral_number:"Référence de parrainage",montant_rembourse:"Montant remboursé",refund_amount:"Montant remboursé",
  bonus:"Bonus",bonus_amount:"Montant du bonus",bonus_status:"Statut du bonus",eligible:"Éligibilité",
  credit_status:"Statut du crédit",credited:"Crédit enregistré",refund_recorded:"Remboursement enregistré",
  solde_local:"Solde local",devise_local:"Devise locale",solde_usd:"Solde USD",devise_usd:"Devise USD",
  type_mouvement:"Type de mouvement",movement_type:"Type de mouvement",
  credit_enregistre:"Crédit enregistré",ecriture_credit:"Crédit enregistré",reference_remboursement:"Référence du remboursement",
};
const statuses:Record<string,string>={pending:"En attente",processing:"En cours",completed:"Terminé",partial:"Partiel",
  canceled:"Annulé",cancelled:"Annulé",failed:"Échoué",refunded:"Remboursé"};
export function buzzResultAnswer(operation:string,result:BackendResult):string|null {
  if(!["ok","success","confirmed","pending","failed"].includes(result.status))return null;
  const data=result.data??{};
  if(operation==="referral_code") {
    const code=data.code_parrain??data.code??result.code;
    return typeof code==="string"&&code.trim()?`Votre code de parrainage est : ${code}`:null;
  }
  if(operation==="wallet_balance" && !["solde_local","devise_local","solde_usd","devise_usd"].every(key=>data[key]!==undefined&&data[key]!==null))return null;
  const refundProof=operation!=="order_refund_status" || (
    (data.refund_recorded===true||data.credit_enregistre===true||data.ecriture_credit===true||typeof data.reference_remboursement==="string"||
      typeof data.movement_number==="string") &&
    Number(data.montant_rembourse??data.refund_amount??data.montant??data.amount)>0 &&
    typeof (data.devise??data.currency)==="string");
  const details=Object.entries(data).filter(([key,value])=>Object.hasOwn(labels,key)&&value!==null)
    .filter(([key])=>refundProof || !/statut|status|refunded|refund_recorded/.test(key))
    .map(([key,value])=>`${!refundProof&&/montant|amount/.test(key)?"Montant communiqué":labels[key]} : ${typeof value==="boolean"?(value?"Oui":"Non"):/statut|status/.test(key)?statuses[String(value)]??String(value):String(value)}`);
  if(!details.length)return null;
  const warnings:string[]=[];
  if(!refundProof)warnings.push("Les éléments reçus ne suffisent pas à confirmer un crédit de remboursement enregistré. Consultez Remboursements ou Support.");
  if(result.status==="failed"&&!data.statut&&!data.status)warnings.push("L’opération est signalée en échec. Aucune cause supplémentaire n’a été confirmée.");
  if(operation==="deposit_status")warnings.push("Le statut du paiement, le crédit du portefeuille et l’attribution d’un bonus sont distincts.");
  if(operation==="order_refund_status")warnings.push("Un ticket fermé ne prouve ni un remboursement ni un refus. Seule une écriture de crédit enregistrée permet de confirmer un remboursement ; un recrédit de portefeuille n’est pas un retour Mobile Money.");
  return ["Informations retournées pour votre compte :",...details,...warnings].join("\n");
}
