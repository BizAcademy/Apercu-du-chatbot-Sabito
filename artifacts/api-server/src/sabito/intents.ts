import { randomUUID } from "node:crypto";
import { pool } from "./database";
import { bcaOwnerResultGuidance } from "./bca-owner-answers";
import { bcaSupportResultGuidance } from "./bca-support-questions";
import { requestBackend, type BackendOperation, type BackendResult } from "./backend-bridge";
import type { AccessClaims } from "./security";
import { normalizeQuestion, recordUnanswered } from "./unanswered";
import { searchState,detectIntent,retrieveReply } from "./question-search";
import { isVerifiedMember,renderTemplate } from "./templates";
import type { IntentDefinition } from "./assistant-settings";
import { conversationClosing,isClosingAcknowledgement } from "./conversation-closing";
import { opaqueConversationInput } from "./conversation-input";
import { greetingReply } from "./greeting-reply";
import { buzzGuideFor } from "./buzzbooster-guides";
import { isBcaHelpQuestion } from "./bca-knowledge-install";
import { buzzBackendFields,buzzDepositIdentifier,buzzResultAnswer,optionalBuzzField,buzzOperations } from "./buzzbooster-contract";
import { handleBuzzCatalogue } from "./buzzbooster-catalogue-flow";
import { directBuzzOrders } from "./buzzbooster-order-flow";
import { explicitOrderRead,orderContext } from "./buzzbooster-orders";
import { continueBackendConversation,rememberBackendResult } from "./backend-conversation";
import { verifiedBcaResult } from "./bca-contract";
import { logger } from "../lib/logger";
export { isVerifiedMember } from "./templates";
function validField(field:IntentDefinition["fields"][number],value:string) {
  return value.length>=field.min_length && value.length<=field.max_length &&
    (field.type==="text" || (field.type==="identifier" ? /^[\p{L}\p{N}._/-]+$/u.test(value) : /^[\p{L} .'-]+$/u.test(value)));
}
function collectedValue(field:IntentDefinition["fields"][number],text:string) {
  const value=text.trim();
  if(field.type!=="identifier" && !/(?:_id|_number|_reference)$/.test(field.name))return value;
  // Only unwrap explicit correction/identifier labels. Never normalize the value:
  // leading zeros, case and punctuation may be part of the actual order number.
  const labeled=/^(?:(?:pardon|désolé|desole|correction)[,:\s]+)?(?:(?:le bon|la bonne|mon|ma|le|la|voici le|voici la)\s+)?(?:numéro|numero|référence|reference|identifiant|id)(?:\s+(?:de (?:ma |la )?commande|du dépôt|du depot|du retrait))?\s*(?:est|c['’]est|:|=|n[°ºo])?\s*#?([\p{L}\p{N}._/-]+)\s*$/iu.exec(value);
  const corrected=/^(?:pardon|désolé|desole|correction|c['’]est|voici)\s*[:,]?\s+#?([\p{L}\p{N}._/-]+)$/iu.exec(value);
  return labeled?.[1]??corrected?.[1]??(["order_id","order_number"].includes(field.name)?value.replace(/^#(?=[\p{L}\p{N}])/u,""):value);
}
async function ticket(projectId:string,conversationId:string,claims:AccessClaims,intent:BackendOperation,reason:string,
  executor:Pick<typeof pool,"query">=pool) {
  await executor.query(`INSERT INTO sabito_core.support_tickets
    (id,project_id,conversation_id,external_user_id,intent,reason) VALUES ($1,$2,$3,$4,$5,$6)
    ON DUPLICATE KEY UPDATE status='ouvert',reason=VALUES(reason),updated_at=CURRENT_TIMESTAMP(6)`,
    [randomUUID(),projectId,conversationId,isVerifiedMember(claims)?claims.externalUserId:null,intent,reason]);
  const result=await executor.query("SELECT id FROM sabito_core.support_tickets WHERE project_id=$1 AND conversation_id=$2 AND intent=$3",
    [projectId,conversationId,intent]);
  return String(result.rows[0].id);
}
export async function handleIntent(claims:AccessClaims, conversationId:string, text:string,continuationChecked=false):Promise<string|null> {
  // A social greeting is never a transaction number, confirmation or backend trigger.
  // Leave any in-progress verification intact.
  if(greetingReply(text)) return null;
  const normalized=normalizeQuestion(text);
  const {settings,profile}=await searchState(claims.sub);
  const buzz=profile==="buzzbooster",guide=buzz?buzzGuideFor(text):undefined;
  if((buzz||profile==="bca")&&!continuationChecked) {
    const continuation=await continueBackendConversation(claims,conversationId,text);
    if(continuation!==null)return continuation;
  }
  if(buzz) {
    const orders=await directBuzzOrders(claims,conversationId,text,settings,
      ()=>ticket(claims.sub,conversationId,claims,"order_status","BACKEND_UNAVAILABLE"));
    if(orders!==null)return orders;
    const catalogue=await handleBuzzCatalogue(claims,conversationId,text,settings);
    if(catalogue!==null)return catalogue;
  }
  // Public BCA instructions use approved references, not member lookups.
  // Do not clear an interrupted collection while answering a how-to question.
  if(profile==="bca" && isBcaHelpQuestion(text) && (await retrieveReply(claims.sub,text)).reliable)
    return null;
  const refundQuestion=guide?.key==="refunds" && /ticket.*ferm/i.test(normalized);
  // General approved instructions are public, not requests to inspect an account.
  // Keep an interrupted collection intact while answering a general question.
  if(guide&&!refundQuestion)return null;
  const intentRegistry=Object.fromEntries(settings.intents.filter(d=>d.enabled).map(d=>[d.id,{
    ...d,backendOperation:d.backend_function,
    required:d.fields.map(f=>({...f,valid:(s:string)=>validField(f,s)})),
  }]));
  let detected=refundQuestion?settings.intents.find(intent=>intent.enabled&&intent.backend_function==="order_refund_status")?.id:detectIntent(text,settings);
  // A format alone is not evidence that a reference belongs to a deposit.
  // Awaited references still use collectedValue below with their exact spelling.
  const suppliedDeposit=buzz&&!opaqueConversationInput(text)?buzzDepositIdentifier(text):undefined;
  if(!detected) {
    const owner=await pool.query(`SELECT c.id,s.status FROM sabito_core.conversations c LEFT JOIN sabito_core.intent_sessions s
      ON s.conversation_id=c.id AND s.project_id=c.project_id WHERE c.id=$1 AND c.project_id=$2 AND c.external_user_id=$3`,
      [conversationId,claims.sub,claims.externalUserId]);
    if(!owner.rows.length)throw new Error("CONVERSATION_NOT_FOUND");
    if(!suppliedDeposit&&!["collecting","checking"].includes(String(owner.rows[0].status)))return null;
  }
  const connection=await pool.connect();
  let intent:BackendOperation,fields:Record<string,string>,originalQuestion=text;
  try {
    await connection.query("BEGIN");
    const owner=await connection.query("SELECT id FROM sabito_core.conversations WHERE id=$1 AND project_id=$2 AND external_user_id=$3 FOR UPDATE",
      [conversationId,claims.sub,claims.externalUserId]);
    if(!owner.rows.length) throw new Error("CONVERSATION_NOT_FOUND");
    const {rows}=await connection.query(`SELECT intent,original_question,collected_json,status,
      (updated_at < CURRENT_TIMESTAMP(6) - INTERVAL 30 SECOND) AS stale FROM sabito_core.intent_sessions
      WHERE conversation_id=$1 AND project_id=$2 FOR UPDATE`,[conversationId,claims.sub]);
    const current=rows[0];
    if(isClosingAcknowledgement(text)) {
      // Do not collect "ok" as a transaction identifier or start a backend verification.
      if(current?.status==="collecting") {
        await connection.query("UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}' WHERE conversation_id=$1 AND project_id=$2",
          [conversationId,claims.sub]);
      }
      await connection.query("COMMIT");
      return conversationClosing;
    }
    if (current?.status==="checking") {
      if (Number(current.stale)===1) {
        const id=await ticket(claims.sub,conversationId,claims,current.intent as BackendOperation,"BACKEND_INTERRUPTED",connection);
        await recordUnanswered(claims.sub,String(current.original_question),isVerifiedMember(claims)?claims.externalUserId:undefined,connection);
        await connection.query("UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}' WHERE conversation_id=$1",[conversationId]);
        await connection.query("COMMIT");
        return renderTemplate(settings.ticket_message,{ticket_id:id})??settings.no_answer_message;
      }
      await connection.query("COMMIT");return settings.checking_message;
    }
    if ((/^(annuler|annule|stop|abandonner)$/.test(normalized)||
      buzz&&intentRegistry[current?.intent]?.backendOperation==="order_status"&&/^(non|non merci)$/.test(normalized)) && current?.status==="collecting") {
      await connection.query("UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}' WHERE conversation_id=$1",[conversationId]);
      await connection.query("COMMIT");return settings.cancelled_message;
    }
    if(suppliedDeposit&&!detected&&current?.status!=="collecting")detected=settings.intents.find(intent=>intent.enabled&&intent.backend_function==="deposit_status")?.id;
    if(buzz&&current?.status==="collecting"&&intentRegistry[current.intent]) {
      const retained=JSON.parse(String(current.collected_json)) as Record<string,string>;
      for(const name of (retained.__requested_field??"").split(",").filter(Boolean)) {
        const optional=optionalBuzzField(intentRegistry[current.intent].backendOperation,name);
        if(optional&&!intentRegistry[current.intent].required.some(field=>field.name===optional.name))
          intentRegistry[current.intent].required.push({...optional,valid:(value:string)=>validField(optional,value)});
      }
    }
    if(current?.status==="collecting" && intentRegistry[current.intent]) {
      const retained=JSON.parse(String(current.collected_json)) as Record<string,string>;
      if(retained.__awaiting_confirmation!=="true") {
        const missing=intentRegistry[current.intent].required.find(field=>!retained[field.name]);
        if(missing) {
          const value=collectedValue(missing,text);
          // A clearly supplied correction belongs to the current check, even if
          // its label contains the keyword of a different configured intent.
          if(missing.valid(value) && (value!==text.trim() || /^(?=.*\d)[\p{L}\p{N}._/-]+$/u.test(value))) detected=undefined;
        }
      }
    }
    if (!detected && current?.status!=="collecting") {await connection.query("COMMIT");return null;}
    intent=detected ?? current.intent as BackendOperation;
    if (!Object.hasOwn(intentRegistry,intent)) {
      await connection.query("UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}' WHERE conversation_id=$1",[conversationId]);
      await connection.query("COMMIT");return null;
    }
    fields=(!detected || (detected===current?.intent && current.status==="collecting")) && current
      ? JSON.parse(String(current.collected_json)) : {};
    if(current?.status==="collecting" && (!detected || detected===current.intent)) originalQuestion=String(current.original_question);
    const definition=intentRegistry[intent];
    if(profile==="bca"&&!isVerifiedMember(claims)) {
      await connection.query("COMMIT");
      return definition.guest_message;
    }
    if(buzz&&!buzzOperations.includes(definition.backendOperation)) {
      await connection.query("COMMIT");return "Cette consultation n’est pas proposée par le connecteur Buzz Booster. Consultez Support pour connaître les possibilités disponibles.";
    }
    const confirmationQuestion=definition.confirmation_question ??
      `Souhaitez-vous lancer la vérification « ${definition.name} » ? Répondez par oui ou non.`;
    // Reserved marker cannot collide with configurable field names (which must
    // start with a letter). Persist in the existing collecting state, so a
    // restart does not lose the confirmation or require an ENUM migration.
    let justConfirmed=false;
    if(fields.__awaiting_confirmation==="true") {
      if(/^(non|non merci|pas encore|pas du tout)$/.test(normalized)) {
        await connection.query("UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}' WHERE conversation_id=$1 AND project_id=$2",
          [conversationId,claims.sub]);
        await connection.query("COMMIT");return settings.cancelled_message;
      }
      const yes=/^(oui|ouais|yes|bien sur|tout a fait|d accord|oui merci|oui s il vous plait|oui c est le cas|oui j ai (?:effectue|fait) (?:un|le|mon) (?:retrait|depot))$/.test(normalized);
      if(!yes) {
        await connection.query("COMMIT");
        return `Merci de répondre par oui ou non. ${confirmationQuestion}`;
      }
      delete fields.__awaiting_confirmation;
      justConfirmed=true;
    } else if(!current || current.status!=="collecting" || current.intent!==intent) {
      const explicitPersonal=buzz&&((/[?？]/.test(text)&&/\b(mon|ma|mes)\b/.test(normalized)) ||
        /^(mon|ma|mes)\b.*(?:pas arrive|non recu|pas recu|non credite|partiel)/.test(normalized) || !!suppliedDeposit);
      const explicitOrder=buzz&&definition.backendOperation==="order_status"&&explicitOrderRead(text);
      if((explicitPersonal||explicitOrder)&&!refundQuestion) {
        if(!isVerifiedMember(claims)) {await connection.query("COMMIT");return definition.guest_message;}
        justConfirmed=true;
        if(suppliedDeposit&&definition.backendOperation==="deposit_status"&&definition.required.some(field=>field.name==="deposit_number"))
          fields.deposit_number=text.trim();
      } else {
      const reply=await retrieveReply(claims.sub,text);
      const initial=reply.reliable?reply.answer:(definition.initial_response?.trim()||settings.no_answer_message);
      await connection.query(`INSERT INTO sabito_core.intent_sessions (conversation_id,project_id,intent,collected_json,status,original_question)
        VALUES ($1,$2,$3,$4,'collecting',$5) ON DUPLICATE KEY UPDATE intent=VALUES(intent),collected_json=VALUES(collected_json),
        original_question=VALUES(original_question),status='collecting',updated_at=CURRENT_TIMESTAMP(6)`,
        [conversationId,claims.sub,intent,JSON.stringify({__awaiting_confirmation:"true"}),text]);
      await connection.query("COMMIT");
      return `${initial}\n\n${confirmationQuestion}`;
      }
    }
    for(const name of Object.keys(fields)) {
      if(buzz&&name==="__requested_field")continue;
      const field=definition.required.find(f=>f.name===name);
      if(!field||!field.valid(fields[name]))delete fields[name];
    }
    if (!isVerifiedMember(claims)) {
      const guide=renderTemplate(definition.guest_message,{})??settings.no_answer_message;
      await connection.query("UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}' WHERE conversation_id=$1 AND project_id=$2",
        [conversationId,claims.sub]);
      await connection.query("COMMIT");return guide;
    }
    const missing=definition.required.find(field=>!fields[field.name]);
    if(buzz&&definition.backendOperation==="order_status"&&missing&&/^(oui|yes|ouais)$/.test(normalized)) {
      await connection.query("COMMIT");return missing.prompt;
    }
    if (missing && !detected && !justConfirmed) {
      const value=collectedValue(missing,text);
      if(buzz&&["deposit_status","deposit_bonus_status"].includes(definition.backendOperation)&&missing.name==="deposit_number"&&/^\d{7,15}$/.test(value)) {
        await connection.query("COMMIT");
        return "S’agit-il du numéro de téléphone ou de la référence du dépôt ? Pour éviter une confusion, renvoyez « téléphone : votre numéro » ou « dépôt : votre référence ». Aucun code secret n’est nécessaire.";
      }
      if (!missing.valid(value)) {await connection.query("COMMIT");return `${settings.invalid_field_message} ${missing.prompt} ${settings.privacy_message}`;}
      fields[missing.name]=value;
    }
    const next=definition.required.find(field=>!fields[field.name]);
    await connection.query(`INSERT INTO sabito_core.intent_sessions (conversation_id,project_id,intent,collected_json,status,original_question)
      VALUES ($1,$2,$3,$4,$5,$6) ON DUPLICATE KEY UPDATE intent=VALUES(intent),collected_json=VALUES(collected_json),
      original_question=VALUES(original_question),
      status=VALUES(status),updated_at=CURRENT_TIMESTAMP(6)`,
      [conversationId,claims.sub,intent,JSON.stringify(fields),next?"collecting":"checking",originalQuestion]);
    await connection.query("COMMIT");
    if (next) return `${next.prompt} ${settings.privacy_message}`;
  } catch(error) {await connection.query("ROLLBACK");throw error;}
  finally {connection.release();}
  let reason="BACKEND_UNAVAILABLE",failureTemplate="",retrySaved=false,orderReply:string|undefined;
  try {
    if (!isVerifiedMember(claims)) {reason="MEMBER_AUTH_REQUIRED";throw new Error(reason);}
    const definition=intentRegistry[intent!];
    const exactFields=buzz?buzzBackendFields(definition.backendOperation,fields!):fields!;
    const response=await requestBackend(claims.sub,claims.externalUserId,definition.backendOperation,exactFields);
    if(buzz||profile==="bca")await rememberBackendResult(claims,conversationId,definition.backendOperation,exactFields,response,originalQuestion);
    if(profile==="bca"&&response.status==="forbidden") {
      reason="BACKEND_FORBIDDEN";
      throw new Error(reason);
    }
    if(buzz&&response.status==="forbidden")return "Je ne suis pas autorisé à consulter cette opération. Reconnectez-vous à votre compte ou contactez Support. Aucune information sur une opération d’un autre membre ne peut être divulguée.";
    const ambiguous=buzz&&response.status!=="error"&&(response.data?.ambiguous===true||typeof response.data?.match_count==="number"&&response.data.match_count>1);
    if(ambiguous) {
      response.status="invalid_input";
      response.invalid_field=definition.required[0]?.name??optionalBuzzField(definition.backendOperation)?.name;
    }
    const optional=buzz?optionalBuzzField(definition.backendOperation,response.status==="invalid_input"?response.invalid_field:undefined):undefined;
    if(["not_found","forbidden","invalid_input"].includes(response.status) && (definition.required.length||optional)) {
      const invalidName=buzz&&["deposit_status","deposit_bonus_status"].includes(definition.backendOperation)
        &&["transaction_id","phone_number"].includes(response.invalid_field??"")?"deposit_number":response.invalid_field;
      const field=response.status==="invalid_input" && invalidName
        ? definition.required.find(field=>field.name===invalidName)??(optional?.name===invalidName?optional:undefined) : definition.required[0]??optional;
      if(!field)throw new Error("BACKEND_UNVERIFIED_RESULT");
      const retained={...fields!};
      delete retained[field.name];
      if(optional?.name===field.name)retained.__requested_field=[...new Set([...(retained.__requested_field??"").split(",").filter(Boolean),field.name])].join(",");
      // Persist before replying: subsequent messages/reconnects reuse this intent
      // and the other valid fields, without another confirmation or a support ticket.
      await pool.query(`UPDATE sabito_core.intent_sessions SET status='collecting',collected_json=$1,updated_at=CURRENT_TIMESTAMP(6)
        WHERE conversation_id=$2 AND project_id=$3 AND intent=$4 AND status='checking'`,
        [JSON.stringify(retained),conversationId,claims.sub,intent!]);
      retrySaved=true;
      if(profile==="bca")await ticket(claims.sub,conversationId,claims,intent!,
        response.status==="not_found"?"BACKEND_NOT_FOUND":"BACKEND_INVALID_INPUT");
      // Never expose a forbidden record, backend messages or existence information.
      const explanation=ambiguous?"Plusieurs opérations correspondent. Fournissez une référence précise pour identifier la bonne opération."
        :response.status==="invalid_input" ? settings.invalid_field_message
        : "Je n’ai pas pu retrouver une opération accessible à votre compte avec ces informations.";
      return `${explanation} Vérifiez l’information demandée et renvoyez-la pour continuer la vérification.\n\n${field.prompt} ${settings.privacy_message}`;
    }
    if(buzz) {
      const answer=buzzResultAnswer(definition.backendOperation,response);
      if(answer) {
        if(definition.backendOperation==="order_status"&&fields!.order_number)orderReply=answer;
        return answer;
      }
      reason="BACKEND_UNVERIFIED_RESULT";
      throw new Error(reason);
    }
    if(profile==="bca"&&!verifiedBcaResult(definition.backendOperation,response)) {
      throw new Error("BACKEND_UNVERIFIED_RESULT");
    }
    const outcome: keyof IntentDefinition["responses"]=["ok","success","confirmed","active"].includes(response.status)?"success"
      : ["pending","inactive"].includes(response.status)?"pending":["not_found","forbidden"].includes(response.status)?"not_found":"error";
    const data={...response.data,statut:response.data?.statut??response.status,
      details_transaction:Object.entries(response.data??{})
        .filter(([,value])=>value!==null).map(([key,value])=>`${key} : ${String(value)}`).join("\n"),
      code_parrain:response.data?.code_parrain??response.data?.code??response.code,
      nom_utilisateur:claims.externalUserName??response.data?.nom_utilisateur};
    const answer=renderTemplate(definition.responses[outcome],data);
    if(profile==="bca"&&definition.backendOperation==="digital_product_review"&&response.data?.statut==="rejected"&&
      (typeof response.data.motif!=="string"||!response.data.motif.trim())) {
      const id=await ticket(claims.sub,conversationId,claims,intent!,"PRODUCT_REJECTION_REASON_MISSING");
      return answer+bcaSupportResultGuidance(definition.backendOperation,response.data)+`\n\nTicket de suivi Sabito : ${id}.`;
    }
    // A failed transaction is a verified business result, not a connector outage.
    if (answer && (outcome==="success"||outcome==="pending"||response.status==="failed")) {
      if(profile==="bca")await pool.query(`UPDATE sabito_core.support_tickets SET status='ferme',updated_at=CURRENT_TIMESTAMP(6)
        WHERE project_id=$1 AND conversation_id=$2 AND intent=$3 AND status='ouvert'`,
        [claims.sub,conversationId,intent!]);
    return answer+(profile==="bca"?bcaOwnerResultGuidance(definition.backendOperation,response)+
      bcaSupportResultGuidance(definition.backendOperation,response.data??{}):"");
    }
    if(answer)failureTemplate=answer;
    reason="BACKEND_UNVERIFIED_RESULT";
  } catch (error) {
    if(buzz||profile==="bca")await rememberBackendResult(claims,conversationId,intentRegistry[intent!].backendOperation,
      buzz?buzzBackendFields(intentRegistry[intent!].backendOperation,fields!):fields!,undefined,originalQuestion);
    const code=error instanceof Error ? error.message : "";
    if (["BACKEND_OFFLINE","BACKEND_TIMEOUT","BACKEND_BUSY","MEMBER_AUTH_REQUIRED","BACKEND_UNVERIFIED_RESULT",
      "BACKEND_FORBIDDEN","BACKEND_UNSUPPORTED","BACKEND_OPERATION_NOT_CONFIGURED"].includes(code)) reason=code;
    logger.warn({code:reason,operation:intentRegistry[intent!].backendOperation,projectId:claims.sub,stage:"backend_result"},
      "Sabito consultation unavailable");
  } finally {
    if(!retrySaved) await pool.query(`UPDATE sabito_core.intent_sessions SET status='complete',collected_json=$1,updated_at=CURRENT_TIMESTAMP(6)
      WHERE conversation_id=$2 AND project_id=$3 AND intent=$4 AND status='checking'`,
      [JSON.stringify(orderReply?orderContext([fields!.order_number],orderReply):{}),conversationId,claims.sub,intent!]);
  }
  const id=await ticket(claims.sub,conversationId,claims,intent!,reason);
  await recordUnanswered(claims.sub,originalQuestion,isVerifiedMember(claims)?claims.externalUserId:undefined);
  if(buzz)return `Je ne peux pas vérifier cette information de façon fiable pour le moment. Un ticket interne Sabito a été enregistré : ${id}. Cela ne signifie pas que votre opération financière a échoué. Pour contacter directement l’équipe Buzz Booster, ouvrez Support dans la plateforme.`;
  const ticketText=renderTemplate(settings.ticket_message,{ticket_id:id})??settings.no_answer_message;
  if(profile==="bca")return `${reason==="BACKEND_FORBIDDEN"?"Je ne suis pas autorisé à consulter cette information. Reconnectez-vous à BCA ou contactez l’équipe.":reason==="BACKEND_UNSUPPORTED"?"Cette consultation n’est pas annoncée par le connecteur BCA.": "La consultation BCA est temporairement indisponible ou son résultat ne peut pas être confirmé."} ${ticketText} Cela ne signifie pas que votre paiement ou votre transaction a échoué.`;
  return [failureTemplate,ticketText,reason==="MEMBER_AUTH_REQUIRED"?intentRegistry[intent!].guest_message:""].filter(Boolean).join(" ");
}
