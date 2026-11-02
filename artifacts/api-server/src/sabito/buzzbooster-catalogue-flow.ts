import { createHash } from "node:crypto";
import { pool } from "./database";
import { deactivateBackendConversation } from "./backend-conversation";
import { requestBackend } from "./backend-bridge";
import type { AssistantSettings } from "./assistant-settings";
import type { AccessClaims } from "./security";
import { isVerifiedMember } from "./templates";
import { detectIntent } from "./question-search";
import { normalizeQuestion } from "./question-normalization";
import { buzzGuideFor } from "./buzzbooster-guides";
import { isClosingAcknowledgement } from "./conversation-closing";
import { catalogueAnswer,catalogueBackendFields,catalogueFields,catalogueGoal,catalogueNextPage,
  catalogueOperations,cataloguePrompts,invalidCatalogueField,parseCatalogueFields,type CatalogueFields } from "./buzzbooster-catalogue";

const hash=(text:string)=>createHash("sha256").update(text).digest("hex");
const isCatalogue=(operation:unknown)=>catalogueOperations.includes(operation as typeof catalogueOperations[number]);
/** Read-only conversation state shares the existing durable, tenant-owned session. */
export async function handleBuzzCatalogue(claims:AccessClaims,conversationId:string,text:string,settings:AssistantSettings):Promise<string|null> {
  const q=normalizeQuestion(text),parsed=parseCatalogueFields(text);
  if(buzzGuideFor(text)&&!parsed.network&&!parsed.quantity&&!parsed.budget_xaf&&
    !/\b(?:catalogue|offres disponibles|recommande|recommander|conseille|comparer|compare)\b/.test(q))return null;
  const enabled=settings.intents.filter(intent=>intent.enabled&&isCatalogue(intent.backend_function));
  const detected=detectIntent(text,settings);
  let definition=enabled.find(intent=>intent.id===detected);
  // Explicit needs may contain quantities between the configured trigger words.
  if(!definition&&!detected&&parsed.goal&&(/\b(?:je veux|je souhaite|recommande|conseille|compare|services? pour|offres? pour)\b/.test(q)||
    parsed.network&&parsed.quantity&&!/\b(?:mon|ma|mes|pas recu|non recu|pas arrive)\b/.test(q)))
    definition=enabled.find(intent=>intent.backend_function==="service_recommendations");
  const connection=await pool.connect();
  let fields:Record<string,string>={},operation="",intentId="";
  const save=async(status:string)=>connection.query(`INSERT INTO sabito_core.intent_sessions
    (conversation_id,project_id,intent,collected_json,status,original_question) VALUES ($1,$2,$3,$4,$5,$6)
    ON DUPLICATE KEY UPDATE intent=VALUES(intent),collected_json=VALUES(collected_json),status=VALUES(status),
    original_question=VALUES(original_question),updated_at=CURRENT_TIMESTAMP(6)`,
    [conversationId,claims.sub,intentId,JSON.stringify(fields),status,text]);
  try {
    await connection.query("BEGIN");
    const owner=await connection.query(`SELECT c.id,s.intent,s.collected_json,s.status,
      (s.updated_at < DATE_SUB(CURRENT_TIMESTAMP(6), INTERVAL 30 SECOND)) AS stale FROM sabito_core.conversations c
      LEFT JOIN sabito_core.intent_sessions s ON s.conversation_id=c.id AND s.project_id=c.project_id
      WHERE c.id=$1 AND c.project_id=$2 AND c.external_user_id=$3 FOR UPDATE`,[conversationId,claims.sub,claims.externalUserId]);
    const current=owner.rows[0];
    if(!current){await connection.query("COMMIT");return null;}
    const previous=enabled.find(intent=>intent.id===current.intent);
    let continuing=!!previous;
    if(previous&&current.status==="complete") {
      const stored=JSON.parse(String(current.collected_json??"{}"));
      const latest=await connection.query(`SELECT content FROM sabito_core.messages WHERE project_id=$1 AND conversation_id=$2
        AND role='assistant' AND status='completed' ORDER BY created_at DESC,id DESC LIMIT 1`,[claims.sub,conversationId]);
      continuing=!!stored.__answer_hash&&latest.rows[0]&&hash(String(latest.rows[0].content))===stored.__answer_hash;
    }
    const relevant=Object.keys(parsed).length>0||/^(?:page suivante|suivant|la suite|reessayer|recommencer|sans budget|sans quantite)$/.test(q);
    if(!definition&&(!continuing||detected&&detected!==previous?.id||current.status==="complete"&&!relevant||buzzGuideFor(text))) {
      await connection.query("COMMIT");return null;
    }
    definition??=previous;
    if(!definition){await connection.query("COMMIT");return null;}
    if(!isVerifiedMember(claims)){await connection.query("COMMIT");return definition.guest_message;}
    if(current.status==="checking"&&(!previous||Number(current.stale)!==1)) {await connection.query("COMMIT");return settings.checking_message;}
    if(!previous&&current.status==="collecting") {
      await connection.query("COMMIT");return "Terminez votre vérification en cours, ou écrivez « annuler », avant de consulter le catalogue.";
    }
    operation=definition.backend_function;intentId=definition.id;
    fields=continuing&&previous?.id===intentId?JSON.parse(String(current.collected_json??"{}")):{};
    if(/^(annuler|annule|stop)$/.test(q)||isClosingAcknowledgement(text)) {
      fields={};await save("complete");await connection.query("COMMIT");
      return /^(annuler|annule|stop)$/.test(q)?settings.cancelled_message:null;
    }
    if(fields.__needed==="currency") {
      // Never reinterpret an explicitly foreign amount as XAF.
      if(!parsed.foreignCurrency&&/\bxaf\b/.test(q)) {
        parsed.budget_xaf??=/\b(\d[\d ]*(?:[.,]\d+)?)\b/.exec(q)?.[1]?.replace(/\s/g,"").replace(",",".");
        delete fields.__foreign_currency;
      } else parsed.foreignCurrency=true;
    }
    if(fields.__needed&&fields.__needed!=="currency"&&!Object.keys(parsed).length) {
      const needed=fields.__needed;
      if(needed==="quantity"&&q==="sans quantite"&&!fields.budget_xaf)fields.__quantity_skipped="true";
      else if(needed==="budget_xaf"&&q==="sans budget")fields.__budget_skipped="true";
      else if(needed==="network"&&/^[\p{L}\p{N} .+-]{2,60}$/u.test(text.trim()))parsed.network=text.trim();
      else if(needed==="goal")parsed.goal=catalogueGoal(text);
      else if(catalogueFields.includes(needed as typeof catalogueFields[number]))parsed[needed as keyof CatalogueFields]=text.trim();
    }
    if(relevant&&!/page suivante|suivant|la suite/.test(q))delete fields.__next_page;
    for(const key of catalogueFields)if(parsed[key]!==undefined)fields[key]=parsed[key]!;
    if(parsed.foreignCurrency)fields.__foreign_currency="true";
    if(/^(page suivante|suivant|la suite)$/.test(q)) {
      if(!fields.__next_page){await connection.query("COMMIT");return "Le backend n’a pas indiqué de page suivante. Vous pouvez modifier vos critères.";}
      fields.page=fields.__next_page;
    } else if(Object.keys(parsed).some(key=>!["page","foreignCurrency"].includes(key)))fields.page="1";
    const publicFields=Object.fromEntries(Object.entries(fields).filter(([key])=>!key.startsWith("__"))) as CatalogueFields;
    const invalid=invalidCatalogueField(publicFields);
    // Quantity is necessary with a total budget, or when the backend explicitly
    // requests it. Neither quantity nor budget is required to browse/compare.
    const needed=fields.__foreign_currency?"currency":invalid??(!fields.network?"network":!fields.goal?"goal":undefined);
    if(needed) {
      if(needed!=="currency")delete fields[needed];
      fields.__needed=needed;await save("collecting");await connection.query("COMMIT");
      return cataloguePrompts[needed]??"Précisez les critères de votre recherche.";
    }
    delete fields.__needed;
    await save("checking");await connection.query("COMMIT");
  } catch(error){await connection.query("ROLLBACK");throw error;}
  finally{connection.release();}
  let answer:string,status="complete";
  try {
    const filters=catalogueBackendFields(fields);
    const result=await requestBackend(claims.sub,claims.externalUserId,operation,filters);
    if(result.status==="invalid_input"&&result.invalid_field&&catalogueFields.includes(result.invalid_field as typeof catalogueFields[number])) {
      delete fields[result.invalid_field];fields.__needed=result.invalid_field;
      status="collecting";answer=`Le backend demande de corriger ce critère. ${cataloguePrompts[result.invalid_field]}`;
    } else {
      answer=catalogueAnswer(result,filters,operation);
      const next=catalogueNextPage(result,Number(fields.page??1));
      if(next)fields.__next_page=String(next);else delete fields.__next_page;
    }
  } catch {
    delete fields.__next_page;
    answer="Je ne peux pas consulter le catalogue de façon fiable pour le moment. Aucune offre ni statistique n’a été inventée. Vous pouvez écrire « réessayer » ou consulter Nouvelle commande dans Buzz Booster.";
  }
  await deactivateBackendConversation(claims,conversationId);
  fields.__answer_hash=hash(answer);
  await pool.query(`UPDATE sabito_core.intent_sessions SET status=$1,collected_json=$2,updated_at=CURRENT_TIMESTAMP(6)
    WHERE conversation_id=$3 AND project_id=$4 AND intent=$5 AND status='checking'`,
    [status,JSON.stringify(fields),conversationId,claims.sub,intentId]);
  return answer;
}
