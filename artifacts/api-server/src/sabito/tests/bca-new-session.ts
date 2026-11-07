import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Socket } from "socket.io-client";
import type { AccessClaims } from "../security";
import { signAccessToken } from "../security";
import { createConversation } from "../conversations";
import { pool } from "../database";
import { bcaCurrentRoutes } from "../bca-current-questions";
import { readBcaSession } from "../bca-session";
import { handleIntent } from "../intents";

/** Real Socket.IO, database persistence, re-open and owned identity. No live
 * member or external BCA backend is consulted by this test. */
export async function verifyBcaNewSession(projectId:string,clientId:string,openSocket:(token:string)=>Promise<Socket>) {
  const claims:AccessClaims={sub:projectId,clientId,externalUserId:`guest:new-export-${randomUUID()}`,scope:["chat:connect"]};
  const conversationId=await createConversation(projectId,claims.externalUserId,{__sabito_bca:{language:"en"}});
  assert.equal((await readBcaSession(claims,conversationId)).state.language,"fr","Client metadata cannot seed server state");
  let socket=await openSocket(signAccessToken(claims));
  const send=(content:string)=>new Promise<string>((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error("BCA_NEW_SESSION_TIMEOUT")),15000);
    socket.once("message:complete",message=>{clearTimeout(timeout);resolve(String(message.content));});
    socket.emit("message:send",{conversationId,content,idempotencyKey:randomUUID()},(ack:{ok:boolean})=>{
      if(!ack.ok){clearTimeout(timeout);reject(new Error("BCA_NEW_SESSION_REJECTED"));}
    });
  });
  const route=(key:string)=>bcaCurrentRoutes.find(route=>route.key===key)!.answer!;
  try {
    assert.equal(await send("Comment parrainer une personne"),route("current-referral"));
    await pool.query(`UPDATE sabito_core.messages SET created_at=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 21 HOUR)
      WHERE conversation_id=$1`,[conversationId]);
    await pool.query(`UPDATE sabito_core.public_guidance_context SET updated_at=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 21 HOUR)
      WHERE conversation_id=$1`,[conversationId]);
    socket.disconnect();
    socket=await openSocket(signAccessToken(claims));
    const resumed=await new Promise<{ok:boolean;data:{conversationId:string}}>((resolve,reject)=>{
      socket.timeout(15000).emit("conversation:start",{resume:true},(error:Error|null,ack:any)=>error?reject(error):resolve(ack));
    });
    assert.equal(resumed.ok,true);assert.equal(resumed.data.conversationId,conversationId);
    assert.match(await send("Vous ne m’avez pas montré où le trouver"),/trois tirets.*Mes gains/);
    assert.match(await send("In English"),/continue in English/);
    assert.match(await send("How do I start selling"),/^Open Digital Store/);
    assert.equal((await readBcaSession(claims,conversationId)).state.language,"en");
    socket.disconnect();socket=await openSocket(signAccessToken(claims));
    assert.match(await send("How do I withdraw"),/^Open the withdrawal form/);
    await send("En français");
    assert.equal(await send("J'arrive plus à poster des images pour vous envoyer la capture"),route("current-upload-error"));
    assert.match(await send("Comment parrainer une personne"),/^Avant de changer de sujet/);
    assert.equal(await send("oui"),"Excellent\n\n"+route("current-referral"),
      "Resolution resumes the deferred question, not a standalone yes FAQ");
    await send("Ont n'as volé un 1000 sur mon compte");
    assert.match(await send("Comment retirer"),/^Avant de changer de sujet/);
    assert.equal(await send("non"),"À quel niveau avez-vous encore besoin d’aide ?");
    assert.equal((await readBcaSession({...claims,externalUserId:"another-member"},conversationId)).owned,false);
    assert.equal((await readBcaSession(claims,conversationId)).state.pending,undefined);
    const member={...claims,externalUserId:`member:new-proof-${randomUUID()}`,scope:["chat:connect","member:verified"]};
    const privateConversation=await createConversation(projectId,member.externalUserId);
    assert.match((await handleIntent(member,privateConversation,"Validé ma vue whatshapp"))!,/oui.*non/i);
    await handleIntent(member,privateConversation,"oui");
    await handleIntent(member,privateConversation,"pas un identifiant");
    const pending=await pool.query("SELECT intent,status,collected_json FROM sabito_core.intent_sessions WHERE conversation_id=$1",[privateConversation]);
    assert.equal(pending.rows[0].intent,"ads_payout_status");
    assert.equal(pending.rows[0].status,"collecting");
    assert.equal(JSON.parse(String(pending.rows[0].collected_json)).publication_reference,undefined);
    await handleIntent(member,privateConversation,"annuler");
    await pool.query(`UPDATE sabito_core.conversations SET created_at=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 25 HOUR)
      WHERE id=$1`,[conversationId]);
    assert.equal((await readBcaSession(claims,conversationId)).owned,false);
  }finally{socket.disconnect();}
}
