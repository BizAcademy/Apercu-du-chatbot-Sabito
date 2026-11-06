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
import { bcaOwnerFaq,bcaOwnerCorrections,bcaOwnerPrivateAliases } from "../bca-owner-answers";
import { detectIntent } from "../question-search";
import { bcaLegacyQuestionFaq } from "../bca-question-followups";
import { bcaSupportAliases,bcaSupportTemplates } from "../bca-support-questions";
import { bcaScenario } from "../bca-dialogue-rules";
import { bcaNovemberRoutes,bcaNovemberDrafts } from "../bca-november-questions";
import { bcaTrainingQuestion } from "../bca-owner-clarifications";
import { bcaCurrentRoutes } from "../bca-current-questions";

export async function verifyBcaFaq({app,adminKey,projectIds,openSocket}:{
  app:Express;adminKey:string;projectIds:string[];openSocket:(token:string)=>Promise<Socket>;
}) {
  const {project,credentials}=(await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey)
    .send({slug:`bca-faq-${randomUUID()}`,name:"Biz Connect Academy",assistant_name:"Sabito",
      system_prompt:"Utiliser les références approuvées et ne jamais inventer de résultat financier."}).expect(201)).body.data;
  const id=project.id;projectIds.push(id);
  const configuration=await readAssistantSettings(id);
  const csvClaims={sub:id,clientId:credentials.clientId,externalUserId:`guest:current-csv-${randomUUID()}`,scope:["chat:connect"]};
  for(const route of bcaCurrentRoutes) {
    const conversation=await createConversation(id,csvClaims.externalUserId);
    if(route.answer) {
      const result=await bcaConversationHelp(csvClaims,conversation,route.questions[0]);
      assert.equal(result?.answer,route.answer,route.key);
      assert.equal(result?.reliable,true,route.key);
    }
    if(route.kind==="private") {
      // Test both current and already-personalized registries through the real
      // handler. Guest checks must never start a backend job.
      for(const question of route.questions)
        assert.match((await handleIntent(csvClaims,conversation,question))!,/Connectez-vous/,question);
    }
  }
  const currentMember={...csvClaims,externalUserId:`current-member-${randomUUID()}`,scope:["chat:connect","member:verified"]};
  for(const route of bcaCurrentRoutes.filter(route=>route.kind==="private")) {
    const conversation=await createConversation(id,currentMember.externalUserId);
    const prompt=await handleIntent(currentMember,conversation,route.questions[0]);
    assert.match(prompt!,/oui ou non/,route.key);
    assert.equal(await bcaConversationHelp(currentMember,conversation,"oui"),null,
      "Public continuation cannot consume a private confirmation");
    const cancel=await handleIntent(currentMember,conversation,"non");
    assert.ok(cancel,route.key);
  }
  // Exercise the real installer, approved index and private intent registry,
  // for every exact input in the attached November export.
  for(const route of bcaNovemberRoutes)for(const question of route.questions) {
    if(route.kind==="public")assert.equal((await retrieveReply(id,question)).answer,
      bcaGuides.find(guide=>guide.key===route.target)!.content,question);
    if(route.kind==="private")assert.equal(detectIntent(question,configuration.settings),route.target,question);
    if(route.kind==="context") {
      const claims={sub:id,clientId:credentials.clientId,externalUserId:`guest:november-${randomUUID()}`,scope:["chat:connect"]};
      const conversationId=await createConversation(id,claims.externalUserId);
      const reply=await bcaConversationHelp(claims,conversationId,question);
      assert.ok(reply?.answer,question);
      if(route.answer)assert.equal(reply.answer,route.answer,question);
      assert.equal(await bcaConversationHelp({...claims,externalUserId:"unrelated-member"},conversationId,question),null);
    }
  }
  for(const draft of bcaNovemberDrafts) {
    const result=await pool.query("SELECT status FROM sabito_core.knowledge_documents WHERE project_id=$1 AND title=$2",[id,draft.title]);
    assert.equal(result.rows[0]?.status,"pending",draft.title);
  }
  const refundMember={sub:id,clientId:credentials.clientId,externalUserId:`november-member-${randomUUID()}`,scope:["chat:connect","member:verified"]};
  const refundConversation=await createConversation(id,refundMember.externalUserId);
  for(const question of ["Remettez l'argent avec lequel je me suis inscrit","Remettez moi mon argent"]) {
    const reply=await bcaConversationHelp(refundMember,refundConversation,question);
    assert.match(reply!.answer,/n’est pas remboursable/);
    assert.match(reply!.answer,/presentationbizconnectacademy\.com/);
  }
  const refundTickets=await pool.query("SELECT external_user_id FROM sabito_core.support_tickets WHERE project_id=$1 AND conversation_id=$2",
    [id,refundConversation]);
  assert.equal(refundTickets.rows.length,0,"Public registration policy must not automatically open a refund review");
  for(const topic of ["Telegram","CapCut","Canal+"]) {
    const conversation=await createConversation(id,refundMember.externalUserId);
    const first=await bcaConversationHelp(refundMember,conversation,topic);
    assert.equal(first!.answer,bcaTrainingQuestion(topic));
    await pool.query(`INSERT INTO sabito_core.messages(id,project_id,conversation_id,role,content,status)
      VALUES($1,$2,$3,'assistant',$4,'completed')`,[randomUUID(),id,conversation,first!.answer]);
    assert.match((await bcaConversationHelp(refundMember,conversation,"oui"))!.answer,/liste des formations/);
    assert.equal(await bcaConversationHelp({...refundMember,externalUserId:"another-member"},conversation,"oui"),null);
    await pool.query(`INSERT INTO sabito_core.messages(id,project_id,conversation_id,role,content,status)
      VALUES($1,$2,$3,'assistant','Autre sujet','completed')`,[randomUUID(),id,conversation]);
    assert.doesNotMatch((await bcaConversationHelp(refundMember,conversation,"oui"))?.answer??"",/liste des formations/);
  }
  for(const [operation,aliases] of Object.entries(bcaOwnerPrivateAliases))for(const alias of aliases)
    assert.equal(detectIntent(alias,configuration.settings),
      configuration.settings.intents.find(intent=>intent.backend_function===operation)!.id);
  for(const template of bcaSupportTemplates)for(const question of template.triggers)
    assert.equal(detectIntent(question,configuration.settings),template.operation,question);
  for(const group of bcaSupportAliases)for(const question of group.questions)
    assert.equal((await retrieveReply(id,question)).answer,bcaGuides.find(guide=>guide.key===group.key)!.content,question);
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
      const expected=bcaScenario(guide.variants[0],configuration.settings.retrieval)==="income"
        ?["member-bca-overview","member-income"].map(key=>bcaGuides.find(item=>item.key===key)!.content).join("\n\n"):guide.content;
      assert.equal(result.content,expected,guide.title);
      assert.doesNotMatch(result.content,/communiquez.*(?:numéro de transaction|référence de dépôt)/i);
    }
    }
  }
  const polled=await request(app).post("/v1/backend/jobs/poll").auth(credentials.clientId,credentials.clientSecret)
    .send({operations:configuration.settings.intents.map(i=>i.backend_function)}).expect(200);
  assert.deepEqual(polled.body.jobs,[],"Public BCA FAQ must never trigger private financial checks");
  const url=`/v1/admin/projects/${id}/knowledge`;
  let contextualClaims={sub:id,clientId:credentials.clientId,externalUserId:`guest:csv-context-${randomUUID()}`,scope:["chat:connect"]};
  let contextSocket=await openSocket(signAccessToken(contextualClaims));
  let contextualConversation=await createConversation(id,contextualClaims.externalUserId);
  const sendContext=(content:string)=>new Promise<{content:string}>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("BCA_CSV_CONTEXT_TIMEOUT")),15000);
    contextSocket.once("message:complete",message=>{
      clearTimeout(timer);
      // The real message retains its separately tracked satisfaction survey.
      // Assert the answer body while subsequent turns exercise survey stripping.
      resolve({...message,content:String(message.content).split("\n\nConcernant votre question précédente « ")[0]});
    });
    contextSocket.emit("message:send",{conversationId:contextualConversation,content,idempotencyKey:randomUUID()},(ack:{ok:boolean;error?:{code:string}})=>{
      if(!ack.ok){clearTimeout(timer);reject(new Error(`BCA_CSV_CONTEXT_REJECTED:${ack.error?.code}`));}
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
  const history=bcaOwnerFaq.find(guide=>guide.key==="owner-history")!;
  assert.equal((await sendContext("En quel année BCA à été fondé ?")).content,history.content);
  assert.equal((await sendContext("Comment faire")).content,history.content,
    "The owner's confirmed history replaces the former uncertainty without returning to the PIN subject");
  assert.match((await sendContext("Je suis arrivé au compagne 3 abonnement premium")).content,/pas d’abonnement premium.*Canal\+.*CapCut/s);
  const campaignChoice=await sendContext("Campagne");
  assert.match(campaignChoice.content,/campagne test/);
  const retainedChoice=await bcaConversationHelp(contextualClaims,contextualConversation,"Comment faire");
  assert.equal(retainedChoice?.answer,campaignChoice.content);
  assert.equal(retainedChoice?.reliable,true,
    "An authored public clarification is not a failed search eligible for a generic socket fallback");
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
  const historyDoc=(await request(app).get(url).set("X-Admin-Key",adminKey).expect(200)).body.data
    .find((doc:{title:string})=>doc.title===history.title);
  await saveKnowledge(id,history.title,"Information confirmée par le propriétaire pour ce test.",
    historyDoc.id,undefined,historyDoc.variantes_de_question);
  assert.equal((await sendContext("En quel année BCA à été fondé ?")).content,
    "Information confirmée par le propriétaire pour ce test.","Exact approved answers override the uncertainty fallback");
  assert.deepEqual((await request(app).post("/v1/backend/jobs/poll").auth(credentials.clientId,credentials.clientSecret)
    .send({operations:configuration.settings.intents.map(i=>i.backend_function)}).expect(200)).body.jobs,[]);
  // Keep the production rate limit: this is a separate member journey.
  contextualClaims={...contextualClaims,externalUserId:`guest:owner-clarifications-${randomUUID()}`};
  contextualConversation=await createConversation(id,contextualClaims.externalUserId);
  contextSocket=await openSocket(signAccessToken(contextualClaims));
  assert.equal((await sendContext("CapCut")).content,bcaTrainingQuestion("CapCut"));
  assert.match((await sendContext("oui")).content,/liste des formations.*CAPCUT/s,
    "A public course-access choice must win over a satisfaction survey");
  assert.match((await sendContext("J'ai oublié mon PIN")).content,/support officiel.*réinitialisation/s);
  assert.match((await sendContext("Je veux le remboursement de mon inscription")).content,/n’est pas remboursable/);
  assert.match((await sendContext("oui")).content,/presentationbizconnectacademy\.com/);
  assert.match((await sendContext("Facebook")).content,/Plusieurs formations/);
  assert.equal((await sendContext("Formation Facebook Ads")).content,bcaTrainingQuestion("Formation Facebook Ads"));
  assert.match((await sendContext("oui")).content,/FORMATION FACEBOOK ADS/);
  contextualClaims={...contextualClaims,externalUserId:`guest:latest-csv-${randomUUID()}`};
  contextualConversation=await createConversation(id,contextualClaims.externalUserId);
  contextSocket=await openSocket(signAccessToken(contextualClaims));
  assert.match((await sendContext("Tout mais je ne sais pas comment me procéder")).content,/inutile de recréer un compte/);
  assert.match((await sendContext("Ok guide moi")).content,/quel parcours/);
  assert.match((await sendContext("vendre")).content,/espace vendeur/);
  assert.match((await sendContext("Le prix")).content,/tarif actuel/);
  assert.match((await sendContext("Comment faire un parrainage")).content,/1 500 F.*500 F.*300 F/s);
  assert.match((await sendContext("oui")).content,/propre lien/);
  assert.match((await sendContext("Non pas sa")).content,/mal comprise/);
  assert.match((await sendContext("Le prix pour publier un produit")).content,/pas de handler/);
  assert.match((await sendContext("Pourquoi")).content,/tarif actuel/);
  assert.match((await sendContext("Commission non reçu")).content,/Connectez-vous/);
  assert.match((await sendContext("Validé mon jour 2")).content,/Connectez-vous/);
  assert.match((await sendContext("J'ai une petite question")).content,/posez votre question/);
  // Customized approved references take precedence over shipped public rules.
  const customQuestion="Le prix pour publier un produit";
  await saveKnowledge(id,customQuestion,"Consultez le récapitulatif de votre espace vendeur, selon vos conditions particulières.");
  assert.equal((await sendContext(customQuestion)).content,
    "Consultez le récapitulatif de votre espace vendeur, selon vos conditions particulières.");
  // A separate identity keeps the real rate limiter enabled for the new CSV's
  // multi-turn controls. Public continuations cannot reuse private histories.
  const supportClaims={...contextualClaims,externalUserId:`guest:support-${randomUUID()}`};
  const supportConversation=await createConversation(id,supportClaims.externalUserId);
  const supportSocket=await openSocket(signAccessToken(supportClaims));
  const sendSupport=(content:string)=>new Promise<string>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("BCA_SUPPORT_CONTEXT_TIMEOUT")),15000);
    supportSocket.once("message:complete",message=>{
      clearTimeout(timer);resolve(String(message.content).split("\n\nConcernant votre question précédente « ")[0]);
    });
    supportSocket.emit("message:send",{conversationId:supportConversation,content,idempotencyKey:randomUUID()},(ack:{ok:boolean})=>{
      if(!ack.ok){clearTimeout(timer);reject(new Error("BCA_SUPPORT_CONTEXT_REJECTED"));}
    });
  });
  assert.match(await sendSupport("Aidez moi à nouveau"),/quel sujet|quelle étape/i);
  assert.equal(await sendSupport(premium.title),premium.content);
  assert.equal(await sendSupport("Aidez moi à nouveau"),premium.content);
  assert.equal(await sendSupport("Répondez"),premium.content);
  assert.equal(await sendSupport("Aidez moi à nouveau dans bca"),premium.content);
  assert.match(await sendSupport("Commet je veut verfier me statut"),/campagne.*produit.*parrainage.*dépôt.*retrait/s);
  assert.match(await sendSupport("comment avoir l’argent sur BCA"),/gagner.*solde.*retirer/s);
  assert.match(await sendSupport("Et concernant les campagnes"),/campagne test/);
  assert.match(await sendSupport("Par encore"),/étape.*terminée/);
  assert.match(await sendSupport("Comment faire monter le prix à 1.80"),/ne pouvez pas augmenter.*tarif/s);
  assert.match(await sendSupport("on retrouve la BCA ads network où"),/position actuelle du menu/);
  const docs=(await request(app).get(url).set("X-Admin-Key",adminKey).expect(200)).body.data;
  // Simulate an already-installed platform: update only exact shipped bodies,
  // while preserving a custom answer and an independently authored inline reply.
  const legacy=bcaLegacyQuestionFaq.find(guide=>guide.key==="questions-views-and-credit")!;
  const legacyDoc=docs.find((doc:{title:string})=>doc.title===legacy.title);
  await saveKnowledge(id,legacy.title,legacy.content,legacyDoc.id,undefined,legacyDoc.variantes_de_question);
  const customCopy=bcaLegacyQuestionFaq.find(guide=>guide.key==="questions-whatsapp-copy")!;
  const copyDoc=docs.find((doc:{title:string})=>doc.title===customCopy.title);
  const customCopyContent="Consignes de partage personnalisées par le propriétaire.";
  await saveKnowledge(id,customCopy.title,customCopyContent,copyDoc.id,undefined,copyDoc.variantes_de_question);
  await saveKnowledge(id,"Suivi personnalisé et ancien calcul","Consignes conservées.",undefined,undefined,[],[
    {question:legacy.title,answer:legacy.content},
    {question:"Ma règle personnalisée",answer:"Ne pas changer cette réponse."},
  ]);
  await pool.query("DELETE FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2",[id,"bca.owner_answers.corrections"]);
  const persisted={...configuration.settings,intents:configuration.settings.intents.map(intent=>({
    ...intent,
    enabled:intent.backend_function==="referral_commission_status"?false:intent.enabled,
    triggers:[...intent.triggers.filter(trigger=>!Object.values(bcaOwnerPrivateAliases).flat().includes(trigger)),
      ...(intent.backend_function==="referral_code"?["Mon déclencheur personnalisé"]:[])],
  }))};
  await pool.query("UPDATE sabito_core.assistant_settings SET config_json=$2,revision=revision+1 WHERE project_id=$1",
    [id,JSON.stringify(persisted)]);
  await pool.query("DELETE FROM sabito_core.audit_logs WHERE project_id=$1 AND action=$2",[id,"bca.owner_private_aliases.installed"]);
  const correctionUpgrade=await import("../bca-knowledge-install.ts?owner-upgrade="+randomUUID());
  assert.equal(await correctionUpgrade.ensureBcaKnowledge(id),true);
  assert.equal((await retrieveReply(id,legacy.title)).answer,bcaOwnerCorrections[legacy.key]);
  assert.equal((await retrieveReply(id,customCopy.title)).answer,customCopyContent);
  const upgradedDocs=(await request(app).get(url).set("X-Admin-Key",adminKey).expect(200)).body.data;
  const followed=upgradedDocs.find((doc:{title:string})=>doc.title==="Suivi personnalisé et ancien calcul");
  const storedFollowUps=await pool.query("SELECT questions_json FROM sabito_core.knowledge_follow_ups WHERE project_id=$1 AND document_id=$2",[id,followed.id]);
  const savedFollowUps=JSON.parse(String(storedFollowUps.rows[0].questions_json));
  assert.equal(savedFollowUps[0].answer,bcaOwnerCorrections[legacy.key]);
  assert.equal(savedFollowUps[1].answer,"Ne pas changer cette réponse.");
  const adjusted=await readAssistantSettings(id);
  assert.ok(adjusted.settings.intents.find(intent=>intent.backend_function==="referral_code")!.triggers.includes("Mon code parrainage"));
  assert.ok(adjusted.settings.intents.find(intent=>intent.backend_function==="referral_code")!.triggers.includes("Mon déclencheur personnalisé"));
  const disabled=adjusted.settings.intents.find(intent=>intent.backend_function==="referral_commission_status")!;
  assert.equal(disabled.enabled,false);
  assert.ok(!disabled.triggers.includes(bcaOwnerPrivateAliases.referral_commission_status[0]));
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
