import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import type { Express } from "express";
import type { Socket } from "socket.io-client";
import { createConversation } from "../conversations";
import { signAccessToken } from "../security";
import { bcaFaq } from "../bca-faq";
import { readAssistantSettings } from "../assistant-settings";
import { retrieveReply } from "../question-search";

export async function verifyBcaFaq({app,adminKey,projectIds,openSocket}:{
  app:Express;adminKey:string;projectIds:string[];openSocket:(token:string)=>Promise<Socket>;
}) {
  const {project,credentials}=(await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
    .send({slug:`bca-faq-${randomUUID()}`,name:"Biz Connect Academy",assistant_name:"Sabito",
      system_prompt:"Utiliser les références approuvées et ne jamais inventer de résultat financier."}).expect(201)).body.data;
  const id=project.id;projectIds.push(id);
  const configuration=await readAssistantSettings(id);
  for(const scope of [["chat:connect"],["chat:connect","member:verified"]]){
    const claims={sub:id,clientId:credentials.clientId,externalUserId:`${scope.length===1?"guest:":"member:"}${randomUUID()}`,scope};
    const socket=await openSocket(signAccessToken(claims));
    for(const guide of bcaFaq){
      const conversationId=await createConversation(id,claims.externalUserId);
      const reply=new Promise<{content:string}>((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error("BCA_FAQ_TIMEOUT")),15000);
        socket.once("message:complete",message=>{clearTimeout(timer);resolve(message);});
        socket.emit("message:send",{conversationId,content:guide.variants[0],idempotencyKey:randomUUID()},(ack:{ok:boolean})=>{
          if(!ack.ok){clearTimeout(timer);reject(new Error("BCA_FAQ_REJECTED"));}
        });
      });
      const result=await reply;
      assert.equal(result.content,guide.content,guide.title);
      assert.doesNotMatch(result.content,/communiquez.*(?:numéro de transaction|référence de dépôt)/i);
    }
  }
  const polled=await request(app).post("/v1/backend/jobs/poll").auth(credentials.clientId,credentials.clientSecret)
    .send({operations:configuration.settings.intents.map(i=>i.backend_function)}).expect(200);
  assert.deepEqual(polled.body.jobs,[],"Public BCA FAQ must never trigger private financial checks");
  const url=`/v1/admin/projects/${id}/knowledge`;
  const docs=(await request(app).get(url).set("X-Admin-Key",adminKey).expect(200)).body.data;
  const fees=docs.find((doc:{title:string})=>doc.title===bcaFaq[1].title);
  assert.ok(fees);
  const custom="Conditions personnalisées validées par l’équipe BCA : consultez les frais du formulaire officiel.";
  await request(app).put(`${url}/${fees.id}`).set("X-Admin-Key",adminKey)
    .send({title:fees.title,content:custom,variantes_de_question:fees.variantes_de_question}).expect(200);
  assert.equal((await retrieveReply(id,bcaFaq[1].variants[0])).answer,custom);
  const deleted=docs.find((doc:{title:string})=>doc.title===bcaFaq[0].title);
  await request(app).delete(`${url}/${deleted.id}`).set("X-Admin-Key",adminKey).expect(204);
  await readAssistantSettings(id);
  const remaining=(await request(app).get(url).set("X-Admin-Key",adminKey).expect(200)).body.data;
  assert.equal(remaining.some((doc:{id:string})=>doc.id===deleted.id),false);
}
