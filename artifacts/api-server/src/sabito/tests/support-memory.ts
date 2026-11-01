import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Express } from "express";
import request from "supertest";
import type { Socket } from "socket.io-client";
import { pool } from "../database";
import { createConversation } from "../conversations";
import { recordUnanswered } from "../unanswered";
import { signAccessToken,verifyAccessToken } from "../security";

type Context={app:Express;adminKey:string;projectIds:string[];openSocket:(token:string,pollingOnly?:boolean)=>Promise<Socket>};
export async function verifySupportMemory({app,adminKey,projectIds,openSocket}:Context) {
  const created=await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
    .send({slug:`memory-${randomUUID()}`,name:"Support local",assistant_name:"Sabito",system_prompt:"Réponses approuvées uniquement."}).expect(201);
  const {project,credentials}=created.body.data,id=project.id;projectIds.push(id);
  const claims={sub:id,clientId:credentials.clientId,externalUserId:"support-memory-member",scope:["chat:connect","member:verified"]};
  const token=signAccessToken(claims),admin={"X-Admin-Key":adminKey};
  const questions=["Comment accéder au manuel ?","Comment modifier mon profil ?","Comment trouver la documentation ?"];
  const answers=["Ouvrez le manuel depuis votre espace de documentation approuvé.",
    "Ouvrez les paramètres du profil pour modifier vos informations autorisées.",
    "Consultez la rubrique de documentation accessible dans votre espace."];
  for(let i=0;i<questions.length;i++)await request(app).post(`/v1/admin/projects/${id}/knowledge`).set(admin)
    .send({title:questions[i],content:answers[i]}).expect(201);
  let socket=await openSocket(token,true);
  const start=()=>new Promise<any>(resolve=>socket.emit("conversation:start",{resume:true},resolve));
  const initial=await start();assert.equal(initial.ok,true);
  const cid=initial.data.conversationId;
  const send=(content:string)=>new Promise<{content:string}>((resolve,reject)=>{
    socket.once("message:complete",resolve);
    socket.emit("message:send",{conversationId:cid,idempotencyKey:randomUUID(),content},(ack:{ok:boolean})=>{
      if(!ack.ok)reject(new Error("Support message refused"));
    });
  });
  assert.equal((await send(questions[0])).content,answers[0]);
  const second=(await send(questions[1])).content;
  assert.ok(second.startsWith(answers[1]));assert.ok(second.includes(questions[0]));
  assert.match(second,/Répondez par oui ou non/);
  socket.disconnect();socket=await openSocket(token,true);
  const resumed=await start();
  assert.equal(resumed.data.conversationId,cid);assert.equal(resumed.data.history.length,4);
  assert.match((await send("oui")).content,/Excellent/);
  let stats=(await request(app).get(`/v1/admin/projects/${id}/insights`).set(admin).expect(200)).body;
  assert.equal(stats.total_questions,2);assert.equal(stats.satisfaction.satisfied,1);assert.equal(stats.satisfaction.rate,100);
  const third=(await send(questions[2])).content;assert.ok(third.includes(questions[1]));
  assert.match((await send("non")).content,/À quel niveau/);
  const again=(await send("aidez-moi à nouveau")).content;assert.ok(again.includes(answers[1]));
  stats=(await request(app).get(`/v1/admin/projects/${id}/insights?days=7`).set(admin).expect(200)).body;
  assert.equal(stats.satisfaction.satisfied,1);assert.equal(stats.satisfaction.unsatisfied,1);
  assert.equal(stats.satisfaction.rate,50);assert.equal(stats.total_questions,3);
  await send(questions[0]);await send("oui");await send(questions[0]);
  stats=(await request(app).get(`/v1/admin/projects/${id}/insights`).set(admin).expect(200)).body;
  assert.equal(stats.top_questions[0].count,3);
  await request(app).get(`/v1/admin/projects/${id}/insights`).expect(401);
  await request(app).get(`/v1/admin/projects/${id}/insights?days=5`).set(admin).expect(422);
  const other={...claims,externalUserId:"another-support-member"};
  await request(app).get(`/v1/conversations/${cid}/history`).auth(signAccessToken(other),{type:"bearer"}).expect(404);
  await request(app).get(`/v1/conversations/${cid}/history`).expect(401);
  const otherConversation=await createConversation(id,other.externalUserId);
  const foreign=(await request(app).get(`/v1/admin/projects/${id}/insights?days=90`).set(admin)).body;
  assert.ok(foreign.total_questions>=3);
  // Pagination contains every message once, and refuses a cursor from a different conversation.
  for(let i=0;i<103;i++)await pool.query(`INSERT INTO sabito_core.messages(id,project_id,conversation_id,role,content,status)
    VALUES($1,$2,$3,'user',$4,'completed')`,[randomUUID(),id,cid,`pagination-${i}`]);
  const page=(await request(app).get(`/v1/conversations/${cid}/history`).auth(token,{type:"bearer"}).expect(200)).body;
  assert.equal(page.data.length,100);assert.equal(page.hasMore,true);
  const older=(await request(app).get(`/v1/conversations/${cid}/history?before=${page.data[0].id}`).auth(token,{type:"bearer"}).expect(200)).body;
  assert.equal(older.hasMore,false);
  assert.equal(new Set([...older.data,...page.data].map(m=>m.id)).size,older.data.length+100);
  await request(app).get(`/v1/conversations/${otherConversation}/history?before=${page.data[0].id}`)
    .auth(signAccessToken(other),{type:"bearer"}).expect(422);
  await pool.query("UPDATE sabito_core.conversations SET created_at=DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 25 HOUR) WHERE id=$1",[cid]);
  await request(app).get(`/v1/conversations/${cid}/history`).auth(token,{type:"bearer"}).expect(404);
  const expired=await new Promise<any>(resolve=>socket.emit("message:send",
    {conversationId:cid,idempotencyKey:randomUUID(),content:"Question après expiration"},resolve));
  assert.equal(expired.error.code,"CONVERSATION_EXPIRED");
  assert.notEqual((await start()).data.conversationId,cid);
  await recordUnanswered(id,"Question à supprimer du suivi",claims.externalUserId);
  let list=(await request(app).get(`/v1/admin/projects/${id}/unanswered`).set(admin)).body;
  const question=list.data.find((q:any)=>q.question==="Question à supprimer du suivi");
  assert.ok(question);
  await request(app).post(`/v1/admin/projects/${id}/unanswered/${question.id}/answer`).set(admin)
    .send({content:"Une réponse validée qui doit rester après la suppression du suivi."}).expect(201);
  await request(app).delete(`/v1/admin/projects/${id}/unanswered/${question.id}`).expect(401);
  await request(app).delete(`/v1/admin/projects/${randomUUID()}/unanswered/${question.id}`).set(admin).expect(404);
  await request(app).delete(`/v1/admin/projects/${id}/unanswered/${question.id}`).set(admin).expect(204);
  await request(app).delete(`/v1/admin/projects/${id}/unanswered/${question.id}`).set(admin).expect(404);
  const docs=(await request(app).get(`/v1/admin/projects/${id}/knowledge`).set(admin)).body;
  assert.ok(docs.data.some((d:any)=>d.title==="Question à supprimer du suivi"));
  const tid=randomUUID();
  await pool.query(`INSERT INTO sabito_core.support_tickets(id,project_id,conversation_id,intent,reason)
    VALUES($1,$2,$3,'deposit_status','BACKEND_UNAVAILABLE')`,[tid,id,cid]);
  await request(app).delete(`/v1/admin/projects/${randomUUID()}/tickets/${tid}`).set(admin).expect(404);
  await request(app).delete(`/v1/admin/projects/${id}/tickets/${tid}`).expect(401);
  await request(app).delete(`/v1/admin/projects/${id}/tickets/${tid}`).set(admin).expect(204);
  assert.equal((await pool.query("SELECT id FROM sabito_core.conversations WHERE id=$1",[cid])).rows.length,1);
  // Guest resumption uses an HttpOnly opaque cookie, never a persisted JWT.
  const origin="https://guest-widget.example";
  await request(app).put(`/v1/admin/projects/${id}/widget`).set(admin).send({origins:[origin,"https://other-widget.example"]}).expect(200);
  const guest=await request(app).post(`/v1/widget/${id}/session`).set("Origin",origin).send({}).expect(200);
  const cookie=guest.headers["set-cookie"][0];
  assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/Partitioned/);
  assert.doesNotMatch(cookie,/eyJ/);assert.equal(verifyAccessToken(guest.body.access_token).scope.includes("member:verified"),false);
  const restored=await request(app).post(`/v1/widget/${id}/session`).set("Origin",origin).set("Cookie",cookie.split(";")[0]).send({}).expect(200);
  assert.equal(restored.body.external_user_id,guest.body.external_user_id);
  const isolated=await request(app).post(`/v1/widget/${id}/session`).set("Origin","https://other-widget.example").set("Cookie",cookie.split(";")[0]).send({}).expect(200);
  assert.notEqual(isolated.body.external_user_id,guest.body.external_user_id);
  await request(app).delete(`/v1/widget/${id}/session`).set("Origin",origin).set("Cookie",cookie.split(";")[0]).expect(204);
  const afterLogout=await request(app).post(`/v1/widget/${id}/session`).set("Origin",origin).set("Cookie",cookie.split(";")[0]).send({}).expect(200);
  assert.notEqual(afterLogout.body.external_user_id,guest.body.external_user_id);
}
