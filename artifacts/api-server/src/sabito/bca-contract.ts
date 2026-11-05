import type { BackendResult } from "./backend-bridge";

/** Confirmed against the supplied Laravel service. No inferred reference aliases. */
export const bcaReadOperations = [
  "account_activation","deposit_status","withdrawal_status","transfer_status",
  "wallet_swap_status","wallet_balance","referral_code","referral_commission_status",
  "leader_reward_status","formation_payment_status","digital_purchase_status",
  "digital_sale_status","digital_subscription_status","digital_store_fee_status",
  "refund_status","ads_campaign_status","ads_payout_status","wallet_movement_status",
  "digital_product_review","referral_commissions_recent","ads_publisher_status","bca_catalogue_current",
] as const;

export function verifiedBcaResult(operation:string,result:BackendResult):boolean {
  if(!bcaReadOperations.some(value=>value===operation))return false;
  if(!["ok","success","pending","confirmed","active","inactive","failed"].includes(result.status))return false;
  const data=result.data;
  if(!data||typeof data.statut!=="string"||!data.statut.trim())return false;
  if(operation==="referral_commissions_recent")return typeof data.commissions==="string"&&!!data.commissions.trim()&&
    typeof data.nombre==="number"&&Number.isInteger(data.nombre)&&data.nombre>0;
  if(operation==="ads_publisher_status")return typeof data.test_valide==="boolean"&&
    (data.taux_configure===null||typeof data.taux_configure==="number"&&data.taux_configure>=0);
  if(operation==="bca_catalogue_current")return typeof data.catalogue==="string"&&!!data.catalogue.trim();
  if(operation==="digital_product_review")return typeof data.reference==="string"&&/^[1-9]\d{0,17}$/.test(data.reference)&&
    ["pending","approved","rejected"].includes(data.statut);
  if(operation==="referral_code")return typeof data.code_parrain==="string"&&!!data.code_parrain.trim();
  if(operation==="wallet_balance")return ["solde_principal","solde_usd"].every(key=>typeof data[key]==="number") &&
    ["devise_principale","devise_usd"].every(key=>typeof data[key]==="string"&&!!String(data[key]).trim());
  if(operation==="leader_reward_status")return typeof data.periode==="string"&&typeof data.montant_credite==="number";
  return typeof data.reference==="string"&&!!data.reference.trim();
}
