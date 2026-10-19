import type { AssistantSettings, IntentDefinition } from "@workspace/api-client-react";

export const SNAKE = /^[a-z][a-z0-9_]{1,63}$/;
export const KNOWN_FUNCTIONS = ["account_activation", "deposit_status", "referral_code"];

export const MESSAGE_FIELDS: { key: keyof AssistantSettings; label: string; help: string; optional?: boolean }[] = [
  { key: "greeting_member", label: "Accueil d'un membre identifié", help: "Variable autorisée : {nom_utilisateur}, fournie par le serveur de la plateforme, jamais par le navigateur." },
  { key: "greeting_member_no_name", label: "Accueil d'un membre sans nom connu", help: "Utilisé si le profil ne renvoie aucun nom. Aucun nom n'est inventé." },
  { key: "greeting_guest", label: "Accueil d'un visiteur non connecté", help: "Visiteur du widget public, sans identité vérifiée." },
  { key: "no_answer_message", label: "Réponse quand aucune référence ne correspond", help: "Texte fixe affiché tel quel, aucun extrait n'est assemblé automatiquement." },
  { key: "closing_message", label: "Message de clôture", help: "Affiché sous les suggestions après chaque réponse. Peut rester vide.", optional: true },
  { key: "privacy_message", label: "Message de confidentialité", help: "Affiché avant de demander des informations de compte." },
  { key: "invalid_field_message", label: "Champ invalide", help: "Quand une information saisie ne respecte pas le format attendu." },
  { key: "cancelled_message", label: "Demande annulée", help: "Quand l'utilisateur interrompt une démarche." },
  { key: "checking_message", label: "Vérification en cours", help: "Pendant l'interrogation du serveur de la plateforme." },
  { key: "ticket_message", label: "Ticket de support créé", help: "Variable autorisée : {ticket_id}." },
];

export function validateIntent(it: IntentDefinition, all: IntentDefinition[]): string[] {
  const e: string[] = [];
  if (!SNAKE.test(it.id)) e.push("Identifiant : snake_case, 2 à 64 caractères, commence par une lettre.");
  if (all.filter((x) => x.id === it.id).length > 1) e.push(`Identifiant « ${it.id} » déjà utilisé.`);
  if (it.name.trim().length < 2 || it.name.length > 100) e.push("Nom : 2 à 100 caractères.");
  if (it.triggers.length < 1 || it.triggers.length > 30) e.push("Déclencheurs : 1 à 30 questions.");
  if (it.triggers.some((t) => t.trim().length < 2 || t.length > 500)) e.push("Chaque déclencheur : 2 à 500 caractères.");
  if ((it.initial_response?.length??0)>4000) e.push("Réponse initiale : 4000 caractères maximum.");
  if (it.confirmation_question!==undefined && (!it.confirmation_question.trim()||it.confirmation_question.length>4000))
    e.push("Question de confirmation : obligatoire, 4000 caractères maximum.");
  if (it.fields.length > 15) e.push("15 champs maximum.");
  const names = new Set<string>();
  it.fields.forEach((f, i) => {
    const n = `Champ ${i + 1}`;
    if (!SNAKE.test(f.name)) e.push(`${n} : nom en snake_case.`);
    if (names.has(f.name)) e.push(`${n} : nom « ${f.name} » en double.`);
    names.add(f.name);
    if (!f.prompt.trim() || f.prompt.length > 4000) e.push(`${n} : question à poser obligatoire.`);
    const okMin = Number.isInteger(f.min_length) && f.min_length >= 1 && f.min_length <= 500;
    const okMax = Number.isInteger(f.max_length) && f.max_length >= 1 && f.max_length <= 500;
    if (!okMin || !okMax) e.push(`${n} : longueurs entre 1 et 500.`);
    else if (f.min_length > f.max_length) e.push(`${n} : longueur min supérieure au max.`);
  });
  if (!SNAKE.test(it.backend_function)) e.push("Fonction serveur : identifiant snake_case (pas une URL ni du code).");
  if (!it.guest_message.trim() || it.guest_message.length > 4000) e.push("Message visiteur non vérifié : obligatoire, 4000 max.");
  (["success", "pending", "not_found", "error"] as const).forEach((k) => {
    const v = it.responses[k];
    if (!v.trim() || v.length > 4000) e.push(`Réponse « ${k} » : obligatoire, 4000 max.`);
  });
  return e;
}

export function validateSettings(s: AssistantSettings): string[] {
  const e: string[] = [];
  if (!(s.confidence_threshold >= 0.35 && s.confidence_threshold <= 1)) e.push("Seuil de confiance : entre 0,35 et 1.");
  if (s.synonyms.length > 100) e.push("100 groupes de synonymes maximum.");
  s.synonyms.forEach((g, i) => {
    if (g.length < 2 || g.length > 20) e.push(`Groupe de synonymes ${i + 1} : 2 à 20 termes.`);
    if (g.some((w) => w.trim().length < 2 || w.length > 80)) e.push(`Groupe de synonymes ${i + 1} : chaque terme fait 2 à 80 caractères.`);
  });
  MESSAGE_FIELDS.forEach((m) => {
    const v = s[m.key] as string;
    if (v.length > 4000) e.push(`${m.label} : 4000 caractères max.`);
    if (!m.optional && !v.trim()) e.push(`${m.label} : obligatoire.`);
  });
  if (s.intents.length > 100) e.push("100 intentions maximum.");
  s.intents.forEach((it) => validateIntent(it, s.intents).forEach((x) => e.push(`Intention « ${it.name || it.id} » — ${x}`)));
  return e;
}

export function settingsWarnings(s: AssistantSettings): string[] {
  const w: string[] = [];
  if (!s.greeting_member.includes("{nom_utilisateur}")) w.push("Accueil membre sans {nom_utilisateur} : le nom du membre ne sera pas affiché.");
  if (!s.ticket_message.includes("{ticket_id}")) w.push("Message de ticket sans {ticket_id} : le numéro du ticket ne sera pas communiqué.");
  return w;
}

export function blankIntent(existing: IntentDefinition[]): IntentDefinition {
  let n = existing.length + 1;
  while (existing.some((x) => x.id === `nouvelle_intention_${n}`)) n++;
  return {
    id: `nouvelle_intention_${n}`, name: "Nouvelle intention", enabled: false,
    triggers: ["Question type posée par un membre"], fields: [], backend_function: "",
    guest_message: "Connectez-vous à votre espace pour que je puisse vérifier cette information.",
    responses: { success: "", pending: "", not_found: "", error: "" },
  };
}

export function depositIntent(existing: IntentDefinition[]): IntentDefinition {
  const base=blankIntent(existing);
  const id=existing.some(i=>i.id==="deposit_status")?base.id:"deposit_status";
  const result="Statut de votre transaction : {statut}.\n{details_transaction}";
  return {
    ...base,id,name:"Vérification d'un dépôt",enabled:true,
    initial_response:"Si vous avez effectué un dépôt, son délai de réception dépend du moyen de paiement utilisé. Je peux proposer une vérification de son statut.",
    confirmation_question:"Avez-vous effectué un dépôt ? Répondez par oui ou non.",
    triggers:["dépôt non reçu","dépôt en attente","vérifier mon dépôt"],
    backend_function:"deposit_status",
    fields:[{name:"deposit_number",prompt:"Veuillez me communiquer le numéro utilisé pour effectuer le dépôt.",
      type:"text",min_length:1,max_length:100}],
    responses:{success:result,pending:result,error:result,
      not_found:"Aucune transaction accessible à votre compte ne correspond à ce numéro."},
  };
}

export function withdrawalIntent(existing: IntentDefinition[]): IntentDefinition {
  const base=depositIntent(existing);
  return {...base,id:existing.some(i=>i.id==="withdrawal_status")?blankIntent(existing).id:"withdrawal_status",
    name:"Vérification d'un retrait",backend_function:"withdrawal_status",
    triggers:["retrait","retrait non reçu","délai de retrait"],
    initial_response:"Si vous avez effectué un retrait, son délai de réception dépend du moyen de paiement utilisé. Je peux proposer une vérification de son statut.",
    confirmation_question:"Avez-vous effectué un retrait ? Répondez par oui ou non.",
    fields:[{name:"withdrawal_number",prompt:"Veuillez me communiquer le numéro utilisé pour effectuer le retrait.",
      type:"text",min_length:1,max_length:100}]};
}
