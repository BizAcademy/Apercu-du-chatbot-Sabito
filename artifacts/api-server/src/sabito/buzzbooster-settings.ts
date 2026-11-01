import type { AssistantSettings, IntentDefinition } from "./assistant-settings";
import { isDeepStrictEqual } from "node:util";

export function isBuzzBooster(slug: string, name: string): boolean {
  return [slug, name].some(value => /^(sabito)?buzzbooster$/.test(value.toLowerCase().replace(/[^a-z0-9]/g, "")));
}

/** Historical four-rule catalog, retained only to recognize untouched saved configurations. */
export function legacyBuzzBoosterIntents(): IntentDefinition[] {
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

export function buzzBoosterIntents(): IntentDefinition[] {
  const base = legacyBuzzBoosterIntents();
  base[0].triggers.push("dépôt Mobile Money", "dépôt en cryptomonnaie");
  base[1].triggers.push("suivi de ma commande");
  base[1].fields[0].prompt="Veuillez communiquer le numéro de commande affiché dans votre historique de commandes, et non la référence du paiement.";
  base[1].responses.not_found="Aucune commande accessible à votre compte ne correspond à ce numéro de commande.";
  base[3].triggers.push("commission de parrainage");
  const guest_message = "Connectez-vous à votre compte Buzz Booster pour consulter vos informations personnelles.";
  const result = "Statut : {statut}.\n{details_transaction}";
  const additional = [
    {
      operation: "deposit_bonus_status", name: "Bonus de dépôt",
      triggers: ["bonus de dépôt", "bonus de dépôt non reçu", "vérifier mon bonus de dépôt", "bonus de dépôt en attente", "bonus de dépôt crypto"],
      initial: "L’attribution d’un bonus de dépôt dépend des conditions de Buzz Booster. Je peux proposer une consultation du bonus réellement enregistré, sans en attribuer un.",
      confirmation: "Souhaitez-vous vérifier le bonus associé à un dépôt ? Répondez par oui ou non.",
      field: { name: "deposit_number", prompt: "Quelle est la référence du dépôt dont vous souhaitez vérifier le bonus ?" },
    },
    {
      operation: "order_refund_status", name: "Remboursement total ou partiel d'une commande",
      triggers: ["remboursement de ma commande", "remboursement d'une commande", "commande annulée mais pas remboursée", "remboursement partiel de ma commande", "commande non remboursée"],
      initial: "L’annulation d’une commande ne prouve pas que son remboursement a déjà été crédité. Je peux proposer une consultation du montant et du statut réellement enregistrés.",
      confirmation: "Souhaitez-vous vérifier le remboursement d’une commande ? Répondez par oui ou non.",
      field: { name: "order_id", prompt: "Quel est le numéro de commande affiché dans votre historique pour la commande à rembourser ? Ne communiquez pas la référence du paiement." },
    },
    {
      operation: "referee_bonus_status", name: "Bonus reçu en tant que filleul",
      triggers: ["bonus du filleul", "mon bonus de filleul", "bonus du filleul non reçu", "vérifier mon bonus filleul", "bonus de bienvenue du filleul"],
      initial: "Le bonus du filleul dépend des conditions de parrainage de Buzz Booster. Je peux proposer une vérification de votre propre bonus sans consulter les données privées d’autres membres.",
      confirmation: "Souhaitez-vous consulter votre bonus en tant que filleul ? Répondez par oui ou non.",
    },
    {
      operation: "wallet_balance", name: "Soldes des portefeuilles local et USD",
      triggers: ["mon solde", "mon solde disponible", "consulter mes soldes", "mon solde USD", "solde de mon portefeuille"],
      initial: "Je peux proposer une consultation de vos soldes. Les portefeuilles et leurs devises restent séparés ; aucune conversion ni modification ne sera effectuée.",
      confirmation: "Souhaitez-vous consulter les soldes de vos portefeuilles ? Répondez par oui ou non.",
    },
    {
      operation: "wallet_movement_status", name: "Crédit ou débit d'un mouvement de solde",
      triggers: ["mon solde a diminué", "vérifier un mouvement de mon solde", "détail de ma transaction", "débit de ma commande"],
      initial: "Un mouvement peut correspondre à un dépôt, un achat, un remboursement, un bonus ou une commission. Je peux proposer une consultation de son origine réelle, sans modifier le solde.",
      confirmation: "Souhaitez-vous vérifier un mouvement de votre solde ? Répondez par oui ou non.",
      field: { name: "transaction_id", prompt: "Quelle est la référence du mouvement de solde à vérifier ?" },
    },
    {
      operation: "admin_adjustment_status", name: "Ajustement manuel du solde par l'administrateur",
      triggers: ["ajustement manuel du solde", "ajustement de mon solde", "correction administrateur de mon solde", "crédit administrateur de mon portefeuille", "débit administrateur de mon portefeuille"],
      initial: "Je peux proposer une consultation de l’ajustement enregistré et de son libellé autorisé. Aucune correction de solde ne sera exécutée et les notes internes ne seront pas divulguées.",
      confirmation: "Souhaitez-vous consulter un ajustement administrateur de votre solde ? Répondez par oui ou non.",
      field: { name: "transaction_id", prompt: "Quelle est la référence de l’ajustement de votre solde ?" },
    },
  ];
  return [...base, ...additional.map(template => ({
    id: template.operation, backend_function: template.operation,
    name: template.name, enabled: true, triggers: template.triggers,
    initial_response: template.initial, confirmation_question: template.confirmation,
    fields: template.field ? [{ ...template.field, type: template.field.name==="order_id" ? "identifier" as const : "text" as const, min_length: 1, max_length: 128 }] : [],
    guest_message,
    responses: { success: result, pending: result, error: result,
      not_found: "Aucune opération accessible à votre compte ne correspond aux informations fournies." },
  }))];
}

/** Read-time compatibility upgrade: never overwrites authored messages or custom rules. */
export function adaptBuzzBooster(settings: AssistantSettings, legacy: AssistantSettings): AssistantSettings {
  const defaults = buzzBoosterIntents();
  if (isDeepStrictEqual(settings.intents, legacyBuzzBoosterIntents())) {
    return { ...settings, intents: defaults };
  }
  const hadActivation = settings.intents.some(intent => intent.backend_function === "account_activation" && intent.enabled);
  const intents = settings.intents.flatMap(intent => {
    const old = legacy.intents.find(item => item.id === intent.id);
    if (intent.backend_function === "account_activation") {
      return old && isDeepStrictEqual(intent,old) ? [] : [{ ...intent, enabled: false }];
    }
    const replacement = defaults.find(item => item.backend_function === intent.backend_function);
    const chosen=hadActivation && old && replacement && isDeepStrictEqual(intent,old) ? replacement : intent;
    if(["order_status","order_refund_status"].includes(chosen.backend_function)) {
      return [{...chosen,fields:chosen.fields.map(field=>field.name==="order_id" && /r[ée]f[ée]rence|identifiant/i.test(field.prompt)
        && !/num[eé]ro de (?:votre |la )?commande/i.test(field.prompt)
        ? {...field,prompt:"Veuillez communiquer le numéro de commande affiché dans votre historique de commandes, et non la référence du paiement."}:field)}];
    }
    return [chosen];
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
