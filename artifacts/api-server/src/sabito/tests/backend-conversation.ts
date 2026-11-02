import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { pool } from "../database";
import { createConversation } from "../conversations";
import { handleIntent } from "../intents";
import { continueBackendConversation,rememberBackendResult } from "../backend-conversation";
import { readAssistantSettings } from "../assistant-settings";
import { saveKnowledge } from "../knowledge";
import { signAccessToken } from "../security";
import { revokeBackendJobs } from "../backend-bridge";
import type { Express } from "express";
import type { Socket } from "socket.io-client";

export async function verifyBackendConversation(app:Express,adminKey:string,projectIds:string[],
  openSocket:(token:string)=>Promise<Socket>) {
  const created=await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
    .send({slug:`buzz-context-${randomUUID()}`,name:"Buzz Booster",assistant_name:"Sabito",system_prompt:"Références approuvées uniquement."}).expect(201);
  const {project,credentials}=created.body.data,id=project.id;projectIds.push(id);
  const config=await readAssistantSettings(id);
  const claims={sub:id,clientId:credentials.clientId,externalUserId:"context-member-a",scope:["chat:connect","member:verified"]};
  const poll=()=>request(app).post("/v1/backend/jobs/poll").auth(credentials.clientId,credentials.clientSecret)
    .send({operations:config.settings.intents.map(intent=>intent.backend_function)});
  const complete=async(operation:string,result:Record<string,unknown>,expected:Record<string,string>)=>{
    for(let attempt=0;attempt<100;attempt++) {
      const jobs=(await poll().expect(200)).body.jobs;
      const job=jobs.find((item:{operation:string})=>item.operation===operation);
      if(job) {
        assert.equal(job.external_user_id,claims.externalUserId);assert.deepEqual(job.fields,expected);
        await request(app).post(`/v1/backend/jobs/${job.id}/result`).auth(credentials.clientId,credentials.clientSecret).send({result}).expect(200);
        return;
      }
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    throw new Error(`Missing expected read-only job: ${operation}`);
  };
  await poll().expect(200);
  const conv=await createConversation(id,claims.externalUserId);
  const initial=handleIntent(claims,conv,"PIM001");
  await complete("deposit_status",{status:"pending",data:{reference:"RETURNED-NOT-AN-INPUT",statut:"pending",
    moyen_paiement:"Mobile Money",montant:null}},{transaction_id:"PIM001"});
  assert.match((await initial)!,/attente/i);
  const explanation=await handleIntent(claims,conv,"Comment confirmer la transaction ?");
  assert.match(explanation!,/aucune nouvelle consultation/);
  assert.match(explanation!,/ne peux ni confirmer/);
  assert.match(explanation!,/pas de procédure approuvée/);
  assert.deepEqual((await poll().expect(200)).body.jobs,[]);
  assert.match((await handleIntent(claims,conv,"le crédit du portefeuille et l’attribution d’un bonus sont distincts"))!,/éléments différents/);
  // Native socket path must prefer private continuation over public help/search.
  const client=await openSocket(signAccessToken(claims));
  try {
    const answer=new Promise<{content:string}>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("Missing socket continuation")),10000);
      client.once("message:complete",reply=>{clearTimeout(timer);resolve(reply);});
    });
    const ack=await client.emitWithAck("message:send",{conversationId:conv,idempotencyKey:randomUUID(),
      content:"Comment confirmer la transaction ?"});
    assert.equal(ack.ok,true);
    assert.match((await answer).content,/ne peux ni confirmer/);
    assert.deepEqual((await poll().expect(200)).body.jobs,[]);
  }finally{client.disconnect();}
  const reread=handleIntent(claims,conv,"Vérifie encore");
  await complete("deposit_status",{status:"confirmed",data:{statut:"confirmed",moyen_paiement:"Mobile Money"}},
    {transaction_id:"PIM001"});
  assert.match((await reread)!,/confirm/i);
  const bonus=handleIntent(claims,conv,"Et mon bonus ?");
  await complete("deposit_bonus_status",{status:"pending",data:{bonus_status:"pending"}},{transaction_id:"PIM001"});
  assert.match((await bonus)!,/attente/i);
  const order=await createConversation(id,claims.externalUserId);
  const checking=handleIntent(claims,order,"Vérifie la commande 000123");
  await complete("order_status",{status:"ok",data:{order_number:"000123",statut:"completed"}},{order_number:"000123"});
  await checking;
  const refund=handleIntent(claims,order,"Et mon remboursement ?");
  await complete("order_refund_status",{status:"pending",data:{statut:"pending",order_number:"000123"}},{order_number:"000123"});
  assert.match((await refund)!,/ne suffisent pas à confirmer un crédit/);
  // Two known references must not silently select the newest.
  await rememberBackendResult(claims,conv,"deposit_status",{transaction_id:"PIM002"},
    {status:"pending",data:{statut:"pending"}},"Second dépôt");
  assert.match((await handleIntent(claims,conv,"Vérifie encore"))!,/Plusieurs opérations/);
  assert.deepEqual((await poll().expect(200)).body.jobs,[]);
  const selected=handleIntent(claims,conv,"PIM001");
  await complete("deposit_status",{status:"pending",data:{statut:"pending",moyen_paiement:"Mobile Money"}},
    {transaction_id:"PIM001"});
  await selected;
  // Content becomes approved only through the existing administrator mechanism.
  const title="Buzz Booster — Autoriser et vérifier un paiement Mobile Money";
  await saveKnowledge(id,title,"PROCÉDURE APPROUVÉE TEST : validez la notification proposée sur votre téléphone.");
  assert.match((await handleIntent(claims,conv,"Comment confirmer la transaction ?"))!,/PROCÉDURE APPROUVÉE TEST/);
  // No account/product/conversation crossover, expired token or guest lookup.
  assert.equal(await continueBackendConversation({...claims,externalUserId:"context-member-b"},conv,"Explique-moi"),null);
  assert.equal(await continueBackendConversation({...claims,externalUserId:"guest:context",scope:["chat:connect"]},conv,"Explique-moi"),null);
  assert.equal(await continueBackendConversation({...claims,exp:1},conv,"Explique-moi"),null);
  assert.equal(await continueBackendConversation(claims,await createConversation(id,claims.externalUserId),"Explique-moi"),null);
  // Error payload must not become a confirmation or expose connector data.
  const outage=handleIntent(claims,conv,"Vérifie encore");
  await complete("deposit_status",{status:"error",data:{statut:"confirmed",private_note:"DO-NOT-LEAK"}},
    {transaction_id:"PIM001"});
  assert.doesNotMatch((await outage)!,/DO-NOT-LEAK|Statut : confirmed/);
  assert.match((await handleIntent(claims,conv,"Explique-moi"))!,/n’a pas permis de vérifier/);
  const missing=handleIntent(claims,conv,"Vérifie encore");
  await complete("deposit_status",{status:"not_found"},{transaction_id:"PIM001"});
  assert.match((await missing)!,/Renvoyez l’information/);
  const corrected=handleIntent(claims,conv,"PIM003");
  await complete("deposit_status",{status:"pending",data:{statut:"pending"}},{transaction_id:"PIM003"});
  assert.match((await corrected)!,/attente/i);
  const another=await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
    .send({slug:`buzz-other-${randomUUID()}`,name:"Buzz Booster",assistant_name:"Sabito",system_prompt:"Références approuvées."}).expect(201);
  projectIds.push(another.body.data.project.id);
  assert.equal(await continueBackendConversation({...claims,sub:another.body.data.project.id,
    clientId:another.body.data.credentials.clientId},conv,"Explique-moi"),null);
  revokeBackendJobs(id);
  assert.match((await handleIntent(claims,conv,"Vérifie encore"))!,/Plusieurs opérations/);
  assert.match((await handleIntent(claims,conv,"PIM003"))!,/backend est indisponible/);
  assert.equal(await continueBackendConversation(claims,conv,"Changeons de sujet"),null);
  assert.equal(await continueBackendConversation(claims,conv,"Vérifie encore"),null);
  await pool.query("UPDATE sabito_core.conversations SET created_at=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 25 HOUR) WHERE id=$1",[order]);
  assert.equal(await continueBackendConversation(claims,order,"Vérifie encore"),null);
}
