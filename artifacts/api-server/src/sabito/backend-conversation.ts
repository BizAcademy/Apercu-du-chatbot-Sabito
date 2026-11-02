import { pool } from "./database";
import type { AccessClaims } from "./security";
import { isVerifiedMember } from "./templates";
import { activeCredential } from "./projects";
import { requestBackend,type BackendResult } from "./backend-bridge";
import { searchState } from "./question-search";
import { buzzBackendFields,buzzResultAnswer } from "./buzzbooster-contract";
import { backendContinuation,continuationFields,explainBackendObservation,observationKey,parseBackendContext,
  rememberBackendObservation,type BackendContext,type BackendObservation } from "./backend-context";

const currentMember=(claims:AccessClaims)=>isVerifiedMember(claims)&&
  (claims.exp===undefined||claims.exp*1000>Date.now());
async function contextRow(claims:AccessClaims,conversationId:string) {
  if(!currentMember(claims))return null;
  const result=await pool.query(`SELECT s.backend_context_json,s.status,c.created_at
    FROM sabito_core.conversations c JOIN sabito_core.intent_sessions s
    ON s.conversation_id=c.id AND s.project_id=c.project_id
    WHERE c.id=$1 AND c.project_id=$2 AND c.external_user_id=$3
    AND c.created_at > CURRENT_TIMESTAMP(6) - INTERVAL 24 HOUR`,
    [conversationId,claims.sub,claims.externalUserId]);
  return result.rows[0]??null;
}
async function save(claims:AccessClaims,conversationId:string,context:BackendContext) {
  await pool.query(`UPDATE sabito_core.intent_sessions s JOIN sabito_core.conversations c
    ON c.id=s.conversation_id AND c.project_id=s.project_id SET s.backend_context_json=$1
    WHERE s.conversation_id=$2 AND s.project_id=$3 AND c.external_user_id=$4`,
    [JSON.stringify(context),conversationId,claims.sub,claims.externalUserId]);
}
export async function rememberBackendResult(claims:AccessClaims,conversationId:string,operation:string,
  fields:Record<string,string>,result:BackendResult|undefined,question:string) {
  const row=await contextRow(claims,conversationId);
  if(!row)return;
  // Forbidden/not-found payloads must never become a private-data explanation.
  const safe=result&&!["forbidden","not_found","invalid_input","error"].includes(result.status)?result:undefined;
  const previous=parseBackendContext(row.backend_context_json,claims.externalUserId);
  const entry:BackendObservation={operation,fields:{...fields},result:safe,question,
    checkedAt:new Date().toISOString(),stage:safe?"observed":"unavailable"};
  await save(claims,conversationId,rememberBackendObservation(previous,claims.externalUserId,entry));
}
export async function deactivateBackendConversation(claims:AccessClaims,conversationId:string) {
  const row=await contextRow(claims,conversationId);
  const context=row&&parseBackendContext(row.backend_context_json,claims.externalUserId);
  if(context?.active) {
    context.active=false;delete context.awaiting;delete context.selected;
    await save(claims,conversationId,context);
  }
}
export async function continueBackendConversation(claims:AccessClaims,conversationId:string,text:string):Promise<string|null> {
  if(!currentMember(claims)||(await searchState(claims.sub)).profile!=="buzzbooster")return null;
  const row=await contextRow(claims,conversationId);
  if(!row||row.status!=="complete")return null; // Never consume field collection or consent.
  const context=parseBackendContext(row.backend_context_json,claims.externalUserId);
  const plan=backendContinuation(text,context);
  if(!context||plan.kind==="none")return null;
  if(plan.kind==="change") {context.active=false;delete context.awaiting;await save(claims,conversationId,context);return null;}
  if(!await activeCredential(claims.sub,claims.clientId))return "Reconnectez-vous à votre compte pour reprendre cette vérification.";
  if(plan.kind==="clarify") {
    context.awaiting={operation:plan.operation,mode:plan.mode};
    await save(claims,conversationId,context);
    const references=[...new Set(plan.candidates.flatMap(entry=>Object.values(entry.fields)))].join(", ");
    return `Plusieurs opérations sont possibles. Quel dépôt, numéro de commande ou mouvement souhaitez-vous reprendre ?${references?` Références déjà fournies : ${references}.`:""} Je ne choisis pas automatiquement la plus récente.`;
  }
  if(context.awaiting)context.selected=observationKey(plan.observation);
  delete context.awaiting;
  await save(claims,conversationId,context);
  if(plan.kind==="explain"||plan.kind==="action") {
    let answer=explainBackendObservation(plan.observation,text);
    // Only this explicitly approved reference can provide operator-specific
    // steps. User quotations cannot install or replace approved instructions.
    if(plan.kind==="action"&&plan.observation.operation.startsWith("deposit_")) {
      const approved=await pool.query(`SELECT content FROM sabito_core.knowledge_documents
        WHERE project_id=$1 AND status='ready' AND title=$2 LIMIT 1`,
        [claims.sub,"Buzz Booster — Autoriser et vérifier un paiement Mobile Money"]);
      const method=String(plan.observation.result?.data?.moyen_paiement??plan.observation.fields.payment_method??"");
      if(approved.rows[0]&&/\b(?:mobile money|momo|mtn|orange|wave|moov|airtel)\b/i.test(method)&&
        !/crypto|usdt|bitcoin|tron|btc|eth/i.test(method))answer+=`\n\n${approved.rows[0].content}`;
      else answer+="\n\nJe n’ai pas de procédure approuvée adaptée à ce moyen de paiement. Consultez les instructions affichées lors de votre dépôt ou contactez Support.";
    }
    return answer;
  }
  const {settings}=await searchState(claims.sub);
  if(!settings.intents.some(intent=>intent.enabled&&intent.backend_function===plan.operation))
    return "Cette consultation n’est pas activée pour cette plateforme. Aucun contrôle supplémentaire n’a été effectué.";
  let fields:Record<string,string>;
  try {fields=buzzBackendFields(plan.operation,continuationFields(plan.operation,plan.observation.fields));}
  catch {return "Les informations conservées ne permettent pas cette consultation. Précisez le numéro de l’opération à vérifier.";}
  // A change of operation cannot turn an unrelated field into a reference.
  if(plan.operation.startsWith("deposit_")&&!["deposit_number","transaction_id","phone_number"].some(key=>fields[key])||
    plan.operation.startsWith("order_")&&!fields.order_number||
    ["wallet_movement_status","admin_adjustment_status"].includes(plan.operation)&&!fields.movement_number)
    return "Précisez le numéro de l’opération à vérifier ; aucune référence compatible n’est disponible.";
  try {
    const result=await requestBackend(claims.sub,claims.externalUserId,plan.operation,fields);
    if(!currentMember(claims)||!await activeCredential(claims.sub,claims.clientId))
      return "La session a expiré. Reconnectez-vous avant de reprendre la vérification.";
    await rememberBackendResult(claims,conversationId,plan.operation,fields,result,text);
    const answer=buzzResultAnswer(plan.operation,result);
    if(answer)return answer;
    if(["not_found","invalid_input"].includes(result.status)) {
      const definition=settings.intents.find(intent=>intent.enabled&&intent.backend_function===plan.operation)!;
      const first=definition.fields.find(field=>field.name===result.invalid_field)??definition.fields[0];
      if(first) {
        const retained={...fields};
        delete retained[first.name];
        // Return to the existing field-collection state, not a second engine.
        if(["transaction_id","phone_number"].some(name=>name in retained)) {
          delete retained.transaction_id;delete retained.phone_number;delete retained.deposit_number;
        }
        await pool.query(`UPDATE sabito_core.intent_sessions SET intent=$1,collected_json=$2,status='collecting',
          original_question=$3,updated_at=CURRENT_TIMESTAMP(6) WHERE conversation_id=$4 AND project_id=$5`,
          [definition.id,JSON.stringify(retained),text,conversationId,claims.sub]);
        return `La nouvelle consultation n’a pas retrouvé une opération accessible avec ces informations. Renvoyez l’information pour continuer : ${first.prompt}`;
      }
    }
    return "La nouvelle consultation n’a pas permis de vérifier cette opération. Aucun ancien résultat n’est présenté comme actuel. Vérifiez les informations ou contactez Support.";
  }catch {
    await rememberBackendResult(claims,conversationId,plan.operation,fields,undefined,text);
    return "La nouvelle consultation n’a pas abouti : le backend est indisponible ou n’a pas répondu. Le statut actuel n’est pas vérifié ; cela ne confirme ni un échec financier, ni un crédit. Vous pouvez réessayer.";
  }
}
