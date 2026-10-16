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
import { knowledgeReply } from "./knowledge-answer";
import { acceptUserMessage, createConversation } from "./conversations";
import { recordUnanswered } from "./unanswered";
import { handleIntent } from "./intents";
import { verifyAccessToken,signAccessToken } from "./security";
import { defaultSettings,readAssistantSettings } from "./assistant-settings";
import { retrieveReply,scoreQuestion } from "./question-search";
import { conversationGreeting } from "./welcome";
import { searchKnowledge } from "./knowledge";
import { semanticSimilarity } from "./semantic";

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
  const openSocket = async (accessToken: string, pollingOnly = false) => {
    const socket = io(localTestAddress,{auth:{token:accessToken},transports:pollingOnly ? ["polling"] : ["websocket"],reconnection:false});
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
        .send({title:"Accès formations",content:"Les formations BCA sont accessibles depuis le menu Mes formations du tableau de bord.",variantes_de_question:["Comment accéder aux formations BCA ?"]}).expect(201);
      const documentId=created.body.data.documentId;
      await request(app).put(`/v1/admin/projects/${second.project.id}/knowledge/${documentId}`).set("X-Admin-Key",adminKey)
        .send({title:"Mauvais propriétaire",content:"Ce contenu ne doit jamais remplacer la référence de la plateforme BCA."}).expect(404);
      await request(app).put(`/v1/admin/projects/${first.project.id}/knowledge/${documentId}`).set("X-Admin-Key",adminKey)
        .send({title:"Accès formations",content:"Les formations BCA sont accessibles depuis le menu Mes formations du tableau de bord.",variantes_de_question:["Comment accéder aux formations BCA ?"]}).expect(200);
      const temporary = await request(app).post(`/v1/admin/projects/${first.project.id}/knowledge`).set("X-Admin-Key",adminKey)
        .send({title:"Référence temporaire",content:"Cette référence temporaire peut être supprimée par l’administrateur."}).expect(201);
      await request(app).delete(`/v1/admin/projects/${first.project.id}/knowledge/${temporary.body.data.documentId}`).set("X-Admin-Key",adminKey).expect(204);
      const listed = await request(app).get(`/v1/admin/projects/${first.project.id}/knowledge`).set("X-Admin-Key",adminKey).expect(200);
      assert.equal(listed.body.data.length,1);
    });
    await t.test("Socket.IO HTTP polling streams a source-backed local answer and persists it without WebSocket",async () => {
      const socket = await openSocket(token, true);
      assert.equal(socket.io.engine.transport.name, "polling");
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
      assert.ok(!reply.content.includes("[Source:"));
      assert.ok(deltas>0);
      const history = await request(app).get(`/v1/conversations/${conversationId}/messages`).set("Authorization",`Bearer ${token}`).expect(200);
      assert.equal(history.body.data.length,2);
      assert.ok(history.body.data.every((message:{status:string}) => message.status==="completed"));
      assert.equal(history.body.data.find((message:{role:string}) => message.role === "assistant").content, reply.content);
    });
    await t.test("Unanswered inbox is authenticated, deduplicated, isolated and resolves atomically into knowledge",async () => {
      const url = `/v1/admin/projects/${first.project.id}/unanswered`;
      await request(app).get(url).expect(401);
      await Promise.all(Array.from({length:6}, () => recordUnanswered(first.project.id,"Où trouver le justificatif cosmique ?", "test-user")));
      await recordUnanswered(first.project.id,"OU trouver le justificatif cosmique!");
      await recordUnanswered(second.project.id,"Où trouver le justificatif cosmique ?");
      const list = await request(app).get(url).set("X-Admin-Key",adminKey).expect(200);
      const item = list.body.data.find((q:{question:string}) => q.question.includes("justificatif"));
      assert.equal(Number(item.nombre_de_fois_posee),7);
      await request(app).post(`/v1/admin/projects/${second.project.id}/unanswered/${item.id}/answer`)
        .set("X-Admin-Key",adminKey).send({content:"Le justificatif est disponible auprès de votre conseiller."}).expect(409);
      await request(app).post(`${url}/${item.id}/answer`).set("X-Admin-Key",adminKey)
        .send({content:"Le justificatif est disponible auprès de votre conseiller."}).expect(201);
      await request(app).post(`${url}/${item.id}/answer`).set("X-Admin-Key",adminKey)
        .send({content:"Ne pas créer une deuxième référence pour cette question."}).expect(409);
      const done = await request(app).get(`${url}?status=traite`).set("X-Admin-Key",adminKey).expect(200);
      assert.ok(done.body.data.some((q:{id:string;document_id:string}) => q.id === item.id && q.document_id));
    });
    await t.test("Uncertain questions refuse an exact answer and propose at most three approved references",async () => {
      const reply = knowledgeReply("Le montant du solde bancaire intergalactique ?", [
        {title:"Solde pédagogique",content:"Le solde pédagogique figure dans le menu des formations."},
        {title:"Factures",content:"Les factures validées sont disponibles auprès du support."},
        {title:"Assistance",content:"Notre assistance vous accompagne sur les questions documentées."},
        {title:"Quatrième",content:"Cette référence ne doit pas être proposée en quatrième position."},
      ]);
      assert.equal(reply.reliable,false);
      assert.match(reply.answer,/pas encore.*répondre/);
      assert.ok(!reply.answer.includes("Quatrième"));
      assert.ok(!reply.answer.includes("[Source:"));
      assert.equal(knowledgeReply("Mystère sans aucune référence",[]).reliable,false);
    });
    await t.test("Offline backend creates a protected support ticket without inventing a personal result",async () => {
      const claims=verifyAccessToken(token);
      const conv=await createConversation(first.project.id,claims.externalUserId);
      const answer=await handleIntent(claims,conv,"Quel est mon code parrain ?");
      assert.ok(answer?.includes("Un ticket a été créé"));
      assert.ok(!answer?.includes("Votre code parrain est"));
      const url=`/v1/admin/projects/${first.project.id}/tickets`;
      await request(app).get(url).expect(401);
      const tickets=await request(app).get(url).set("X-Admin-Key",adminKey).expect(200);
      const item=tickets.body.data.find((t:{conversation_id:string})=>t.conversation_id===conv);
      assert.equal(item.reason,"BACKEND_OFFLINE");
      await request(app).patch(`${url}/${item.id}`).set("X-Admin-Key",adminKey).send({status:"ferme"}).expect(200);
      await request(app).get(`${url}/${item.id}/messages`).set("X-Admin-Key",adminKey).expect(200);
      await request(app).get(`/v1/admin/projects/${second.project.id}/tickets/${item.id}/messages`).set("X-Admin-Key",adminKey).expect(404);
    });
    await t.test("Existing platform keys authenticate live jobs; identity, fields, results and tenant isolation are enforced",async () => {
      const basic=`Basic ${Buffer.from(`${first.credentials.clientId}:${first.credentials.clientSecret}`).toString("base64")}`;
      const other=`Basic ${Buffer.from(`${second.credentials.clientId}:${second.credentials.clientSecret}`).toString("base64")}`;
      await request(app).post("/v1/backend/jobs/poll").set("Authorization",`Bearer ${token}`).expect(401);
      await request(app).post("/v1/backend/jobs/poll").set("Authorization",basic).set("Origin","https://bca.example").expect(403);
      await request(app).post("/v1/backend/jobs/poll").set("Authorization",basic).expect(200);
      const claims=verifyAccessToken(token),conv=await createConversation(first.project.id,claims.externalUserId);
      assert.ok((await handleIntent(claims,conv,"Mon dépôt n'est pas reçu"))?.includes("numéro de dépôt"));
      assert.ok((await handleIntent(claims,conv,"DEP-42"))?.includes("quel pays"));
      assert.ok((await handleIntent(claims,conv,"Cameroun"))?.includes("moyen de paiement"));
      assert.ok((await handleIntent(claims,conv,"Mobile Money"))?.includes("ID de la transaction"));
      const answering=handleIntent(claims,conv,"TX-42");
      let job:any;
      for(let attempt=0;attempt<40 && !job;attempt++){
        await new Promise(resolve=>setTimeout(resolve,10));
        const polled=await request(app).post("/v1/backend/jobs/poll").set("Authorization",basic).expect(200);
        job=polled.body.jobs[0];
      }
      assert.ok(job);
      assert.equal(job.external_user_id,"test-user");
      assert.equal(job.operation,"deposit_status");
      assert.deepEqual(job.fields,{deposit_number:"DEP-42",country:"Cameroun",payment_method:"Mobile Money",transaction_id:"TX-42"});
      await request(app).post(`/v1/backend/jobs/${job.id}/result`).set("Authorization",other).send({result:{status:"confirmed"}}).expect(404);
      await request(app).post(`/v1/backend/jobs/${job.id}/result`).set("Authorization",basic).send({result:{status:"confirmed",arbitraryData:"blocked"}}).expect(422);
      await request(app).post(`/v1/backend/jobs/${job.id}/result`).set("Authorization",basic).send({result:{status:"confirmed"}}).expect(200);
      assert.ok((await answering)?.includes("confirme que votre dépôt a été reçu"));
      await request(app).post(`/v1/backend/jobs/${job.id}/result`).set("Authorization",basic).send({result:{status:"confirmed"}}).expect(404);
      const stolen={...claims,sub:second.project.id};
      await assert.rejects(handleIntent(stolen,conv,"Mon dépôt est non reçu"),/CONVERSATION_NOT_FOUND/);
    });
    await t.test("Anonymous referral gives the approved guide; anonymous financial checks never reach the backend",async () => {
      const basic=`Basic ${Buffer.from(`${second.credentials.clientId}:${second.credentials.clientSecret}`).toString("base64")}`;
      const issued=await request(app).post("/v1/auth/token").set("Authorization",basic).send({}).expect(200);
      const claims=verifyAccessToken(issued.body.data.access_token);
      const conv=await createConversation(second.project.id,claims.externalUserId);
      const guide=await handleIntent(claims,conv,"Mon code parrain");
      assert.ok(guide?.includes("Connectez-vous"));
      assert.ok(!guide?.includes("Biz Connect Academy"),"A different platform must not inherit BCA navigation");
      await handleIntent(claims,conv,"Compte non activé");
      for(const field of ["DEP-44","Cameroun","Carte bancaire"]) await handleIntent(claims,conv,field);
      assert.ok((await handleIntent(claims,conv,"TX-44"))?.includes("connexion membre vérifiée"));
      const polled=await request(app).post("/v1/backend/jobs/poll").set("Authorization",basic).expect(200);
      assert.equal(polled.body.jobs.length,0);
    });
    await t.test("Approved question variants support semantic paraphrases, edits, deletion and ambiguous-answer refusal",async () => {
      assert.equal(semanticSimilarity("voir mes cours","accéder aux formations"),1);
      assert.ok(semanticSimilarity("supprimer mon compte","créer mon compte")<0.85);
      const url=`/v1/admin/projects/${first.project.id}/knowledge`;
      const content="Les modules sont disponibles dans votre espace pédagogique, rubrique Bibliothèque.";
      const created=await request(app).post(url).set("X-Admin-Key",adminKey).send({
        title:"Documentation pédagogique",content,variantes_de_question:["Comment accéder à mes formations ?","Où voir mes cours ?"],
      }).expect(201);
      const id=created.body.data.documentId;
      const matches=await searchKnowledge(first.project.id,"Je souhaite consulter mes leçons");
      assert.equal(knowledgeReply("Je souhaite consulter mes leçons",matches).answer,content);
      assert.ok(!((await searchKnowledge(second.project.id,"Je souhaite consulter mes leçons")).some(row=>row.documentId===id)));
      const listed=await request(app).get(url).set("X-Admin-Key",adminKey).expect(200);
      assert.equal(listed.body.data.find((doc:{id:string})=>doc.id===id).variantes_de_question.length,2);
      const duplicate=await request(app).post(url).set("X-Admin-Key",adminKey).send({
        title:"Autre documentation",content:"Une autre réponse approuvée mais différente ne doit pas être choisie arbitrairement.",
        variantes_de_question:["Comment accéder à mes formations ?"],
      }).expect(201);
      assert.equal(knowledgeReply("Je souhaite consulter mes leçons",await searchKnowledge(first.project.id,"Je souhaite consulter mes leçons")).reliable,false);
      await request(app).delete(`${url}/${duplicate.body.data.documentId}`).set("X-Admin-Key",adminKey).expect(204);
      await request(app).put(`${url}/${id}`).set("X-Admin-Key",adminKey).send({
        title:"Documentation pédagogique",content,variantes_de_question:[],
      }).expect(200);
      const edited=await request(app).get(url).set("X-Admin-Key",adminKey).expect(200);
      assert.deepEqual(edited.body.data.find((doc:{id:string})=>doc.id===id).variantes_de_question,[]);
      await request(app).post(url).set("X-Admin-Key",adminKey).send({
        title:"Trop de variantes",content,variantes_de_question:Array.from({length:31},(_,index)=>`Question ${index}`),
      }).expect(422);
      await request(app).delete(`${url}/${id}`).set("X-Admin-Key",adminKey).expect(204);
      assert.ok(!(await searchKnowledge(first.project.id,"Je souhaite consulter mes leçons")).some(row=>row.documentId===id));
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
    await t.test("Configuration is protected, revision-controlled, literal and immediately invalidates the search cache",async()=>{
      const url=`/v1/admin/projects/${second.project.id}/assistant-settings`;
      await request(app).get(url).expect(401);
      const before=await request(app).get(url).set("X-Admin-Key",adminKey).expect(200);
      const settings={...before.body.settings,no_answer_message:"Réponse administrateur : aucune correspondance.",closing_message:"Texte de clôture administrateur.",
        synonyms:[...before.body.settings.synonyms,["souscrire","adhérer"]]};
      await request(app).put(url).set("X-Admin-Key",adminKey).send({settings,expected_revision:before.body.revision}).expect(200);
      await request(app).put(url).set("X-Admin-Key",adminKey).send({settings,expected_revision:before.body.revision}).expect(409);
      const reply=await retrieveReply(second.project.id,"Mystère xylophonique inconnu");
      assert.equal(reply.answer,settings.no_answer_message);assert.equal(reply.closing_message,settings.closing_message);
      assert.ok(reply.suggestions.length<=3);
      assert.ok(scoreQuestion("Je veux adhérer","Je veux souscrire",settings)>.9);
      assert.ok(scoreQuestion("ma transaction","ma transacion",settings)>.7);
      assert.ok(scoreQuestion("supprimer mon compte","créer mon compte",settings)<.72);
    });
    await t.test("New configured intents dispatch registered backend functions, interpolate trusted data, and can be disabled without code changes",async()=>{
      const id=second.project.id,url=`/v1/admin/projects/${id}/assistant-settings`;
      const current=await readAssistantSettings(id);
      const settings={...current.settings,intents:[...current.settings.intents,{
        id:"invoice_status",name:"Suivi facture",enabled:true,triggers:["Suivre la facture"],
        fields:[{name:"invoice_number",prompt:"Quel numéro de facture ?",type:"identifier",min_length:2,max_length:30}],
        backend_function:"invoice_status",guest_message:"Connectez-vous pour consulter votre facture.",
        responses:{success:"Facture {numero} : {etat}.",pending:"Vérification en attente.",not_found:"Facture introuvable.",error:"Vérification indisponible."},
      }]};
      await request(app).put(url).set("X-Admin-Key",adminKey).send({settings,expected_revision:current.revision}).expect(200);
      const auth=()=>request(app).post("/v1/backend/jobs/poll").auth(second.credentials.clientId,second.credentials.clientSecret)
        .send({operations:["invoice_status","user_profile"]});
      await auth().expect(200);
      const claims={sub:id,clientId:second.credentials.clientId,externalUserId:"invoice-member",scope:["chat:connect","member:verified"]};
      const conv=await createConversation(id,claims.externalUserId);
      assert.match((await handleIntent(claims,conv,"Suivre la facture"))!,/numéro de facture/);
      const answer=handleIntent(claims,conv,"FCT-7");
      async function completeJob(operation:string,data:Record<string,string>) {
        for(let attempt=0;attempt<100;attempt++) {
          const polled=await auth().expect(200),job=polled.body.jobs.find((j:{operation:string})=>j.operation===operation);
          if(job) {
            assert.equal(job.external_user_id,claims.externalUserId);
            await request(app).post(`/v1/backend/jobs/${job.id}/result`).auth(second.credentials.clientId,second.credentials.clientSecret)
              .send({result:{status:"ok",data}}).expect(200);return;
          }
          await new Promise(resolve=>setTimeout(resolve,10));
        }
        assert.fail("Configured backend operation was not delivered");
      }
      await completeJob("invoice_status",{numero:"FCT-7",etat:"confirmée"});
      assert.equal(await answer,"Facture FCT-7 : confirmée.");
      const greeting=conversationGreeting(claims,conv);
      await completeJob("user_profile",{nom_utilisateur:"Léa"});
      assert.equal(await greeting,"Bonjour Léa 👋, comment puis-je vous aider ?");
      const next=await readAssistantSettings(id);
      next.settings.intents.find(i=>i.id==="invoice_status")!.enabled=false;
      await request(app).put(url).set("X-Admin-Key",adminKey).send({settings:next.settings,expected_revision:next.revision}).expect(200);
      assert.equal(await handleIntent(claims,await createConversation(id,claims.externalUserId),"Suivre la facture"),null);
    });
    await t.test("500 simultaneous conversations receive their own authored answer with no missing or mixed messages",async()=>{
      const response=await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
        .send({slug:`load-${randomUUID()}`,name:"Isolated load test",assistant_name:"Sabito",system_prompt:"Return only approved administrator answers."}).expect(201);
      const fixture=response.body.data;projectIds.push(fixture.project.id);
      const values:unknown[]=[],rows:string[]=[];
      for(let i=0;i<500;i++) {
        const offset=values.length;rows.push(`($${offset+1},$${offset+2},$${offset+3},$${offset+4},'ready')`);
        values.push(randomUUID(),fixture.project.id,`Question charge identifiant${i}`,`Réponse approuvée identifiant${i}.`);
      }
      await pool.query(`INSERT INTO sabito_core.knowledge_documents(id,project_id,title,content,status) VALUES ${rows.join(",")}`,values);
      const started=Date.now(),ids=new Set<string>();
      await Promise.all(Array.from({length:500},async(_,i)=>{
        const loadToken=signAccessToken({sub:fixture.project.id,clientId:fixture.credentials.clientId,
          externalUserId:`load-user-${i}`,externalUserName:`Membre ${i}`,scope:["chat:connect","member:verified"]});
        const client=await openSocket(loadToken);
        const greeting=await client.timeout(30000).emitWithAck("conversation:start",{});
        assert.ok(greeting.ok);assert.ok(greeting.data.greeting.includes(`Membre ${i}`));
        ids.add(greeting.data.conversationId);
        const complete=socketOnce<{content:string;conversationId:string;suggestions:unknown[]}>(client,"message:complete");
        const ack=await client.timeout(60000).emitWithAck("message:send",{conversationId:greeting.data.conversationId,
          idempotencyKey:randomUUID(),content:`Question charge identifiant${i}`});
        assert.ok(ack.ok);
        const [answer]=await complete;
        assert.equal(answer.content,`Réponse approuvée identifiant${i}.`);
        assert.equal(answer.conversationId,greeting.data.conversationId);
        assert.ok(answer.suggestions.length<=3);
        client.disconnect();
      }));
      assert.equal(ids.size,500);
      const saved=await pool.query(`SELECT COUNT(*) AS n FROM sabito_core.messages WHERE project_id=$1 AND status='completed'`,[fixture.project.id]);
      assert.equal(Number(saved.rows[0].n),1000);
      console.info(`LOAD_TEST: 500/500 conversations, 1000/1000 completed messages, ${Date.now()-started}ms (isolated local database).`);
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
