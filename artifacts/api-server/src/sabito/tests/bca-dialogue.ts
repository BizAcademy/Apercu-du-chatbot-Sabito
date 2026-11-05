import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createConversation } from "../conversations";
import { signAccessToken } from "../security";
import { saveKnowledge } from "../knowledge";
import { readAssistantSettings } from "../assistant-settings";
import { pool } from "../database";
import { bcaDialogueDrafts,bcaFallback,bcaWarmClosing,bcaTestPrompt } from "../bca-dialogue-rules";
import { bcaDialogueReply } from "../bca-dialogue";

export async function verifyBcaDialogue({app,adminKey,projectIds,openSocket}:any) {
  const {project,credentials}=(await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
    .send({slug:`bca-dialogue-${randomUUID()}`,name:"BCA",assistant_name:"Sabito",
      system_prompt:"Réponses écrites approuvées seulement, sans invention."}).expect(201)).body.data;
  const id=project.id;projectIds.push(id);
  await readAssistantSettings(id);
  async function session(member=false) {
    const claims={sub:id,clientId:credentials.clientId,externalUserId:`${member?"member":"guest"}:${randomUUID()}`,
      scope:member?["chat:connect","member:verified"]:["chat:connect"]};
    const conversationId=await createConversation(id,claims.externalUserId);
    const socket=await openSocket(signAccessToken(claims));
    const send=(content:string)=>new Promise<any>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("BCA_DIALOGUE_TIMEOUT:"+content)),15000);
      socket.once("message:complete",(message:any)=>{
        clearTimeout(timer);
        resolve({...message,content:String(message.content).split("\n\nConcernant votre question précédente « ")[0]});
      });
      socket.emit("message:send",{conversationId,content,idempotencyKey:randomUUID()},(ack:any)=>{
        if(!ack.ok){clearTimeout(timer);reject(new Error("BCA_DIALOGUE_ACK:"+ack.error?.code));}
      });
    });
    return {claims,conversationId,send};
  }
  const initial=await session();
  assert.equal((await initial.send("Pourquoi ma formation est rejetée ?")).content,bcaFallback,
    "New scenario text must not be published before approval");
  const docs=(await pool.query("SELECT id,title,status FROM sabito_core.knowledge_documents WHERE project_id=$1",[id])).rows;
  for(const draft of bcaDialogueDrafts) {
    const doc=docs.find((item:any)=>item.title===draft.title);
    assert.ok(doc);assert.equal(doc.status,"pending");
    await request(app).post(`/v1/admin/projects/${id}/knowledge-review/${doc.id}/decision`)
      .set("X-Admin-Key",adminKey).send({decision:"approve"}).expect(200);
  }
  const facts=await session();
  for(const key of ["rejected-training","wrong-commission","account-link"]) {
    const draft=bcaDialogueDrafts.find(item=>item.key===key)!;
    assert.equal((await facts.send(draft.variants[0])).content,draft.content);
  }
  const income=(await facts.send("Qu'est-ce qui me rapporte plus de revenus ?")).content;
  assert.match(income,/formation/i);assert.match(income,/revenu|gain/i);
  assert.equal((await facts.send("très émue de votre réponse")).content,bcaWarmClosing);
  const days=await session();
  const prompt=await days.send("Pourquoi mon troisième jour n'est pas disponible ?");
  assert.equal(prompt.content,bcaTestPrompt);
  assert.deepEqual(prompt.suggestions.map((item:any)=>item.question),["Oui","Non"]);
  assert.equal(prompt.closing_message,"");
  assert.equal((await days.send("oui")).content,bcaDialogueDrafts.find(item=>item.key==="test-days")!.content);
  await days.send("pk le 3e jour est bloque");
  assert.equal((await days.send("non")).content,bcaDialogueDrafts.find(item=>item.key==="paid-days")!.content);
  await days.send("LE JOUR 3 DE LA CAMPAGNE EST PAS VALIDE");
  assert.match((await days.send("les deux")).content,/Choisissez Oui ou Non/);
  assert.equal((await days.send("2")).content,bcaDialogueDrafts.find(item=>item.key==="paid-days")!.content);
  const title="Exercice Calypso Voltaire";
  const questions=[{question:"Comment suivre une formation ?",answer:"Réponse approuvée A : ouvrez Formations."},
    {question:"Comment utiliser Digital Store ?",answer:"Réponse approuvée B : ouvrez Digital Store."}];
  await saveKnowledge(id,title,"Choisissez votre parcours public BCA.",undefined,undefined,[],questions);
  const choices=await session();
  await choices.send(title);
  assert.equal((await choices.send("oui")).content,questions.map(item=>item.answer).join("\n\n"));
  await choices.send(title);
  assert.equal((await choices.send("1")).content,questions[0].answer);
  await choices.send(title);
  assert.equal((await choices.send("formasion")).content,questions[0].answer);
  await choices.send(title);
  assert.equal((await choices.send("d'accord")).content,questions.map(item=>item.answer).join("\n\n"));
  await choices.send(title);
  assert.equal((await choices.send("tous")).content,questions.map(item=>item.answer).join("\n\n"));
  await choices.send(title);
  await pool.query("UPDATE sabito_core.messages SET created_at=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 31 MINUTE) WHERE conversation_id=$1",
    [choices.conversationId]);
  await pool.query("UPDATE sabito_core.public_guidance_context SET updated_at=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 31 MINUTE) WHERE conversation_id=$1",
    [choices.conversationId]);
  assert.doesNotMatch((await choices.send("pourquoi")).content,/Réponse approuvée [AB]/);
  assert.equal(await bcaDialogueReply({...facts.claims,externalUserId:"another-member"},facts.conversationId,"pourquoi"),null);
  await facts.send('Pourquoi ma formation « Cours Alpha » est rejetée ?');
  const stored=JSON.parse(String((await pool.query("SELECT context_json FROM sabito_core.public_guidance_context WHERE conversation_id=$1",
    [facts.conversationId])).rows[0].context_json));
  assert.equal(stored.subject,"digital-store");
  assert.equal(stored.entities.formation.trim(),"Cours Alpha");
  await request(app).post("/v1/backend/jobs/poll").auth(credentials.clientId,credentials.clientSecret)
    .send({operations:[]}).expect(200);
  const member=await session(true);
  await member.send("mon solde disponible");
  assert.equal((await member.send("oui")).content,bcaFallback,"Worker unavailable must not reveal a ticket number");
  assert.ok((await pool.query("SELECT id FROM sabito_core.support_tickets WHERE project_id=$1 AND conversation_id=$2",
    [id,member.conversationId])).rows.length);
  const unanswered=await request(app).get(`/v1/admin/projects/${id}/unanswered`)
    .set("X-Admin-Key",adminKey).expect(200);
  assert.ok(unanswered.body.data.length);
}
