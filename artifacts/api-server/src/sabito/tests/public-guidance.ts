import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Express } from "express";
import type { Socket } from "socket.io-client";
import request from "supertest";
import { createConversation } from "../conversations";
import { signAccessToken } from "../security";
import { publicGuidance } from "../public-guidance";

export async function verifyPublicGuidance({app,adminKey,projectIds,openSocket}:{
  app:Express;adminKey:string;projectIds:string[];openSocket:(token:string)=>Promise<Socket>;
}) {
  const created=(await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
    .send({slug:`guidance-${randomUUID()}`,name:"Buzz Booster",assistant_name:"Sabito",
      system_prompt:"Répondre avec les informations approuvées sans exécuter de paiement."}).expect(201)).body.data;
  const id=created.project.id,credentials=created.credentials;projectIds.push(id);
  const guest={sub:id,clientId:credentials.clientId,externalUserId:`guest:${randomUUID()}`,scope:["chat:connect"]};
  const socket=await openSocket(signAccessToken(guest));
  let conversationId=await createConversation(id,guest.externalUserId);
  const send=(client:Socket,conversation:string,content:string)=>new Promise<{content:string}>((resolve,reject)=>{
    const timer=setTimeout(()=>{client.off("message:complete",done);reject(new Error("GUIDANCE_TIMEOUT"));},20000);
    const done=(m:{content:string})=>{clearTimeout(timer);resolve(m);};
    client.once("message:complete",done);
    client.emit("message:send",{conversationId:conversation,content,idempotencyKey:randomUUID()},(ack:{ok:boolean;error?:{code:string}})=>{
      if(!ack.ok){clearTimeout(timer);client.off("message:complete",done);reject(new Error(`GUIDANCE_REJECTED:${ack.error?.code}`));}
    });
  });
  let answer=(await send(socket,conversationId,"Je veux faire le dépôt au Sénégal")).content;
  assert.match(answer,/Recharger/);assert.match(answer,/Quel moyen de paiement/);
  assert.equal((answer.match(/\?/g)??[]).length,1);
  assert.doesNotMatch(answer,/référence|connexion membre|numéro de transaction|oui ou non|question précédente/i);
  answer=(await send(socket,conversationId,"Wave")).content;
  assert.match(answer,/wave.*senegal/i);assert.match(answer,/application ou la page Wave/);
  assert.doesNotMatch(answer,/Quel moyen|Quel pays|communiquer.*référence/i);
  assert.equal(await publicGuidance({...guest,externalUserId:"other-user"},conversationId,"Wave",randomUUID()),null);
  // The context survives a fresh socket, not just client component state.
  const second=await openSocket(signAccessToken(guest));
  answer=(await send(second,conversationId,"Orange Money")).content;
  assert.match(answer,/orange money.*senegal/i);
  conversationId=await createConversation(id,guest.externalUserId);
  answer=(await send(socket,conversationId,"jvx bosster")).content;
  assert.match(answer,/Nouvelle commande/);assert.match(answer,/Quel réseau social/);
  assert.equal((answer.match(/\?/g)??[]).length,1);
  answer=(await send(socket,conversationId,"Instagram")).content;
  assert.match(answer,/instagram.*quel est votre objectif/i);
  assert.doesNotMatch(answer,/Quel réseau|numéro de commande|connectez-vous/i);
  answer=(await send(socket,conversationId,"vues")).content;
  assert.match(answer,/vues sur instagram/i);assert.match(answer,/n’ai pas consulté de catalogue membre/);
  assert.doesNotMatch(answer,/Quel réseau|quel est votre objectif|vous connecter/i);
  answer=(await send(socket,conversationId,"Je veux annuler ma commande 162717")).content;
  assert.match(answer,/demander l’annulation/);assert.match(answer,/n’exécute pas/);
  assert.doesNotMatch(answer,/commande.*annulée avec succès/i);
  conversationId=await createConversation(id,guest.externalUserId);
  await send(socket,conversationId,"Pourquoi mon dépôt ne passe pas avec MTN au Cameroun ?");
  answer=(await send(socket,conversationId,"Numéro invalide")).content;
  assert.match(answer,/format attendu/);assert.doesNotMatch(answer,/Quel message d’erreur/);
  const member={...guest,externalUserId:`member-${randomUUID()}`,scope:["chat:connect","member:verified"]};
  const memberSocket=await openSocket(signAccessToken(member));
  conversationId=await createConversation(id,member.externalUserId);
  const poll=()=>request(app).post("/v1/backend/jobs/poll").auth(credentials.clientId,credentials.clientSecret)
    .send({operations:["service_catalog","service_recommendations","order_status"]});
  assert.deepEqual((await poll().expect(200)).body.jobs,[],"Public guides never dispatch member jobs");
  const pending=send(memberSocket,conversationId,"Je veux des vues TikTok");
  let found:{id:string;operation:string;external_user_id:string;fields:Record<string,string>}|undefined;
  for(let i=0;i<100&&!found;i++) {
    found=(await poll().expect(200)).body.jobs[0];
    if(!found)await new Promise(r=>setTimeout(r,20));
  }
  assert.ok(found);assert.equal(found.operation,"service_catalog");
  assert.equal(found.external_user_id,member.externalUserId);
  assert.equal(found.fields.network.toLowerCase(),"tiktok");assert.equal(found.fields.goal,"vues");
  assert.equal(found.fields.quantity,undefined);assert.equal(found.fields.budget_xaf,undefined);
  await request(app).post(`/v1/backend/jobs/${found.id}/result`).auth(credentials.clientId,credentials.clientSecret)
    .send({result:{status:"not_found"}}).expect(200);
  answer=(await pending).content;
  assert.match(answer,/Nouvelle commande/);assert.match(answer,/Aucun service correspondant.*catalogue consulté/);
  assert.doesNotMatch(answer,/Quel réseau|Quel est votre objectif|Quelle quantité|Quel est votre budget/i);
  // A stale help topic cannot reinterpret arbitrary numbers or other questions.
  assert.equal(await publicGuidance(member,conversationId,"162717",randomUUID()),null);
  assert.equal(await publicGuidance(member,conversationId,"Vérifie ma commande 162717",randomUUID()),null);
  conversationId=await createConversation(id,guest.externalUserId);
  answer=(await send(socket,conversationId,"Quel est le but de la plateforme ?")).content;
  assert.match(answer,/audience apparente/);assert.match(answer,/Quel réseau social/);
  assert.doesNotMatch(answer,/communiqu.*référence|connectez-vous/i);
  answer=(await send(socket,conversationId,"Instagram")).content;
  assert.match(answer,/instagram.*quel est votre objectif/i);
  conversationId=await createConversation(id,guest.externalUserId);
  answer=(await send(socket,conversationId,"J’ai 1000f, je veux faire un boostage, que me conseilles-tu ?")).content;
  assert.match(answer,/1000/);assert.match(answer,/Quel réseau social/);
  assert.doesNotMatch(answer,/Pour recharger votre solde|référence/i);
  answer=(await send(socket,conversationId,"TikTok")).content;
  assert.match(answer,/quel est votre objectif/i);
  answer=(await send(socket,conversationId,"vues")).content;
  assert.match(answer,/XAF et XOF/);
  answer=(await send(socket,conversationId,"XAF")).content;
  assert.match(answer,/portefeuille.*frais compris/i);
  answer=(await send(socket,conversationId,"somme totale frais compris")).content;
  assert.match(answer,/montant net en XAF/);
  answer=(await send(socket,conversationId,"900")).content;
  assert.match(answer,/vues sur tiktok/i);assert.match(answer,/connexion membre autorisée/i);
  assert.deepEqual((await poll().expect(200)).body.jobs,[],"Guest budget guidance must not query a member catalogue");
  conversationId=await createConversation(id,member.externalUserId);
  answer=(await send(memberSocket,conversationId,"J’ai 1000 FCFA, je veux booster 100 vues TikTok")).content;
  assert.match(answer,/XAF et XOF/);
  assert.deepEqual((await poll().expect(200)).body.jobs,[],"An ambiguous currency cannot be dispatched as XAF");
  answer=(await send(memberSocket,conversationId,"XAF")).content;
  assert.match(answer,/portefeuille.*frais compris/i);
  assert.deepEqual((await poll().expect(200)).body.jobs,[],"Gross and net spending must be distinguished before comparison");
  const budgetPending=send(memberSocket,conversationId,"déjà disponible dans mon portefeuille");
  found=undefined;
  for(let i=0;i<100&&!found;i++){
    found=(await poll().expect(200)).body.jobs[0];
    if(!found)await new Promise(r=>setTimeout(r,20));
  }
  assert.ok(found);assert.equal(found.operation,"service_recommendations");
  assert.equal(found.fields.quantity,"100");assert.equal(found.fields.budget_xaf,"1000");
  assert.equal(found.fields.network.toLowerCase(),"tiktok");assert.equal(found.fields.goal,"vues");
  assert.equal(found.external_user_id,member.externalUserId);
  await request(app).post(`/v1/backend/jobs/${found.id}/result`).auth(credentials.clientId,credentials.clientSecret)
    .send({result:{status:"not_found"}}).expect(200);
  answer=(await budgetPending).content;
  assert.match(answer,/Aucun service correspondant.*catalogue consulté/);assert.match(answer,/respecte les limites/);
  const whatsappMember={...member,externalUserId:`whatsapp-${randomUUID()}`};
  const whatsappSocket=await openSocket(signAccessToken(whatsappMember));
  const whatsappConversation=await createConversation(id,whatsappMember.externalUserId);
  answer=(await send(whatsappSocket,whatsappConversation,"Je veux des vues WhatsApp")).content;
  assert.match(answer,/statuts WhatsApp.*chaîne/);
  answer=(await send(whatsappSocket,whatsappConversation,"je suis connecté")).content;
  assert.match(answer,/statuts WhatsApp.*chaîne/);
  assert.deepEqual((await poll().expect(200)).body.jobs,[],"WhatsApp subtype must be clarified before a lookup");
  const whatsappPending=send(whatsappSocket,whatsappConversation,"statuts");
  found=undefined;
  for(let i=0;i<100&&!found;i++){
    found=(await poll().expect(200)).body.jobs[0];
    if(!found)await new Promise(r=>setTimeout(r,20));
  }
  assert.ok(found);assert.equal(found.fields.query,"statuts");
  assert.equal(found.external_user_id,whatsappMember.externalUserId);
  await request(app).post(`/v1/backend/jobs/${found.id}/result`).auth(credentials.clientId,credentials.clientSecret)
    .send({result:{status:"not_found"}}).expect(200);
  assert.match((await whatsappPending).content,/Aucun service correspondant.*catalogue consulté/);
  // An independent visitor exercises FAQ without exhausting the deliberate
  // per-member flood limit during this synthetic rapid-fire protocol suite.
  const faqGuest={...guest,externalUserId:`guest:${randomUUID()}`};
  const faqSocket=await openSocket(signAccessToken(faqGuest));
  const faqCases=[
    ["cmt accder a la platteforme ?","Inscription"],
    ["Pourquoi choisir Buzz Booster ?","plusieurs catalogues"],
    ["Quels réseaux sont disponibles ?","exemples possibles"],
    ["Les vues et les abonnés gagnés ont-ils une expiration ?","Il n’existe pas de durée unique"],
    ["La plateforme est-elle fiable ?","ne prouve pas la satisfaction"],
    ["La plateforme est disponible dans quels pays ?","inscription ne prouvent pas"],
  ];
  for(const [question,expected]of faqCases){
    conversationId=await createConversation(id,faqGuest.externalUserId);
    answer=(await send(faqSocket,conversationId,question)).content;
    assert.ok(answer.includes(expected),`${question}: ${answer}`);
    assert.doesNotMatch(answer,/communiquez.*(?:référence|numéro)|vérifier votre transaction/i);
    assert.equal((answer.match(/\?/g)??[]).length<=1,true,"Only one useful question at a time");
  }
  answer=(await send(faqSocket,conversationId,"Sénégal")).content;
  assert.match(answer,/Quel moyen de paiement/);
  conversationId=await createConversation(id,faqGuest.externalUserId);
  await send(faqSocket,conversationId,"Buzz Booster agit sur quelles applications ?");
  answer=(await send(faqSocket,conversationId,"Instagram")).content;
  assert.match(answer,/instagram.*quel est votre objectif/i);
  assert.deepEqual((await poll().expect(200)).body.jobs,[],"General FAQs and guest follow-ups do not dispatch member jobs");
  const knowledgeUrl=`/v1/admin/projects/${id}/knowledge`;
  const access=(await request(app).get(knowledgeUrl).set("X-Admin-Key",adminKey).expect(200)).body.data
    .find((doc:{title:string})=>doc.title==="Comment faire pour accéder à la plateforme ?");
  assert.ok(access);
  const customAccess="Ouvrez le site officiel configuré par l’administration : https://example.org/buzz-official . Si vous avez un compte, utilisez Connexion.";
  await request(app).put(`${knowledgeUrl}/${access.id}`).set("X-Admin-Key",adminKey)
    .send({title:access.title,content:customAccess,variantes_de_question:access.variantes_de_question}).expect(200);
  conversationId=await createConversation(id,faqGuest.externalUserId);
  answer=(await send(faqSocket,conversationId,"Comment accéder à Buzz Booster ?")).content;
  assert.ok(!answer.includes("https://example.org/buzz-official"),
    "A newly edited official URL remains private until explicit administrator approval");
  const reviewUrl=`/v1/admin/projects/${id}/knowledge-review/${access.id}`;
  await request(app).put(reviewUrl).set("X-Admin-Key",adminKey).send({
    title:access.title,content:customAccess,category:"Accès à la plateforme",
    keywords:["accès","connexion","inscription"],
    source:"Scénario de test isolé : URL officielle fournie et vérifiée par l’administrateur.",
    variants:["Comment accéder à Buzz Booster ?","Où ouvrir la plateforme ?",
      "Quel site officiel utiliser ?","Comment rejoindre la plateforme ?","Où se connecter à Buzz Booster ?"],
  }).expect(200);
  await request(app).post(`${reviewUrl}/decision`).set("X-Admin-Key",adminKey)
    .send({decision:"approve"}).expect(200);
  conversationId=await createConversation(id,faqGuest.externalUserId);
  answer=(await send(faqSocket,conversationId,"Comment accéder à Buzz Booster ?")).content;
  assert.ok(answer.startsWith(customAccess),"Configured official URL is read from the approved reference, never inferred");
  const generic=(await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
    .send({slug:`other-${randomUUID()}`,name:"Other platform",assistant_name:"Sabito",
      system_prompt:"Utiliser les références approuvées de cette plateforme uniquement."}).expect(201)).body.data;
  projectIds.push(generic.project.id);
  const other={...guest,sub:generic.project.id,clientId:generic.credentials.clientId};
  const otherConversation=await createConversation(other.sub,other.externalUserId);
  assert.equal(await publicGuidance(other,otherConversation,"Je veux booster",randomUUID()),null);
}
