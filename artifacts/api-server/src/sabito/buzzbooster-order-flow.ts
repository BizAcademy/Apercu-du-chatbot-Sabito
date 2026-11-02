import { pool } from "./database";
import { activeCredential } from "./projects";
import { requestBackend } from "./backend-bridge";
import type { AssistantSettings } from "./assistant-settings";
import type { AccessClaims } from "./security";
import { isVerifiedMember } from "./templates";
import { normalizeQuestion } from "./question-normalization";
import { rememberBackendResult } from "./backend-conversation";
import { orderAnswerHash,orderBatchSize,orderConcurrency,orderContext,orderContinue,orderOutcomeAnswer,
  orderRecheck,orderReferences,explicitOrderRead,type OrderOutcome } from "./buzzbooster-orders";

const memberCurrent=(claims:AccessClaims)=>isVerifiedMember(claims)&&(claims.exp===undefined||claims.exp*1000>Date.now());
function storedNumbers(raw:unknown):string[] {
  try {
    const values=JSON.parse(String(raw??"[]"));
    return Array.isArray(values)?values.filter((value):value is string=>typeof value==="string"&&/^[\p{L}\p{N}._/-]{1,128}$/u.test(value)):[];
  }catch{return [];}
}
export async function directBuzzOrders(claims:AccessClaims,conversationId:string,text:string,settings:AssistantSettings,
  technicalTicket:()=>Promise<string>):Promise<string|null> {
  const definition=settings.intents.find(intent=>intent.enabled&&intent.backend_function==="order_status");
  if(!definition||!/\d/.test(text)&&!orderRecheck(text)&&!orderContinue(text))return null;
  const explicit=orderReferences(text),connection=await pool.connect();
  let numbers:string[]=[],remaining:string[]=[],original=text;
  try {
    await connection.query("BEGIN");
    const owner=await connection.query(`SELECT c.id,s.intent,s.status,s.collected_json,s.original_question,
      (s.updated_at < DATE_SUB(CURRENT_TIMESTAMP(6), INTERVAL 30 SECOND)) AS stale FROM sabito_core.conversations c
      LEFT JOIN sabito_core.intent_sessions s ON s.conversation_id=c.id AND s.project_id=c.project_id
      WHERE c.id=$1 AND c.project_id=$2 AND c.external_user_id=$3 FOR UPDATE`,[conversationId,claims.sub,claims.externalUserId]);
    const current=owner.rows[0];
    if(!current)throw new Error("CONVERSATION_NOT_FOUND");
    if(current.intent&&current.intent!==definition.id&&!explicitOrderRead(text)) {
      await connection.query("COMMIT");return null;
    }
    const fields=JSON.parse(String(current.collected_json??"{}")) as Record<string,string>;
    let context=current.intent===definition.id;
    if(context&&current.status==="complete") {
      const latest=await connection.query(`SELECT content FROM sabito_core.messages WHERE project_id=$1 AND conversation_id=$2
        AND role='assistant' AND status='completed' ORDER BY created_at DESC,id DESC LIMIT 1`,[claims.sub,conversationId]);
      context=!!fields.__answer_hash&&latest.rows[0]&&orderAnswerHash(String(latest.rows[0].content))===fields.__answer_hash;
    }
    // Do not turn an amount/OTP or a refund correction into an order lookup.
    numbers=explicit.length?explicit:context?orderReferences(text,true):[];
    if(!numbers.length&&context&&orderContinue(text)) {
      numbers=storedNumbers(fields.__remaining_orders);
      if(!numbers.length){await connection.query("COMMIT");return "Il n’y a plus de commandes dans ce lot. Communiquez un autre numéro si vous souhaitez une nouvelle vérification.";}
    }
    if(!numbers.length&&context&&orderRecheck(text)) {
      const previous=storedNumbers(fields.__last_orders);
      if(previous.length===1)numbers=previous;
      else {
        await connection.query(`UPDATE sabito_core.intent_sessions SET status='collecting',collected_json=$1,updated_at=CURRENT_TIMESTAMP(6)
          WHERE conversation_id=$2 AND project_id=$3 AND intent=$4`,
          [JSON.stringify({__remaining_orders:fields.__remaining_orders??"[]"}),conversationId,claims.sub,definition.id]);
        await connection.query("COMMIT");
        return "Quel numéro de commande souhaitez-vous revérifier ? Plusieurs commandes ont été évoquées ; indiquez celle à consulter.";
      }
    }
    if(!numbers.length){await connection.query("COMMIT");return null;}
    if(!memberCurrent(claims)){await connection.query("COMMIT");return definition.guest_message;}
    if(current.status==="checking"&&Number(current.stale)!==1) {
      await connection.query("COMMIT");return settings.checking_message;
    }
    original=context?String(current.original_question??text):text;
    const backlog=context&&!orderContinue(text)?storedNumbers(fields.__remaining_orders).filter(number=>!numbers.includes(number)):[];
    remaining=[...new Set([...numbers.slice(orderBatchSize),...backlog])];numbers=numbers.slice(0,orderBatchSize);
    await connection.query(`INSERT INTO sabito_core.intent_sessions (conversation_id,project_id,intent,collected_json,status,original_question)
      VALUES ($1,$2,$3,$4,'checking',$5) ON DUPLICATE KEY UPDATE intent=VALUES(intent),collected_json=VALUES(collected_json),
      status='checking',original_question=VALUES(original_question),updated_at=CURRENT_TIMESTAMP(6)`,
      [conversationId,claims.sub,definition.id,JSON.stringify(orderContext(numbers,"",remaining)),original]);
    await connection.query("COMMIT");
  }catch(error){await connection.query("ROLLBACK");throw error;}
  finally{connection.release();}
  const outcomes:OrderOutcome[]=new Array(numbers.length);
  let next=0,ticket:Promise<string>|undefined;
  await Promise.all(Array.from({length:Math.min(orderConcurrency,numbers.length)},async()=>{
    while(next<numbers.length) {
      const index=next++,number=numbers[index];
      try {
        if(!memberCurrent(claims)||!await activeCredential(claims.sub,claims.clientId)) {
          outcomes[index]={number,sessionMissing:true};continue;
        }
        const result=await requestBackend(claims.sub,claims.externalUserId,"order_status",{order_number:number});
        outcomes[index]={number,result};
        if(result.status==="error")throw new Error("BACKEND_UNVERIFIED_RESULT");
      } catch {
        ticket??=technicalTicket().catch(()=>"");
        const id=await ticket;
        outcomes[index]={number,technicalError:id?`Ticket interne Sabito : ${id}.`:""};
      }
    }
  }));
  for(const outcome of outcomes)await rememberBackendResult(claims,conversationId,"order_status",
    {order_number:outcome.number},outcome.result,original);
  const answer=[...outcomes.map(orderOutcomeAnswer),
    remaining.length?`Ce lot concerne ${numbers.length} commandes, avec au maximum ${orderConcurrency} consultations simultanées. Il reste ${remaining.length} numéro(s) non encore vérifié(s). Écrivez « suite » pour traiter le lot suivant, jusqu’à ${orderBatchSize} commandes.`:"",
  ].filter(Boolean).join("\n\n");
  const retry=outcomes.length===1&&!remaining.length&&["not_found","invalid_input","forbidden"].includes(outcomes[0].result?.status??"");
  await pool.query(`UPDATE sabito_core.intent_sessions SET status=$1,collected_json=$2,updated_at=CURRENT_TIMESTAMP(6)
    WHERE conversation_id=$3 AND project_id=$4 AND intent=$5 AND status='checking'`,
    [retry?"collecting":"complete",JSON.stringify(retry?{}:orderContext(numbers,answer,remaining)),conversationId,claims.sub,definition.id]);
  return answer;
}
