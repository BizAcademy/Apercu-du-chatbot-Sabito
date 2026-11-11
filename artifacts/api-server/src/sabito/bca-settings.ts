import type { AssistantSettings, IntentDefinition } from "./assistant-settings";
import { bcaOwnerPrivateAliases } from "./bca-owner-answers";
import { bcaNovemberPrivateAliases } from "./bca-november-questions";
import { bcaSupportTemplates } from "./bca-support-questions";
import { normalizeQuestion } from "./question-normalization";

type Template = {
  operation: string;
  name: string;
  triggers: string[];
  field?: [name: string, prompt: string];
  enabled?: boolean;
};

/** Consultation only. Operation names must be implemented independently by BCA. */
const catalog: Template[] = [
  ...bcaSupportTemplates,
  { operation: "account_activation", name: "État et paiement d'activation",
    triggers: ["compte non activé", "vérifier mon activation", "paiement d'activation"],
    field: ["transaction_id", "Quelle est la référence du paiement d’activation à vérifier ?"] },
  { operation: "deposit_status", name: "Dépôt Mobile Money ou crypto",
    triggers: ["dépôt non reçu", "vérifier mon dépôt", "dépôt en attente", "dépôt crypto", "crédit manuel USD"],
    field: ["deposit_number", "Veuillez communiquer la référence exacte du dépôt affichée dans votre historique BCA, et non un numéro de téléphone."] },
  { operation: "deposit_fee_status", name: "Frais et montant net d'un dépôt",
    triggers: ["frais de mon dépôt", "montant net de mon dépôt", "pourquoi mon dépôt est inférieur"],
    field: ["deposit_number", "Quelle est la référence du dépôt dont vous souhaitez consulter les frais ?"] },
  { operation: "withdrawal_status", name: "Retrait Mobile Money ou crypto",
    triggers: ["retrait non reçu", "vérifier mon retrait", "statut de mon retrait", "délai de retrait", "retrait crypto"],
    field: ["withdrawal_number", "Veuillez communiquer la référence exacte du retrait affichée dans votre historique BCA, et non un numéro de téléphone."] },
  { operation: "withdrawal_refund_status", name: "Remboursement d'un retrait",
    triggers: ["remboursement de mon retrait", "retrait rejeté non remboursé", "retrait crypto remboursé"],
    field: ["withdrawal_number", "Quelle est la référence du retrait dont vous attendez le remboursement ?"] },
  { operation: "transfer_status", name: "Transfert BCA à BCA",
    triggers: ["transfert BCA à BCA", "transfert entre membres", "transfert non reçu", "vérifier mon transfert"],
    field: ["transfer_reference", "Quelle est la référence de votre transfert entre membres BCA ?"] },
  { operation: "transfer_fee_status", name: "Frais de transfert BCA",
    triggers: ["frais de mon transfert", "frais de transfert BCA"],
    field: ["transfer_reference", "Quelle est la référence du transfert dont vous souhaitez consulter les frais ?"] },
  { operation: "wallet_swap_status", name: "Conversion principal / USD",
    triggers: ["conversion de mon portefeuille", "conversion USD en attente", "vérifier mon échange de devises", "statut de ma conversion"],
    field: ["swap_reference", "Quelle est la référence de votre conversion de portefeuille ?"] },
  { operation: "wallet_balance", name: "Soldes et devises des portefeuilles",
    triggers: ["mon solde disponible", "solde de mon portefeuille", "mon solde USD", "consulter mes soldes"] },
  { operation: "referral_code", name: "Code de parrainage",
    triggers: ["mon code parrain", "code de parrainage", "mon lien de parrainage",...bcaOwnerPrivateAliases.referral_code] },
  { operation: "referral_commission_status", name: "Commission de parrainage",
    triggers: ["commission de parrainage non reçue", "vérifier ma commission", "mes commissions de parrainage",
      ...bcaOwnerPrivateAliases.referral_commission_status],
    field: ["commission_reference", "Quel est l’identifiant numérique exact de la commission de parrainage à vérifier ?"] },
  { operation: "leader_reward_status", name: "Récompense mensuelle des leaders",
    triggers: ["ma récompense leader", "bonus mensuel leader", "prime top leader", "récompense mensuelle non reçue"],
    field: ["reward_period", "Indiquez le premier jour du mois de récompense au format AAAA-MM-01, par exemple 2026-11-01."] },
  { operation: "formation_payment_status", name: "Paiement d'une formation",
    triggers: ["paiement de ma formation", "formation payée non accessible", "vérifier mon paiement de formation"],
    field: ["payment_reference", "Quelle est la référence du paiement de votre formation ?"] },
  { operation: "digital_purchase_status", name: "Achat Digital Store",
    triggers: ["mon achat Digital Store", "achat numérique non reçu", "vérifier mon achat numérique"],
    field: ["purchase_reference", "Quel est l’identifiant numérique de la transaction associée à votre achat Digital Store ?"] },
  { operation: "digital_sale_status", name: "Revenu d'une vente Digital Store",
    triggers: ["revenu de ma vente", "vente Digital Store non créditée", "vérifier ma vente numérique"],
    field: ["sale_reference", "Quel est l’identifiant numérique de la transaction associée à la vente Digital Store ?"] },
  { operation: "digital_subscription_status", name: "Abonnement annuel vendeur",
    triggers: ["mon abonnement vendeur", "abonnement annuel Digital Store", "paiement abonnement vendeur"],
    field: ["subscription_reference", "Quel est l’identifiant numérique de la transaction associée à votre abonnement vendeur ?"] },
  { operation: "digital_store_fee_status", name: "Frais de publication ou modification",
    triggers: ["frais de publication Digital Store", "frais de modification Digital Store", "frais de ma formation numérique"],
    field: ["fee_reference", "Quelle est la référence du paiement des frais de publication ou de modification ?"] },
  { operation: "digital_store_fee_refund_status", name: "Remboursement des frais Digital Store",
    triggers: ["remboursement frais Digital Store", "frais de publication non remboursés"],
    field: ["fee_reference", "Quelle est la référence des frais Digital Store à rembourser ?"] },
  { operation: "refund_status", name: "Remboursement d'un achat numérique",
    triggers: ["remboursement de mon achat", "achat Digital Store non remboursé", "remboursement de ma formation"],
    field: ["purchase_reference", "Quel est l’identifiant numérique de la transaction associée à l’achat concerné par le remboursement ?"] },
  { operation: "ads_campaign_status", name: "Budget et état d'une campagne BCA Ads",
    triggers: ["budget de ma campagne BCA Ads", "statut de ma campagne BCA Ads", "paiement de ma campagne publicitaire"],
    field: ["campaign_reference", "Quel est l’identifiant numérique exact de votre campagne BCA Ads ?"] },
  { operation: "ads_refund_status", name: "Remboursement d'une campagne BCA Ads",
    triggers: ["remboursement campagne BCA Ads", "campagne rejetée non remboursée"],
    field: ["campaign_reference", "Quelle est la référence de la campagne BCA Ads concernée ?"] },
  { operation: "ads_payout_status", name: "Rémunération d'une diffusion BCA Ads",
    triggers: ["paiement de ma diffusion BCA Ads", "rémunération publication BCA Ads", "gain de ma diffusion publicitaire"],
    field: ["publication_reference", "Quel est l’identifiant numérique exact de la journée de publication BCA Ads ?"] },
  { operation: "wallet_movement_status", name: "Détail d'un mouvement de solde",
    triggers: ["vérifier un mouvement de mon solde", "détail de ma transaction", "mon solde a diminué"],
    field: ["transaction_id", "Quelle est la référence du mouvement de solde à vérifier ?"] },
  { operation: "admin_adjustment_status", name: "Ajustement de solde administrateur",
    triggers: ["ajustement de mon solde", "correction administrateur de mon solde", "crédit administrateur de mon portefeuille"],
    field: ["transaction_id", "Quelle est la référence de l’ajustement de votre solde ?"] },
  { operation: "activity_reward_status", name: "Gains d'activité (raccordement à confirmer)",
    triggers: ["mon gain TikTok", "mon gain YouTube", "mon gain Facebook", "mon gain Trivia", "mon gain Spin"],
    field: ["activity_reference", "Quelle est l’activité et la référence du gain à vérifier ?"], enabled: false },
];

export function bcaIntents(): IntentDefinition[] {
  return catalog.map(template => {
    const result = "Statut : {statut}.\n{details_transaction}";
    // The settings schema allows at most 30 trigger phrases. Private BCA
    // questions are routed from the exact route tables before generic
    // trigger matching, so keep canonical triggers first and bound only the
    // supplemental aliases stored in this configuration.
    const triggers: string[] = [];
    const seen = new Set<string>();
    for (const trigger of [...template.triggers, ...(bcaNovemberPrivateAliases[template.operation] ?? [])]) {
      const normalized = normalizeQuestion(trigger);
      if (!normalized || seen.has(normalized) || triggers.length >= 30) continue;
      seen.add(normalized);
      triggers.push(trigger);
    }
    return {
      id: template.operation, backend_function: template.operation, name: template.name,
      enabled: template.enabled ?? true, triggers,
      initial_response: `Je peux proposer une consultation auprès de BCA : ${template.name}. Aucun paiement ni changement de solde ne sera effectué.`,
      confirmation_question: `Souhaitez-vous vérifier « ${template.name} » dans votre compte BCA ? Répondez par oui ou non.`,
      fields: template.field ? [{
        name: template.field[0], prompt: template.field[1], type: "text" as const, min_length: 1, max_length: 128,
      }] : [],
      guest_message: "Connectez-vous à votre compte BCA pour consulter vos données personnelles.",
      responses: {
        success: template.operation === "referral_code" ? "Votre code de parrainage est : {code_parrain}" : result,
        pending: result, error: result,
        not_found: "Aucune opération accessible à votre compte ne correspond aux informations fournies.",
      },
    };
  });
}

/** Upgrade only the untouched historical intent list; never reset authored or deleted rules. */
export function adaptBca(settings: AssistantSettings, legacy: AssistantSettings): AssistantSettings {
  if(JSON.stringify(settings.intents) === JSON.stringify(legacy.intents))return {...settings,intents:bcaIntents()};
  // Upgrade only verbatim old stock prompts. Authored triggers, fields, replies,
  // disabled/deleted intentions and personalized prompts remain authoritative.
  const stock:Record<string,string>={
    deposit_status:"Veuillez communiquer la référence du dépôt, du paiement ou le numéro utilisé. Si plusieurs dépôts correspondent, une référence précise sera nécessaire.",
    withdrawal_status:"Veuillez communiquer le numéro utilisé ou la référence de votre retrait.",
    referral_commission_status:"Quelle est la référence de la commission de parrainage à vérifier ?",
    leader_reward_status:"Pour quel mois et quelle année souhaitez-vous vérifier votre récompense leader ?",
    digital_purchase_status:"Quelle est la référence de votre achat Digital Store ?",
    digital_sale_status:"Quelle est la référence de la vente Digital Store à vérifier ?",
    digital_subscription_status:"Quelle est la référence du paiement de votre abonnement vendeur ?",
    refund_status:"Quelle est la référence de l’achat concerné par le remboursement ?",
    ads_campaign_status:"Quelle est la référence de votre campagne BCA Ads ?",
    ads_payout_status:"Quelle est la référence de votre diffusion ou journée de publication BCA Ads ?",
  };
  const templates=bcaIntents();
  return {...settings,intents:settings.intents.map(intent=>{
    const template=templates.find(item=>item.id===intent.id&&item.backend_function===intent.backend_function);
    if(!template||!stock[intent.id])return intent;
    return {...intent,fields:intent.fields.map(field=>{
      const replacement=template.fields.find(value=>value.name===field.name);
      return replacement&&field.prompt===stock[intent.id]?{...field,prompt:replacement.prompt}:field;
    })};
  })};
}
