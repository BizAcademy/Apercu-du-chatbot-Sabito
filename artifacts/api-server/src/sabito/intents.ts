import { randomUUID } from "node:crypto";
import { pool } from "./database";
import { requestBackend, type BackendOperation, type BackendResult } from "./backend-bridge";
import type { AccessClaims } from "./security";
import { normalizeQuestion, recordUnanswered } from "./unanswered";
import { searchState,scoreQuestion } from "./question-search";
import { isVerifiedMember,renderTemplate } from "./templates";
import type { IntentDefinition } from "./assistant-settings";
export { isVerifiedMember } from "./templates";
function validField(field:IntentDefinition["fields"][number],value:string) {
  return value.length>=field.min_length && value.length<=field.max_length &&
    (field.type==="text" || (field.type==="identifier" ? /^[\p{L}\p{N}._/-]+$/u.test(value) : /^[\p{L} .'-]+$/u.test(value)));
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
export async function handleIntent(claims:AccessClaims, conversationId:string, text:string):Promise<string|null> {
  const normalized=normalizeQuestion(text);
  const {settings}=await searchState(claims.sub);
  const intentRegistry=Object.fromEntries(settings.intents.filter(d=>d.enabled).map(d=>[d.id,{
    ...d,backendOperation:d.backend_function,
    required:d.fields.map(f=>({...f,valid:(s:string)=>validField(f,s)})),
  }]));
  const scored=Object.values(intentRegistry).map(d=>({id:d.id,score:Math.max(...d.triggers.map(q=>scoreQuestion(text,q,settings)))}))
    .filter(d=>d.score>=settings.confidence_threshold).sort((a,b)=>b.score-a.score);
  const detected=scored[0] && (!scored[1]||scored[0].score-scored[1].score>=0.06) ? scored[0].id:undefined;
  if(!detected) {
    const owner=await pool.query(`SELECT c.id,s.status FROM sabito_core.conversations c LEFT JOIN sabito_core.intent_sessions s
      ON s.conversation_id=c.id AND s.project_id=c.project_id WHERE c.id=$1 AND c.project_id=$2 AND c.external_user_id=$3`,
      [conversationId,claims.sub,claims.externalUserId]);
    if(!owner.rows.length)throw new Error("CONVERSATION_NOT_FOUND");
    if(!["collecting","checking"].includes(String(owner.rows[0].status)))return null;
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
    if (/^(annuler|annule|stop|abandonner)$/.test(normalized) && current?.status==="collecting") {
      await connection.query("UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}' WHERE conversation_id=$1",[conversationId]);
      await connection.query("COMMIT");return settings.cancelled_message;
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
    for(const name of Object.keys(fields)) {
      const field=definition.required.find(f=>f.name===name);
      if(!field||!field.valid(fields[name]))delete fields[name];
    }
    if (!definition.required.length && !isVerifiedMember(claims)) {
      const guide=renderTemplate(definition.guest_message,{})??settings.no_answer_message;
      await connection.query("UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}' WHERE conversation_id=$1 AND project_id=$2",
        [conversationId,claims.sub]);
      await connection.query("COMMIT");return guide;
    }
    const missing=definition.required.find(field=>!fields[field.name]);
    if (missing && !detected) {
      const value=text.trim();
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
  let reason="BACKEND_UNAVAILABLE",failureTemplate="";
  try {
    if (!isVerifiedMember(claims)) {reason="MEMBER_AUTH_REQUIRED";throw new Error(reason);}
    const definition=intentRegistry[intent!];
    const response=await requestBackend(claims.sub,claims.externalUserId,definition.backendOperation,fields!);
    const outcome: keyof IntentDefinition["responses"]=["ok","success","confirmed","active"].includes(response.status)?"success"
      : ["pending","inactive"].includes(response.status)?"pending":["not_found","forbidden"].includes(response.status)?"not_found":"error";
    const data={...response.data,statut:response.status,code_parrain:response.code??response.data?.code_parrain,
      nom_utilisateur:claims.externalUserName??response.data?.nom_utilisateur};
    const answer=renderTemplate(definition.responses[outcome],data);
    if (answer && (outcome==="success"||outcome==="pending")) return answer;
    if(answer)failureTemplate=answer;
    reason="BACKEND_UNVERIFIED_RESULT";
  } catch (error) {
    const code=error instanceof Error ? error.message : "";
    if (["BACKEND_OFFLINE","BACKEND_TIMEOUT","BACKEND_BUSY","MEMBER_AUTH_REQUIRED"].includes(code)) reason=code;
  } finally {
    await pool.query(`UPDATE sabito_core.intent_sessions SET status='complete',collected_json='{}',updated_at=CURRENT_TIMESTAMP(6)
      WHERE conversation_id=$1 AND project_id=$2`,[conversationId,claims.sub]);
  }
  const id=await ticket(claims.sub,conversationId,claims,intent!,reason);
  await recordUnanswered(claims.sub,originalQuestion,isVerifiedMember(claims)?claims.externalUserId:undefined);
  const ticketText=renderTemplate(settings.ticket_message,{ticket_id:id})??settings.no_answer_message;
  return [failureTemplate,ticketText,reason==="MEMBER_AUTH_REQUIRED"?intentRegistry[intent!].guest_message:""].filter(Boolean).join(" ");
}
