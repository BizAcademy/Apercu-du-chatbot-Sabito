import type { IntentDefinition } from "./assistant-settings";
import type { BackendResult } from "./backend-bridge";
import type { AccessClaims } from "./security";
import type { BackendObservation } from "./backend-context";
import { renderTemplate } from "./templates";
import { verifiedBcaResult } from "./bca-contract";
import { bcaSupportResultGuidance } from "./bca-support-questions";

/** Use the platform's configured field names literally, never Buzz aliases. */
export function bcaContinuationFields(definition:IntentDefinition,fields:Record<string,string>) {
  return Object.fromEntries(definition.fields.filter(field=>fields[field.name]!==undefined)
    .map(field=>[field.name,fields[field.name]]));
}
export function bcaBackendAnswer(definition:IntentDefinition|undefined,response:BackendResult|undefined,claims:AccessClaims):string|null {
  if(!definition||!response||!verifiedBcaResult(definition.backend_function,response))return null;
  const outcome:keyof IntentDefinition["responses"]=["ok","success","confirmed","active"].includes(response.status)?"success":
    ["pending","inactive"].includes(response.status)?"pending":"error";
  const data={...response.data,statut:response.data?.statut??response.status,
    details_transaction:Object.entries(response.data??{}).filter(([,value])=>value!==null)
      .map(([key,value])=>`${key} : ${String(value)}`).join("\n"),
    code_parrain:response.data?.code_parrain??response.data?.code??response.code,
    nom_utilisateur:claims.externalUserName??response.data?.nom_utilisateur};
  return renderTemplate(definition.responses[outcome],data)+bcaSupportResultGuidance(definition.backend_function,response.data??{});
}
export function explainBcaObservation(entry:BackendObservation,definition:IntentDefinition|undefined,claims:AccessClaims) {
  const answer=entry.stage==="observed"?bcaBackendAnswer(definition,entry.result,claims):null;
  if(!answer)return "La dernière consultation BCA n’a pas permis de vérifier ou de préciser cette opération. Aucun paiement, versement, crédit ou remboursement n’est confirmé. Vous pouvez demander une nouvelle vérification.";
  const distinction=entry.operation.startsWith("deposit_")
    ?"L’autorisation du paiement, la confirmation du prestataire, les frais éventuels et le crédit du portefeuille sont des éléments distincts. Une information absente ne signifie pas zéro ni un crédit effectué."
    :entry.operation.startsWith("withdrawal_")
      ?"La demande de retrait, le débit du portefeuille, le versement au bénéficiaire et un éventuel remboursement sont des états distincts. Un remboursement n’est confirmé que par les informations réellement enregistrées."
      :"Le statut de cette opération, les frais éventuels et ses mouvements de portefeuille doivent être distingués. Aucune information manquante ne permet de conclure à un paiement ou à un remboursement.";
  return `D’après la consultation BCA du ${new Date(entry.checkedAt).toISOString()} (aucune nouvelle consultation effectuée) :\n${answer}\n\n${distinction}\n\nSabito lit les données enregistrées dans BCA. Cette lecture ne prouve pas une nouvelle interrogation du prestataire. Je ne peux pas forcer une confirmation, un paiement, un crédit, une activation ou un remboursement.`;
}
