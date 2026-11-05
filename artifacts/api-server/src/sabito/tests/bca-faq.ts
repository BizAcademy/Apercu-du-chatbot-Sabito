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
import { bcaGuides } from "../bca-guide-data";
import { bcaQuestionAliases,bcaQuestionFaq } from "../bca-question-followups";
import { bcaConversationHelp } from "../bca-conversation-help";
import { saveKnowledge } from "../knowledge";
import { handleIntent } from "../intents";
import { pool } from "../database";

export async function verifyBcaFaq({app,adminKey,projectIds,openSocket}:{
  app:Express;adminKey:string;projectIds:string[];openSocket:(token:string)=>Promise<Socket>;
}) {
  const {project,credentials}=(await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
    .send({slug:`bca-faq-${randomUUID()}`,name:"Biz Connect Academy",assistant_name:"Sabito",
      system_prompt:"Utiliser les références approuvées et ne jamais inventer de résultat financier."}).expect(201)).body.data;
  const id=project.id;projectIds.push(id);
  const configuration=await readAssistantSettings(id);
  for(const scope of [["chat:connect"],["chat:connect","member:verified"]]){
    // Keep the real 20 messages/minute/member protection enabled. Exercise
    // larger FAQ packs across independent identities, not a privileged bypass.
    for(let offset=0;offset<bcaFaq.length;offset+=12) {
    const claims={sub:id,clientId:credentials.clientId,externalUserId:`${scope.length===1?"guest:":"member:"}${randomUUID()}`,scope};
    const socket=await openSocket(signAccessToken(claims));
    for(const guide of bcaFaq.slice(offset,offset+12)){
      const conversationId=await createConversation(id,claims.externalUserId);
      const reply=new Promise<{content:string}>((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error("BCA_FAQ_TIMEOUT")),15000);
        socket.once("message:complete",message=>{clearTimeout(timer);resolve(message);});
        socket.emit("message:send",{conversationId,content:guide.variants[0],idempotencyKey:randomUUID()},(ack:{ok:boolean;error?:{code?:string}})=>{
          if(!ack.ok){clearTimeout(timer);reject(new Error(`BCA_FAQ_REJECTED:${ack.error?.code??"UNKNOWN"}:${guide.key}`));}
        });
      });
      const result=await reply;
      assert.equal(result.content,guide.content,guide.title);
      assert.doesNotMatch(result.content,/communiquez.*(?:numéro de transaction|référence de dépôt)/i);
    }
    }
  }
  const polled=await request(app).post("/v1/backend/jobs/poll").auth(credentials.clientId,credentials.clientSecret)
    .send({operations:configuration.settings.intents.map(i=>i.backend_function)}).expect(200);
  assert.deepEqual(polled.body.jobs,[],"Public BCA FAQ must never trigger private financial checks");
  const url=`/v1/admin/projects/${id}/knowledge`;
  const contextualClaims={sub:id,clientId:credentials.clientId,externalUserId:`guest:csv-context-${randomUUID()}`,scope:["chat:connect"]};
  const contextSocket=await openSocket(signAccessToken(contextualClaims));
  const contextualConversation=await createConversation(id,contextualClaims.externalUserId);
  const sendContext=(content:string)=>new Promise<{content:string}>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("BCA_CSV_CONTEXT_TIMEOUT")),15000);
    contextSocket.once("message:complete",message=>{
      clearTimeout(timer);
      // The real message retains its separately tracked satisfaction survey.
      // Assert the answer body while subsequent turns exercise survey stripping.
      resolve({...message,content:String(message.content).split("\n\nConcernant votre question précédente « ")[0]});
    });
    contextSocket.emit("message:send",{conversationId:contextualConversation,content,idempotencyKey:randomUUID()},(ack:{ok:boolean})=>{
      if(!ack.ok){clearTimeout(timer);reject(new Error("BCA_CSV_CONTEXT_REJECTED"));}
    });
  });
  assert.match((await sendContext("Explication claire")).content,/quel sujet|quelle étape/i);
  const premium=bcaFaq.find(guide=>guide.key==="member-premium-courses")!;
  assert.equal((await sendContext(premium.title)).content,premium.content);
  assert.equal((await sendContext("Comment ça fonctionne ?")).content,premium.content,
    "An elliptical question must retain the immediately preceding approved BCA topic");
  assert.match((await sendContext("Je veux connaître plus")).content,/approfondir/);
  assert.equal((await sendContext("Comment faire")).content,premium.content,
    "Follow-ups remain anchored after a public clarification prompt");
  assert.match((await sendContext("Okay envoie moi ça comme un lien")).content,/pas ici d’un lien public vérifié/);
  assert.doesNotMatch((await sendContext("Comment faire")).content,/https?:\/\//);
  const pin=bcaGuides.find(guide=>guide.key==="07")!;
  assert.equal((await sendContext("Comment modifier son code pin")).content,pin.content);
  assert.match((await sendContext("Oui est l'option profil")).content,/rubrique Profil/);
  await sendContext("merci");
  assert.equal((await sendContext("Comment faire")).content,pin.content,
    "A courtesy acknowledgement does not discard the public subject");
  assert.match((await sendContext("En quel année BCA à été fondé ?")).content,/pas de date.*confirmée/);
  assert.match((await sendContext("Comment faire")).content,/Quel sujet/,
    "Do not jump back over a different unanswered subject");
  assert.match((await sendContext("Je suis arrivé au compagne 3 abonnement premium")).content,/campagne publicitaire.*formation/s);
  const campaignChoice=await sendContext("Campagne");
  assert.match(campaignChoice.content,/campagne test/);
  assert.equal((await sendContext("Comment faire")).content,campaignChoice.content,
    "Retain a public choice without choosing an option on the member's behalf");
  assert.equal(await bcaConversationHelp({...contextualClaims,externalUserId:"another-member"},
    contextualConversation,"Comment faire"),null,"Never read another member's context");
  const memberClaims={...contextualClaims,externalUserId:`member:collector-${randomUUID()}`,scope:["chat:connect","member:verified"]};
  const collecting=await createConversation(id,memberClaims.externalUserId);
  await handleIntent(memberClaims,collecting,configuration.settings.intents.find(intent=>intent.backend_function==="deposit_status")!.triggers[0]);
  assert.equal(await bcaConversationHelp(memberClaims,collecting,"Comment faire"),null,
    "A public follow-up must not consume a private confirmation or transaction reference");
  const publicLink="https://example.com/formation-bca";
  await saveKnowledge(id,"Formation de démonstration validée",`Consultez le cours public : ${publicLink}`);
  await sendContext("Formation de démonstration validée");
  assert.match((await sendContext("Okay envoie moi ça comme un lien")).content,/https:\/\/example\.com\/formation-bca/);
  await saveKnowledge(id,"Fondation BCA confirmée","Information confirmée par le propriétaire pour ce test.",
    undefined,undefined,["En quel année BCA à été fondé ?"]);
  assert.equal((await sendContext("En quel année BCA à été fondé ?")).content,
    "Information confirmée par le propriétaire pour ce test.","Exact approved answers override the uncertainty fallback");
  assert.deepEqual((await request(app).post("/v1/backend/jobs/poll").auth(credentials.clientId,credentials.clientSecret)
    .send({operations:configuration.settings.intents.map(i=>i.backend_function)}).expect(200)).body.jobs,[]);
  const docs=(await request(app).get(url).set("X-Admin-Key",adminKey).expect(200)).body.data;
  const seller=docs.find((doc:{title:string})=>doc.title===bcaGuides.find(guide=>guide.key==="23")!.title);
  const sellerContent="Réponse vendeur personnalisée par le propriétaire : suivre les conditions affichées.";
  await saveKnowledge(id,seller.title,sellerContent,seller.id,undefined,["Mon alias vendeur personnel"]);
  for(const guide of bcaQuestionFaq) {
    const document=docs.find((doc:{title:string})=>doc.title===guide.title);
    await request(app).delete(`${url}/${document.id}`).set("X-Admin-Key",adminKey).expect(204);
  }
  await pool.query("DELETE FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2",[id,"bca.conversation_questions.installed"]);
  await pool.query("DELETE FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2",[id,"bca.conversation_aliases.installed"]);
  const upgrade=await import("../bca-knowledge-install.ts?upgrade="+randomUUID());
  assert.equal(await upgrade.ensureBcaKnowledge(id),true,"An already installed BCA platform receives only the new pack/aliases");
  assert.equal((await retrieveReply(id,"Je ne sais pas comment vendre les articles")).answer,sellerContent);
  assert.equal((await retrieveReply(id,"Mon alias vendeur personnel")).answer,sellerContent);
  for(const group of bcaQuestionAliases)for(const question of group.questions) {
    const result=await retrieveReply(id,question);
    assert.equal(result.reliable,true,question);
  }
  assert.equal(await upgrade.ensureBcaKnowledge(id),false);
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
