import type { IntentDefinition } from "@workspace/api-client-react";

/** Add only missing operations, preserving authored and disabled rules and unique ids. */
export function appendIntentTemplates(existing: IntentDefinition[], templates: IntentDefinition[]): IntentDefinition[] {
  const result = [...existing];
  for (const template of templates) {
    if (result.length >= 100 || result.some(item => item.backend_function === template.backend_function)) continue;
    let id = template.id;
    for (let suffix = 2; result.some(item => item.id === id); suffix++) id = `${template.id}_${suffix}`;
    result.push(structuredClone({ ...template, id }));
  }
  return result;
}

export function backendInstallationExample(intents: IntentDefinition[]): string {
  const operations = [...new Map(intents.filter(item => item.enabled).map(item => [item.backend_function, item])).values()];
  return `// EXEMPLE Node 21+ : serveur uniquement, jamais dans le navigateur.
// BCA Laravel : une commande PHP persistante peut utiliser le même protocole.
// Variables déjà configurées : SABITO_URL, SABITO_CLIENT_ID, SABITO_CLIENT_SECRET.
// Ne déployer que les handlers réellement raccordés et testés.
// Buzz Booster : order_number = numéro de commande, jamais référence de paiement.
// Dépôts : BUZZ_/BB- -> deposit_number ; PIM/POM -> transaction_id ; téléphone -> phone_number.
// Si une donnée est incorrecte : {status:"invalid_input",invalid_field:"order_number"}.
// Choisir invalid_field parmi les champs de la tâche ; Sabito le redemandera.
// not_found redemande le premier champ ; forbidden ne révèle aucune donnée.
import { startSabitoBackend } from "./sabito-backend.mjs";
const controller = new AbortController();
startSabitoBackend({
  signal: controller.signal,
  onError: (code) => console.warn("sabito", code),
  handlers: {
${operations.map(intent => `    // ${intent.name.replace(/[\r\n\u2028\u2029]/g, " ")}
    async ${intent.backend_function}(job) {
      // Membre vérifié : job.external_user_id ; champs : ${intent.fields.map(field => `job.fields.${field.name}`).join(", ") || "aucun"}.
      // Lecture seule : contrôle de propriété et des droits dans votre service réel.
      // Retour : { status: "confirmed", data: { statut: "libellé réel" } }
      ${intent.backend_function === "referral_code" ? '// Parrainage : { status: "ok", data: { code: "code réel" } }\n      ' : ""}throw new Error("Raccorder ${intent.backend_function} au service réel");
    },`).join("\n")}
  },
});
// Aucun handler ne doit créer un paiement, transfert, remboursement ou ajustement.
// Échec, absence ou refus : status "error", "not_found" ou "forbidden".
// data : objet plat, 32 champs maximum ; aucune donnée confidentielle.
// Poll : POST /v1/backend/jobs/poll, Basic, { operations: [...] }.
// Résultat : POST /v1/backend/jobs/:id/result, Basic, { result: { status, data } }.
// Le processus doit rester actif en production ; ne pas le lancer dans une route HTTP.`;
}
