import assert from "node:assert/strict";
import { randomBytes,randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import request from "supertest";
import { io,type Socket } from "socket.io-client";
import { logger } from "../lib/logger";
import { coreRoutes } from "./routes";
import { widgetPublicRoutes } from "./widget";
import { initializeSabitoCore,pool,databaseDialect } from "./database";
import { attachSocketServer } from "./socket";
import { buildKnowledgeAnswer } from "./knowledge-answer";
import { acceptUserMessage } from "./conversations";

function socketOnce<T = unknown>(socket: Socket,event: string): Promise<T[]> {
  return new Promise(resolve => socket.once(event,(...args: T[]) => resolve(args)));
}

// Random, process-local test fixtures only. No workspace secrets are written or printed.
test("Original Sabito protocol: credentials, local knowledge, isolation, persistence and revocation",async t => {
  assert.ok(["localhost", "127.0.0.1"].includes(process.env.MYSQL_HOST ?? ""), "A local isolated MySQL test database is required.");
  assert.match(process.env.MYSQL_DATABASE ?? "", /^sabito_test/, "Production databases must not be used by tests.");
  await initializeSabitoCore();
  const adminKey = randomBytes(32).toString("hex");
  process.env.ADMIN_API_KEY = adminKey;
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  process.env.CLIENT_SECRET_PEPPER = randomBytes(32).toString("hex");
  const app = express();
  app.use(express.json());
  app.use("/v1/widget", widgetPublicRoutes);
  app.use((req,_res,next) => {req.log=logger;next();});
  app.use(coreRoutes);
  const httpServer = createServer(app);
  const server = attachSocketServer(httpServer);
  httpServer.listen(0,"127.0.0.1");
  await once(httpServer,"listening");
  const address = httpServer.address();
  assert.ok(address && typeof address !== "string");
  const localTestAddress = `http://127.0.0.1:${address.port}`;
  const projectIds: string[] = [], sockets: Socket[] = [];
  const slug = `test-${randomUUID()}`;
  let first: {project:{id:string};credentials:{clientId:string;clientSecret:string}};
  let second: typeof first;
  let token: string, conversationId: string;
  const openSocket = async (accessToken: string) => {
    const socket = io(localTestAddress,{auth:{token:accessToken},transports:["websocket"],reconnection:false});
    sockets.push(socket);
    await Promise.race([socketOnce(socket,"session:ready"),socketOnce(socket,"connect_error").then(() => {throw new Error("Socket authentication failed");})]);
    return socket;
  };
  try {
    await t.test("Administration is protected and credentials are issued only once",async () => {
      await request(app).get("/v1/admin/projects").expect(401);
      const response = await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
        .send({slug,name:"Test Sabito",assistant_name:"Sabito",system_prompt:"Answer only from approved platform knowledge."}).expect(201);
      first = response.body.data;
      projectIds.push(first.project.id);
      assert.ok(first.credentials.clientId.startsWith("sab_"));
      assert.ok(first.credentials.clientSecret.startsWith("sbs_"));
      const list = await request(app).get("/v1/admin/projects").set("X-Admin-Key",adminKey).expect(200);
      assert.ok(!("credentials" in list.body.data.find((p:{id:string}) => p.id===first.project.id)));
      const stored = await pool.query(`SELECT secret_hash FROM sabito_core.project_credentials WHERE project_id=$1`,[first.project.id]);
      assert.ok(stored.rows[0].secret_hash !== first.credentials.clientSecret);
      await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
        .send({slug,name:"Duplicate",assistant_name:"Sabito",system_prompt:"Answer only from approved platform knowledge."}).expect(409);
    });
    await t.test("Public widget requires admin domain approval and only issues isolated guest sessions", async () => {
      const url = `/v1/widget/${first.project.id}/session`;
      const config = `/v1/admin/projects/${first.project.id}/widget`;
      const admin = { "x-admin-key": process.env.ADMIN_API_KEY! };
      await request(app).put(config).send({ origins: ["https://approved.example"] }).expect(401);
      await request(app).post(url).set("Origin", "https://approved.example").send({}).expect(403);
      await request(app).put(config).set(admin).send({ origins: ["https://approved.example/path"] }).expect(422);
      await request(app).put(config).set(admin).send({ origins: ["https://approved.example"] }).expect(200);
      await request(app).options(url).set("Origin", "https://approved.example").expect(204);
      await request(app).post(url).set("Origin", "https://evil.example").send({}).expect(403);
      await request(app).post(url).send({}).expect(403);
      const guest = await request(app).post(url).set("Origin", "https://approved.example").send({ external_user_id: "victim" }).expect(200);
      assert.equal(guest.headers["access-control-allow-origin"], "https://approved.example");
      assert.equal(guest.body.identity_type, "guest");
      assert.match(guest.body.external_user_id, /^widget-guest:/);
      const second = await request(app).post(url).set("Origin", "https://approved.example").send({}).expect(200);
      assert.notEqual(second.body.external_user_id, guest.body.external_user_id);
      const renewed = await request(app).post(url).set("Origin", "https://approved.example")
        .send({ visitor_token: guest.body.access_token }).expect(200);
      assert.equal(renewed.body.external_user_id, guest.body.external_user_id);
      await request(app).post(url).set("Origin", "https://approved.example").send({ visitor_token: "forged" }).expect(401);
      await request(app).put(config).set(admin).send({ origins: [] }).expect(200);
      await request(app).post(url).set("Origin", "https://approved.example").send({}).expect(403);
    });
    await t.test("Platform backend exchanges Basic credentials for user or guest tokens",async () => {
      await request(app).post("/v1/auth/token").send({}).expect(401);
      const auth = `Basic ${Buffer.from(`${first.credentials.clientId}:${first.credentials.clientSecret}`).toString("base64")}`;
      const response = await request(app).post("/v1/auth/token").set("Authorization",auth)
        .send({external_user_id:"test-user"}).expect(200);
      token = response.body.data.access_token;
      assert.equal(response.body.data.external_user_id,"test-user");
      assert.equal(response.body.data.socket_path,"/socket.io");
      const guest = await request(app).post("/v1/auth/token").set("Authorization",auth).send({}).expect(200);
      assert.equal(guest.body.data.identity_type,"guest");
      assert.ok(guest.body.data.external_user_id.startsWith("guest:"));
      const another = await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
        .send({slug:`${slug}-other`,name:"Autre plateforme",assistant_name:"Sabito",system_prompt:"Answer only from approved platform knowledge."}).expect(201);
      second=another.body.data;projectIds.push(second.project.id);
    });
    await t.test("Unknown answers are explicit and approved knowledge has real create/edit/delete",async () => {
      assert.ok(buildKnowledgeAnswer("formations",[]).includes("pas encore"));
      const created = await request(app).post(`/v1/admin/projects/${first.project.id}/knowledge`).set("X-Admin-Key",adminKey)
        .send({title:"Accès formations",content:"Les formations BCA sont accessibles depuis le menu Mes formations du tableau de bord."}).expect(201);
      const documentId=created.body.data.documentId;
      await request(app).put(`/v1/admin/projects/${second.project.id}/knowledge/${documentId}`).set("X-Admin-Key",adminKey)
        .send({title:"Mauvais propriétaire",content:"Ce contenu ne doit jamais remplacer la référence de la plateforme BCA."}).expect(404);
      await request(app).put(`/v1/admin/projects/${first.project.id}/knowledge/${documentId}`).set("X-Admin-Key",adminKey)
        .send({title:"Accès formations",content:"Les formations BCA sont accessibles depuis le menu Mes formations du tableau de bord."}).expect(200);
      const temporary = await request(app).post(`/v1/admin/projects/${first.project.id}/knowledge`).set("X-Admin-Key",adminKey)
        .send({title:"Référence temporaire",content:"Cette référence temporaire peut être supprimée par l’administrateur."}).expect(201);
      await request(app).delete(`/v1/admin/projects/${first.project.id}/knowledge/${temporary.body.data.documentId}`).set("X-Admin-Key",adminKey).expect(204);
      const listed = await request(app).get(`/v1/admin/projects/${first.project.id}/knowledge`).set("X-Admin-Key",adminKey).expect(200);
      assert.equal(listed.body.data.length,1);
    });
    await t.test("Socket.IO streams a source-backed local answer and persists it",async () => {
      const socket = await openSocket(token);
      const completed = socketOnce<{content:string}>(socket,"message:complete");
      let deltas = 0;
      socket.on("message:delta",() => deltas++);
      const ack = await new Promise<{ok:boolean;data:{conversationId:string}}>(resolve => {
        socket.emit("message:send",{idempotencyKey:randomUUID(),content:"Comment accéder aux formations BCA ?"},resolve);
      });
      assert.ok(ack.ok);
      conversationId = ack.data.conversationId;
      const [reply] = await completed;
      assert.ok(reply.content.includes("Mes formations"));
      assert.ok(reply.content.includes("[Source: Accès formations]"));
      assert.ok(deltas>0);
      const history = await request(app).get(`/v1/conversations/${conversationId}/messages`).set("Authorization",`Bearer ${token}`).expect(200);
      assert.equal(history.body.data.length,2);
      assert.ok(history.body.data.every((message:{status:string}) => message.status==="completed"));
    });
    await t.test("Conversations and knowledge cannot cross platforms or user identities",async () => {
      const otherToken = await request(app).post(`/v1/admin/projects/${second.project.id}/test-token`).set("X-Admin-Key",adminKey).expect(200);
      await request(app).get(`/v1/conversations/${conversationId}/messages`).set("Authorization",`Bearer ${otherToken.body.data.access_token}`).expect(404);
      const otherSocket = await openSocket(otherToken.body.data.access_token);
      const completed = socketOnce<{content:string}>(otherSocket,"message:complete");
      otherSocket.emit("message:send",{idempotencyKey:randomUUID(),content:"Comment accéder aux formations BCA ?"},() => {});
      const [reply] = await completed;
      assert.ok(!reply.content.includes("Mes formations"));
      const samePlatformDifferentUser = await request(app).post(`/v1/admin/projects/${first.project.id}/test-token`).set("X-Admin-Key",adminKey).expect(200);
      await request(app).get(`/v1/conversations/${conversationId}/messages`).set("Authorization",`Bearer ${samePlatformDifferentUser.body.data.access_token}`).expect(404);
    });
    await t.test("Concurrent identical retries create one message and one conversation",async () => {
      const input={projectId:first.project.id,externalUserId:"idempotency-test-user",content:"Une question stable",idempotencyKey:randomUUID()};
      const [a,b] = await Promise.all([acceptUserMessage(input),acceptUserMessage(input)]);
      assert.equal(a.conversationId,b.conversationId);
      assert.equal(a.messageId,b.messageId);
      assert.ok(a.isNew !== b.isNew);
      const conflict = await acceptUserMessage({...input,content:"Une autre question"});
      assert.ok(conflict.conflict);
    });
    await t.test("Rotation revokes old credentials, existing tokens and connected sockets",async () => {
      const disconnected = socketOnce(sockets[0],"disconnect");
      const replacement = await request(app).post(`/v1/admin/projects/${first.project.id}/credentials/rotate`).set("X-Admin-Key",adminKey).expect(200);
      await disconnected;
      const oldAuth=`Basic ${Buffer.from(`${first.credentials.clientId}:${first.credentials.clientSecret}`).toString("base64")}`;
      await request(app).post("/v1/auth/token").set("Authorization",oldAuth).send({}).expect(401);
      await request(app).get(`/v1/conversations/${conversationId}/messages`).set("Authorization",`Bearer ${token}`).expect(401);
      const fresh=replacement.body.data;
      const freshAuth=`Basic ${Buffer.from(`${fresh.clientId}:${fresh.clientSecret}`).toString("base64")}`;
      await request(app).post("/v1/auth/token").set("Authorization",freshAuth).send({external_user_id:"test-user"}).expect(200);
      const rejected=io(localTestAddress,{auth:{token},transports:["websocket"],reconnection:false});
      sockets.push(rejected);
      await socketOnce(rejected,"connect_error");
      assert.ok(!rejected.connected);
    });
  } finally {
    sockets.forEach(socket => socket.disconnect());
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (httpServer.listening) await new Promise<void>(resolve => httpServer.close(() => resolve()));
    if (projectIds.length) {
      if (databaseDialect === "mysql") {
        for (const id of projectIds) {
          await pool.query(`DELETE FROM sabito_core.audit_logs WHERE project_id=$1`,[id]);
          await pool.query(`DELETE FROM sabito_core.projects WHERE id=$1`,[id]);
        }
      } else {
        await pool.query(`DELETE FROM sabito_core.audit_logs WHERE project_id=ANY($1::uuid[])`,[projectIds]);
        await pool.query(`DELETE FROM sabito_core.projects WHERE id=ANY($1::uuid[])`,[projectIds]);
      }
    }
    await pool.end();
  }
});
