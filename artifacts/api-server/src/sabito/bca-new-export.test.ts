import { test } from "node:test";
import assert from "node:assert/strict";
import { bcaCurrentQuestion,bcaCurrentContinuation,bcaCurrentRoutes,bcaCurrentTurn } from "./bca-current-questions";
import { bcaSocialAnswer } from "./bca-session";
import { bcaEnglish,englishBcaAnswer,originalBcaAnswer } from "./bca-language";
import { bcaIntents } from "./bca-settings";
import { bcaNovemberRoute } from "./bca-november-questions";

const exportQuestions=[
  "Comment commencer les ventes","Je veux parler de la monétisation de statut","Les activités bca",
  "J'ai capturé mon statut , j'ai envoyé ça mais jusqu'à présent je n'ai pas eu la validation",
  "Pourquoi est-ce que j'ai aucune campagne disponible","Bca ads","Comment fais pour gagner l’argent avec bca",
  "Comment retirer","J'arrive plus à poster des images pour vous envoyer la capture","Oui",
  "Nn juste que je t'attendais depuis mes on me dit que t’es pas disponible","Enfin tu es disponible",
  "Comment parrainer une personne","Validé ma vue whatshapp","Oui je Souhaitez découvrir le parcours de diffuseur",
  "Ont n'as volé un 1000 sur mon compte","Vous ne m’avez pas montré ou le trouver","Je les consultes ou mes filleuls ?",
  "Comment retrouver mon espace filleul","Non l'argent de parrainage",
  "J'ai parrainer une personne mais j'ai pas encore réussi ma reconnaissance","In English",
  "La plateforme serre à quoi ?","Je vous écoute","Donc je me suis fait arnaquer 😭",
  "Concernant mon virement de 2900f que j'ai","Apprendre une compétence","Comment générer des revenus",
  "Comment monotise","Sava très bien","Bonsoir vous poyver me montrer Comment on télécharge les numéros",
  "Je commence par où","Ok que dois je faire personnellement","Ok comment dois-je faire pour avoir de l’argent sur CHARIOW",
];
test("All 34 export spellings reuse a bounded route or a contextual control",()=>{
  assert.equal(exportQuestions.length,34);
  for(const text of exportQuestions) {
    assert.ok(bcaNovemberRoute(text)||bcaCurrentTurn(text)||bcaSocialAnswer(text)||text==="In English",text);
    const route=bcaCurrentQuestion(text);
    if(route?.kind==="private")assert.ok(bcaIntents().some(intent=>intent.backend_function===route.target),text);
  }
  assert.equal(bcaCurrentQuestion("Comment commencer les ventes")?.key,"current-seller");
  assert.equal(bcaCurrentQuestion("Validé ma vue whatshapp")?.target,"ads_payout_status");
  assert.equal(bcaCurrentQuestion("Parrainage non reçu")?.target,"referral_commissions_recent");
});
test("New public clarifications have at most one question and never assert a private check",()=>{
  for(const key of ["current-status-choice","current-upload-error","current-alleged-debit","current-transfer-choice",
    "current-phone-privacy","current-chariow"]) {
    const answer=bcaCurrentRoutes.find(route=>route.key===key)!.answer!;
    assert.ok((answer.match(/\?/g)??[]).length<=1,key);
    assert.doesNotMatch(answer,/votre (?:vol|paiement|retrait) est confirm|j’ai vérifié votre compte/i);
  }
  const transfer=bcaCurrentQuestion("Concernant mon virement de 2900f que j'ai")!;
  assert.equal(transfer.kind,"context");
  assert.match(transfer.answer!,/dépôt.*retrait.*transfert/);
  assert.match(bcaCurrentQuestion("How do I download phone numbers")!.answer!,/ni extraction massive ni numéros privés/);
});
test("Location and short choices use the immediately preceding public subject",()=>{
  const referral=bcaCurrentRoutes.find(route=>route.key==="current-referral")!.answer!;
  assert.match(bcaCurrentContinuation("Vous ne m’avez pas montré où le trouver",referral)!,/trois tirets.*Mes gains/);
  assert.equal(bcaCurrentContinuation("Vous ne m’avez pas montré où le trouver","Une réponse privée"),undefined);
  assert.equal(bcaCurrentContinuation("oui","Numéro invalide"),undefined);
  assert.ok(bcaSocialAnswer("Enfin tu es disponible"));
  assert.doesNotMatch(bcaSocialAnswer("Enfin tu es disponible")!,/panne du serveur|token expiré/);
});
test("Authored English is deterministic and unknown service messages stay verbatim",()=>{
  for(const [key,english] of Object.entries(bcaEnglish)) {
    const french=bcaCurrentRoutes.find(route=>route.key===key)!.answer!;
    assert.equal(englishBcaAnswer(french),english,key);
    assert.equal(originalBcaAnswer(english),french,key);
  }
  const stored="État retourné : en attente ; montant : 2 900 F ; référence : ABC123.";
  assert.ok(englishBcaAnswer(stored).endsWith(stored));
  assert.equal(originalBcaAnswer(englishBcaAnswer(stored)),stored);
});
