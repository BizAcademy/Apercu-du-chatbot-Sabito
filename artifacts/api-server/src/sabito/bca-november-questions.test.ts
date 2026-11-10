import assert from "node:assert/strict";
import { test } from "node:test";
import { bcaNovemberRoutes,bcaNovemberRoute,bcaNovemberDrafts,bcaNovemberPrivateAliases } from "./bca-november-questions";
import { bcaGuides } from "./bca-guide-data";
import { bcaFollowupKind,bcaQuestionAlias } from "./bca-question-followups";
import { normalizeQuestion } from "./question-normalization";
import { bcaIntents } from "./bca-settings";
import { bcaSupportResultGuidance } from "./bca-support-questions";
import { verifiedBcaResult } from "./bca-contract";
import { bcaOwnerContinuation,bcaTrainingQuestion,bcaOwnerClarifications,bcaTrainingSubjects,bcaTrainingMatches } from "./bca-owner-clarifications";

test("November export: 62 distinct exact formulations have explicit bounded routes",()=>{
  const questions=bcaNovemberRoutes.flatMap(route=>route.questions);
  assert.equal(questions.length,62);
  assert.equal(new Set(questions.map(normalizeQuestion)).size,62);
  for(const route of bcaNovemberRoutes)for(const question of route.questions) {
    assert.equal(bcaNovemberRoute(question),route,question);
    if(route.kind==="public") {
      assert.ok(bcaGuides.find(guide=>guide.key===route.target),question);
      assert.equal(bcaQuestionAlias(question)?.key,route.target,question);
    } else if(route.kind==="context") {
      assert.ok(bcaFollowupKind(question),question);
      if(route.answer)assert.equal(bcaFollowupKind(question),"november");
    } else assert.ok(bcaIntents().some(intent=>intent.enabled&&intent.backend_function===route.target),question);
  }
});

test("All 17 permitted screenshot course titles have an access choice without inventing current prices",()=>{
  assert.equal(bcaTrainingSubjects.length,17);
  for(const subject of bcaTrainingSubjects) {
    const answer=bcaNovemberRoute(subject.title)!.answer!;
    // An explicit Telegram-access question may directly reuse its full guide.
    assert.equal(answer,bcaTrainingQuestion(subject.name),subject.title);
    assert.match(bcaOwnerContinuation("oui",answer)!,/liste des formations/,subject.title);
  }
  assert.match(bcaNovemberRoute("Facebook")!.answer!,/Plusieurs formations/);
  assert.equal(bcaTrainingMatches("Mon dépôt crypto est débité").length,0);
  assert.equal(bcaTrainingMatches("Vérifier mes vues WhatsApp").length,0);
  assert.equal(bcaTrainingMatches("Comment poster sur WhatsApp et recevoir des gains BCA ?").length,0);
  assert.equal(bcaTrainingMatches("Code promo 1xbet").length,0);
});

test("Ambiguous and conversational inputs do not select financial FAQs",()=>{
  for(const text of ["Cc","Alternative","Répondez à ma question svp","Je veux mon code promo",
    "Retirer mon argent","Les contacts","Mon annonce"]) {
    assert.equal(bcaNovemberRoute(text)?.kind,"context",text);
    assert.equal(bcaQuestionAlias(text),undefined,text);
  }
  assert.equal(bcaNovemberRoute("Alternative")?.target,"detail");
  assert.equal(bcaNovemberRoute("Répondez à ma question svp")?.target,"explain");
  assert.equal(bcaNovemberRoute("Mon code parrainage"),undefined);
});

test("Owner rules are public guidance, not manufactured private results",()=>{
  assert.match(bcaNovemberRoute("La campagne avec photo vaut 1000 XAF !?")!.answer!,/configuration active/);
  assert.doesNotMatch(bcaNovemberRoute("La campagne avec photo vaut 1000 XAF !?")!.answer!,/5 000 F/);
  assert.match(bcaNovemberRoute("Pour quoi mes campagne expiré avant 23h")!.answer!,/objectif de vues/);
  assert.match(bcaNovemberRoute("Remettez moi mon argent")!.answer!,/n’est pas remboursable/);
  assert.match(bcaNovemberRoute("Mon comte et bien crée oubien il na pas bien crée")!.answer!,/ne peux pas confirmer/);
  assert.equal(bcaNovemberRoute("Quel sont les 16 formations")!.target,"bca_catalogue_current");
  assert.match(bcaNovemberRoute("Pourquoi mes campagne sont indisponibles")!.answer!,/pas le résultat d’une vérification/);
  assert.equal(bcaNovemberRoute("Jusqu'a present mon jour n’est pas validé")!.target,"ads_payout_status");
  assert.deepEqual(Object.keys(bcaNovemberPrivateAliases).sort(),[
    "account_activation","ads_campaign_status","ads_payout_status","ads_publisher_status",
    "bca_catalogue_current","deposit_status","referral_commissions_recent","withdrawal_status",
  ]);
  assert.ok(bcaNovemberDrafts.every(draft=>draft.source.includes("confirmer")));
});

test("Owner answers cover support PIN, affiliation, profile, November news and official images",()=>{
  for(const question of ["J'ai oublié mon PIN","J'ai oublié mon code de configuration"])
    assert.match(bcaNovemberRoute(question)!.answer!,/support officiel.*réinitialisation/s);
  assert.match(bcaNovemberRoute("Si mon filleul vend je gagne aussi ?")!.answer!,/1 500 F.*500 F.*300 F/s);
  assert.match(bcaOwnerClarifications["referral-sale"],/pas que toute vente/);
  assert.match(bcaOwnerClarifications["member-location"],/Profil/);
  assert.match(bcaOwnerClarifications.news,/novembre 2026/);
  assert.match(bcaOwnerClarifications.merch,/https:\/\/bcachat\.bizconnectacademy\.com/);
  assert.doesNotMatch(bcaOwnerClarifications.expiry,/5 000 F.*(?:droit à|=).*vues/);
});

test("Course access needs an immediate public choice; no betting promotion or payment promise",()=>{
  for(const topic of ["Telegram","CapCut","Canal+"]) {
    const question=bcaNovemberRoute(topic)!.answer!;
    assert.equal(question,bcaTrainingQuestion(topic));
    assert.match(bcaOwnerContinuation("oui",question)!,/liste des formations/);
    assert.equal(bcaOwnerContinuation("Mon solde",question),undefined);
  }
  assert.equal(bcaOwnerContinuation("oui","Confirmez la consultation de votre solde"),undefined);
  assert.equal(bcaOwnerContinuation("oui","Autre sujet"),undefined);
  assert.match(bcaOwnerContinuation("oui",bcaOwnerClarifications.refund)!,/non remboursable/);
  assert.match(bcaNovemberRoute("1xbet")!.answer!,/ne peux pas fournir/);
  assert.match(bcaOwnerClarifications.telegram,/ne fonctionne pas pour tout le monde/);
  assert.match(bcaOwnerClarifications.telegram,/ne confirme pas.*obligatoire/s);
});

test("Verified day outcomes stay distinct and a current rate is not replaced with an archived default",()=>{
  assert.match(bcaSupportResultGuidance("ads_payout_status",{statut_diffusion:"pending_admin_validation"}),/attend la validation/);
  assert.match(bcaSupportResultGuidance("ads_payout_status",{statut_diffusion:"paid"}),/journée payée/);
  assert.match(bcaSupportResultGuidance("ads_payout_status",{statut_diffusion:"expired"}),/journée expirée/);
  assert.ok(verifiedBcaResult("ads_publisher_status",{status:"ok",data:{statut:"active",test_valide:true,taux_configure:1.37}}));
  assert.equal(verifiedBcaResult("ads_publisher_status",{status:"forbidden",data:{statut:"active",test_valide:true,taux_configure:1.37}}),false);
  assert.equal(verifiedBcaResult("ads_publisher_status",{status:"ok",data:{statut:"active",test_valide:true,taux_configure:-1}}),false);
});
