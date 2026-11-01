import type { AssistantSettings, IntentDefinition } from "./assistant-settings";

export function isBuzzBooster(slug: string, name: string): boolean {
  return [slug, name].some(value => /^(sabito)?buzzbooster$/.test(value.toLowerCase().replace(/[^a-z0-9]/g, "")));
}

export function buzzBoosterIntents(): IntentDefinition[] {
  const guest_message = "Connectez-vous à votre compte Buzz Booster pour consulter vos informations personnelles.";
  const result = "Statut : {statut}.\n{details_transaction}";
  const responses = {
    success: result, pending: result, error: result,
    not_found: "Aucune opération accessible à votre compte ne correspond à cette référence.",
  };
  return [
    {
      id: "deposit_status", name: "Suivi d'un dépôt", enabled: true, backend_function: "deposit_status",
      triggers: ["dépôt non reçu", "dépôt en attente", "vérifier mon dépôt", "recharge non reçue", "dépôt crypto"],
      initial_response: "La réception d’un dépôt dépend du moyen de paiement et de sa confirmation. Je peux vous proposer une vérification.",
      confirmation_question: "Avez-vous effectué un dépôt à vérifier ? Répondez par oui ou non.",
      fields: [{ name: "deposit_number", prompt: "Veuillez communiquer la référence du dépôt ou du paiement à vérifier.", type: "text", min_length: 1, max_length: 128 }],
      guest_message, responses: { ...responses },
    },
    {
      id: "order_status", name: "Suivi d'une commande de boost", enabled: true, backend_function: "order_status",
      triggers: ["suivre ma commande", "statut de ma commande", "commande en attente", "commande non reçue", "boost non reçu", "où est ma commande"],
      initial_response: "L’avancement d’une commande dépend du service de boost choisi. Je peux vous proposer une vérification de son statut, sans garantir de délai.",
      confirmation_question: "Avez-vous passé une commande de boost à vérifier ? Répondez par oui ou non.",
      fields: [{ name: "order_id", prompt: "Veuillez communiquer le numéro de votre commande de boost.", type: "identifier", min_length: 1, max_length: 128 }],
      guest_message, responses: { ...responses },
    },
    {
      id: "referral_code", name: "Code de parrainage", enabled: true, backend_function: "referral_code",
      triggers: ["mon code parrain", "code de parrainage", "mon lien de parrainage"],
      initial_response: "Vous pouvez partager votre code de parrainage selon les conditions de Buzz Booster.",
      confirmation_question: "Souhaitez-vous consulter votre code de parrainage ? Répondez par oui ou non.",
      fields: [], guest_message,
      responses: { ...responses, success: "Votre code de parrainage est : {code_parrain}" },
    },
    {
      id: "referral_reward_status", name: "Suivi d'une commission de parrainage", enabled: true, backend_function: "referral_reward_status",
      triggers: ["commission de parrainage non reçue", "vérifier ma commission de parrainage", "récompense de parrainage en attente"],
      initial_response: "Les commissions dépendent des conditions de parrainage de Buzz Booster. Je peux vous proposer une vérification de votre récompense.",
      confirmation_question: "Souhaitez-vous vérifier une commission de parrainage ? Répondez par oui ou non.",
      fields: [{ name: "reward_reference", prompt: "Quelle est la référence de la commission de parrainage à vérifier ?", type: "identifier", min_length: 1, max_length: 128 }],
      guest_message, responses: { ...responses },
    },
  ];
}

/** Read-time compatibility upgrade: never overwrites authored messages or custom rules. */
export function adaptBuzzBooster(settings: AssistantSettings, legacy: AssistantSettings): AssistantSettings {
  const defaults = buzzBoosterIntents();
  const hadActivation = settings.intents.some(intent => intent.backend_function === "account_activation" && intent.enabled);
  const intents = settings.intents.flatMap(intent => {
    const old = legacy.intents.find(item => item.id === intent.id);
    if (intent.backend_function === "account_activation") {
      return old && JSON.stringify(intent) === JSON.stringify(old) ? [] : [{ ...intent, enabled: false }];
    }
    const replacement = defaults.find(item => item.backend_function === intent.backend_function);
    return [hadActivation && old && replacement && JSON.stringify(intent) === JSON.stringify(old) ? replacement : intent];
  });
  if (hadActivation) {
    for (const template of defaults) {
      if (!intents.some(intent => intent.backend_function === template.backend_function)) {
        let id = template.id;
        for (let suffix = 2; intents.some(intent => intent.id === id); suffix++) id = `${template.id}_${suffix}`;
        if (intents.length < 100) intents.push({ ...template, id });
      }
    }
  }
  return { ...settings, intents };
}
