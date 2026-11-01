import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Express } from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { io,type Socket } from "socket.io-client";
import { createConversation } from "../conversations";
import { handleIntent } from "../intents";
import { signAccessToken,verifyAccessToken } from "../security";
import type { BackendResult } from "../backend-bridge";

type Context={app:Express;adminKey:string;address:string;projectIds:string[];sockets:Socket[];
  openSocket:(token:string,pollingOnly?:boolean)=>Promise<Socket>};
/** Runs against the isolated protocol harness, never against production members. */
export async function verifyDirectOrders({app,adminKey,address,projectIds,sockets,openSocket}:Context) {
  const created=await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
    .send({slug:`direct-orders-${randomUUID()}`,name:"Buzz Booster",assistant_name:"Sabito",system_prompt:"Données confirmées et lectures seules."}).expect(201);
  const {project,credentials}=created.body.data,id=project.id;
  projectIds.push(id);
  const claims={sub:id,clientId:credentials.clientId,externalUserId:"order-protocol-member",scope:["chat:connect","member:verified"]};
  const poll=()=>request(app).post("/v1/backend/jobs/poll").auth(credentials.clientId,credentials.clientSecret)
    .send({operations:["order_status","deposit_status"]});
  await poll().expect(200);
  const socket=await openSocket(signAccessToken(claims),true);
  let conversationId=await createConversation(id,claims.externalUserId);
  const send=(content:string)=>new Promise<{content:string}>((resolve,reject)=>{
    const complete=(answer:{content:string})=>{socket.off("message:error",failure);resolve(answer);};
    const failure=()=>{socket.off("message:complete",complete);reject(new Error("Protocol message failed"));};
    socket.once("message:complete",complete);socket.once("message:error",failure);
    socket.emit("message:send",{conversationId,content,idempotencyKey:randomUUID()},(ack:{ok:boolean})=>{
      if(!ack.ok)failure();
    });
  });
  const result=(number:string,status="pending"):BackendResult=>({status:"ok",
    data:{order_number:number,statut:status,service:`Service-${number}`,quantite:1000,remains:status==="completed"?0:1000}});
  const complete=async(answer:Promise<{content:string}>,numbers:string[],results:Record<string,BackendResult>={},operation="order_status")=>{
    const received:string[]=[];
    for(let attempt=0;attempt<300&&received.length<numbers.length;attempt++) {
      const jobs=(await poll().expect(200)).body.jobs as {id:string;operation:string;external_user_id:string;fields:Record<string,string>}[];
      assert.ok(jobs.length<=2,"At most two tool calls may be in flight for this conversation");
      for(const job of jobs) {
        assert.equal(job.operation,operation);assert.equal(job.external_user_id,claims.externalUserId);
        const number=job.fields[operation==="order_status"?"order_number":"deposit_number"];
        assert.ok(numbers.includes(number),`Unexpected reference for ${operation}`);
        assert.equal(received.includes(number),false,"Repeated references in a message must be deduplicated");
        assert.deepEqual(job.fields,{[operation==="order_status"?"order_number":"deposit_number"]:number});
        received.push(number);
        await request(app).post(`/v1/backend/jobs/${job.id}/result`).auth(credentials.clientId,credentials.clientSecret)
          .send({result:results[number]??result(number)}).expect(200);
      }
      if(received.length<numbers.length)await new Promise(resolve=>setTimeout(resolve,10));
    }
    assert.deepEqual([...received].sort(),[...numbers].sort(),"Every reference must cause a separate real bridge call");
    return (await answer).content;
  };
  assert.match(await complete(send("Vérifie cette commande 162717"),["162717"]),/Statut : En attente/);
  assert.match(await complete(send("162718"),["162718"]),/Service-162718/);
  const fresh=await complete(send("Revérifie celle-ci"),["162718"],{"162718":result("162718","completed")});
  assert.match(fresh,/Statut : Terminé/);assert.match(fresh,/Quantité restante : 0/);
  for(const [phrase,number] of [["Et celle-ci : 162719 ?","162719"],["Celle-ci aussi : 162720","162720"],
    ["Vérifie aussi 162721","162721"],["Maintenant 162722","162722"]])
    assert.match(await complete(send(phrase),[number]),new RegExp(`Commande : ${number}`));
  const mixed=await complete(send("Vérifie 162723, 162724, 162725, 162726 et 162723"),["162723","162724","162725","162726"],{
    "162724":{status:"error",data:{statut:"failed",service:"PRIVATE_ERROR"}},
    "162726":{status:"forbidden",data:{service:"PRIVATE_OTHER_MEMBER",quantite:987654}},
  });
  assert.match(mixed,/Service-162723/);assert.match(mixed,/Service-162725/);
  assert.match(mixed,/vérification n’a pas abouti/);assert.match(mixed,/introuvable ou non accessible/);
  assert.doesNotMatch(mixed,/PRIVATE_|987654|Statut : Échoué/);
  assert.match((await send("Revérifie celle-ci")).content,/Quel numéro de commande/);
  assert.deepEqual((await poll().expect(200)).body.jobs,[]);
  await complete(send("162727"),["162727"]);
  await complete(send("Vérifie la commande 162728 pour le membre 999999"),["162728"]);

  conversationId=await createConversation(id,claims.externalUserId);
  const large=Array.from({length:12},(_,index)=>String(200001+index));
  const firstBatch=await complete(send(`Vérifie les commandes ${large.join(", ")}`),large.slice(0,10));
  assert.match(firstBatch,/2 numéro\(s\) non encore vérifié/);
  const inserted=await complete(send("Maintenant 299999"),["299999"]);
  assert.match(inserted,/2 numéro\(s\) non encore vérifié/);
  await complete(send("suite"),large.slice(10));
  assert.match((await send("suite")).content,/plus de commandes dans ce lot/);
  assert.deepEqual((await poll().expect(200)).body.jobs,[]);

  conversationId=await createConversation(id,claims.externalUserId);
  await send("Vérifie mon dépôt");
  await send("oui");
  await complete(send("162717"),["162717"],{"162717":{status:"not_found"}},"deposit_status");
  conversationId=await createConversation(id,claims.externalUserId);
  await send("Mon OTP est 123456");
  await send("123456");
  assert.deepEqual((await poll().expect(200)).body.jobs,[]);

  const guest={...claims,externalUserId:"guest:direct-order",scope:["chat:connect"]};
  const guestConversation=await createConversation(id,guest.externalUserId);
  assert.match((await handleIntent(guest,guestConversation,"Vérifie cette commande 162717"))!,/Connectez-vous/);
  assert.match((await handleIntent({...claims,exp:Math.floor(Date.now()/1000)-1},conversationId,"Vérifie cette commande 162717"))!,/Connectez-vous/);
  await assert.rejects(handleIntent({...claims,externalUserId:"another-member"},conversationId,"Vérifie cette commande 162717"),/CONVERSATION_NOT_FOUND/);
  const expiredToken=jwt.sign({...verifyAccessToken(signAccessToken(claims)),exp:Math.floor(Date.now()/1000)-60},
    process.env.JWT_SECRET!,{algorithm:"HS256"});
  const expired=io(address,{auth:{token:expiredToken},transports:["polling"],reconnection:false});
  sockets.push(expired);
  await new Promise<void>(resolve=>expired.once("connect_error",()=>resolve()));
  assert.equal(expired.connected,false);
  assert.deepEqual((await poll().expect(200)).body.jobs,[]);
}
