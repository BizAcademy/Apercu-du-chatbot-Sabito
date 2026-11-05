import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultSettings } from "./assistant-settings";
import { indexSearchDocuments,rankSearchState,type State } from "./question-search";
import { bcaSourceDrafts } from "./bca-source-drafts";
import { publicReplyPresentation,requestedClosing } from "./reply-presentation";
import { verifiedBcaResult } from "./bca-contract";
import { adaptBca,bcaIntents } from "./bca-settings";
import { bcaMemberFaq } from "./bca-member-faq";
import { bcaFaqFor } from "./bca-faq";
import { bcaGuides } from "./bca-guide-data";
import { greetingReply } from "./greeting-reply";
import { isClosingAcknowledgement } from "./conversation-closing";
import { bcaQuestionAliases,bcaQuestionFaq,bcaFollowupKind } from "./bca-question-followups";
import { bcaOwnerFaq,bcaOwnerCorrections,bcaOwnerResultGuidance } from "./bca-owner-answers";
import { isBcaHelpQuestion } from "./bca-knowledge-install";
import { bcaSupportFaq,bcaSupportAliases,bcaSupportTemplates,bcaSupportResultGuidance } from "./bca-support-questions";

// Independently authored controls, not installed as aliases or dictionary entries.
const controls:[string,number][]=[
  ["cmt transmettre reference de mon depo",0],["numero telephone ou reference de depot",0],
  ["kel identifiant envoyer pour depot",0],["ou recuperer ref exacte depot bca",0],
  ["kel portefeuil sabito consulte",1],["consulter soldes principal usd",1],
  ["quel devise solde peut lire sabito",1],["portefeuilles sabito lecture solde bloque",1],
  ["pk reference operation precise",2],["reference ambigue operation introuvable",2],
  ["operation pas trouve reference incorrecte",2],["reference exacte paiement echoue ou consultation",2],
  ["identifian numerique campagne ou diffusion ads",3],["cmt identifier journee bca ads",3],
  ["reference de paiement campagne publication",3],["campagn diffusion identifiant exact",3],
  ["periode recompence leader format",4],["cmt indiquer mois recompense leader",4],
  ["date premier jour mois leader",4],["prime leader periode ecrire date",4],
  ["sabito effectue remboursment",5],["sabito peut faire paiement remboursement",5],
  ["assistant peut crediter portefeuille",5],["sabito activation compte remboursement",5],
  ["pk actualiser montant abonnment digital store",6],["prix abonnement change actualiser",6],
  ["ancien tarif abonnemant vendeur",6],["abonnement page prix change",6],
  ["envoyer mon code pin sabito",7],["quel information jamais envoyer assistant",7],
  ["mot de passe token a envoyer",7],["quelles donnees confidentiel partager sabito",7],
];

test("Latest BCA export: all 28 exact formulations have an explicit public, context or private route",()=>{
  const questions=[
    "Aidez moi à nouveau",
    "pourquoi on peut payer des campagnes publicitaires, même si le virement était atteint, mais c’est grâce à nous que les vieux ont été atteints, on ne paye pas pour ça",
    "Répondez","Pourquoi je Mets produit en ligne toujours en cours","Je veux avoir un compte Netflix gratuit",
    "Et concernant les campagnes","Oui si je veux publier un contenu,est ce que forcé il faut que j'amène ça dans vendeur digital?",
    "Quelles sont les compétences","Je veux apprendre une compétence","comment ca fonctione","Vendre de formation",
    "Commet je veut verfier me statut","Parrainage non reçu","recommander la plateforme",
    "Pour mon cas, j'avais lancé mon produit digital sur cette plateforme et ça été rejeté... Mais j'ignore la vraie raison.",
    "Aidez moi à nouveau dans bca",
    "Non, j'ai besoin de savoir si à la BCA on vend uniquement les formations (vidéo) ou aussi les formats PDF",
    "Je veux découvrir les parrainages",
    "Je veux découvrir le parrainage parce que depuis des mois j'arrive même pas a gagner 100f dans bca je suis totalement dessus",
    "Quelles sont les produits digitaux vendables sur la BCA ?",
    "Le moyens  le plus simple er facile de ce faire beaucoup de revenu avec bca","Parrainage","Par encore",
    "Ce qui bloque est que après avoir validé la campagne text, rien ne vient plus de nouveau pour que je continue le travail",
    "Comment faire monter le prix à 1.80","Mais j'ai validé déjà la campagne text","on retrouve la BCA ads network où",
    "comment avoir l’argent sur BCA",
  ];
  assert.equal(questions.length,28);
  for(const question of questions)assert.ok(bcaFollowupKind(question)||bcaFaqFor(question)||
    bcaSupportAliases.some(group=>group.questions.includes(question))||
    bcaSupportTemplates.some(template=>template.triggers.includes(question)),question);
  for(const guide of bcaSupportFaq) {
    for(const question of [guide.title,...guide.variants])assert.equal(bcaFaqFor(question)?.key,guide.key,question);
    for(const key of guide.followUpKeys)assert.ok(bcaGuides.some(item=>item.key===key),key);
  }
  for(const template of bcaSupportTemplates)for(const question of template.triggers)
    assert.equal(bcaFaqFor(question),undefined,"Private reads cannot become static FAQ results: "+question);
  assert.equal(verifiedBcaResult("digital_product_review",{status:"ok",data:{statut:"rejected",reference:"1"}}),true);
  assert.equal(verifiedBcaResult("digital_product_review",{status:"ok",data:{statut:"unexpected",reference:"1"}}),false);
  assert.equal(verifiedBcaResult("ads_publisher_status",{status:"ok",data:{statut:"active",test_valide:true,taux_configure:null}}),true);
  assert.match(bcaSupportResultGuidance("digital_product_review",{statut:"rejected"}),/pas.*inventer/);
  assert.doesNotMatch(bcaSupportFaq.map(guide=>guide.content).join(" "),/revenu garanti|sera approuvé|sous 24/i);
});
test("BCA malformed controls report exact answers separately from confirmations",()=>{
  const settings=defaultSettings();
  const documents=bcaSourceDrafts.map((draft,index)=>({...draft,id:String(index),status:"ready"}));
  const state:State={settings,revision:1,profile:"bca",checked:0,...indexSearchDocuments(settings,documents)};
  let correct=0,direct=0,falsePositives=0;const failures=[];
  for(const [question,expected] of controls) {
    const first=rankSearchState(state,question).matches[0];
    if(first?.documentId===String(expected)) {correct++;if(first.directAnswer)direct++;}
    else {if(first?.directAnswer)falsePositives++;failures.push({question,expected,actual:first?.documentId,direct:first?.directAnswer});}
  }
  console.info(JSON.stringify({kind:"bca-retrieval-controls",cases:controls.length,correctTop:correct,correctDirect:direct,
    confirmationRequired:correct-direct,falsePositives,exactAnswerRate:100*direct/controls.length,
    orientationRate:100*correct/controls.length,failures}));
  assert.equal(falsePositives,0);
  assert.equal(indexSearchDocuments(settings,documents.map(d=>({...d,status:"pending"}))).entries.length,0);
});
test("Final public answers close exactly; financial and uncertain replies do not",()=>{
  const reply={reliable:true,closing_message:"",suggestions:[1,2,3,4],suggestions_label:""};
  assert.equal(publicReplyPresentation(reply,false).closing_message,requestedClosing);
  assert.equal(publicReplyPresentation(reply,false).suggestions.length,3);
  assert.deepEqual(publicReplyPresentation(reply,true).suggestions,[]);
  assert.equal(publicReplyPresentation(reply,true).closing_message,"");
  assert.equal(publicReplyPresentation({...reply,reliable:false},false).closing_message,"");
  assert.deepEqual(publicReplyPresentation({...reply,suggestions:[1]},false).suggestions,[1],
    "Keep a real single choice instead of fabricating a second one or hiding it");
  assert.equal(verifiedBcaResult("wallet_balance",{status:"confirmed"}),false);
  assert.equal(verifiedBcaResult("referral_code",{status:"ok",data:{statut:"Code",code_parrain:"A"}}),true);
});
test("Contract prompt upgrades preserve authored settings and deleted intentions",()=>{
  const legacy=defaultSettings(),settings={...legacy,intents:bcaIntents()};
  const campaign=settings.intents.find(item=>item.id==="ads_campaign_status")!;
  campaign.fields[0].prompt="Quelle est la référence de votre campagne BCA Ads ?";
  campaign.triggers=["déclencheur personnalisé"];
  const adapted=adaptBca(settings,legacy);
  assert.match(adapted.intents.find(item=>item.id===campaign.id)!.fields[0].prompt,/identifiant numérique/);
  assert.deepEqual(adapted.intents.find(item=>item.id===campaign.id)!.triggers,campaign.triggers);
  campaign.fields[0].prompt="Ma consigne spécifique";
  assert.equal(adaptBca(settings,legacy).intents.find(item=>item.id===campaign.id)!.fields[0].prompt,"Ma consigne spécifique");
  assert.deepEqual(adaptBca({...settings,intents:[]},legacy).intents,[]);
});
test("BCA CSV replies use approved subjects and never convert personal requests into public results",()=>{
  assert.equal(bcaMemberFaq.length,11);
  for(const guide of bcaMemberFaq) {
    for(const question of [guide.title,...guide.variants])assert.equal(bcaFaqFor(question)?.key,guide.key,question);
    for(const key of guide.followUpKeys)assert.ok(bcaGuides.some(item=>item.key===key),key);
  }
  const premium=bcaFaqFor("Comment accéder aux applications premium")!;
  assert.match(premium.content,/liste des formations/);
  assert.match(premium.content,/Canal\+/);
  assert.match(premium.content,/CapCut/);
  for(const personal of ["Mon code parrainage","Mon dépôt est en attente",
    "Bonsoir j'aimerais savoir combien y'a dans mon compte BCA comme commission",
    "Vérifie mon dépôt 12345","Mon retrait est-il payé ?"])
    assert.equal(bcaFaqFor(personal),undefined,personal);
  assert.match(bcaFaqFor("Comment je fais pour gagner de l'argent chaque jour sur bca")!.content,/aucun gain quotidien/i);
});
test("CSV social phrases do not hide real questions or confirm a financial outcome",()=>{
  assert.ok(greetingReply("Bonjour comment allez-vous j'espère que vous allez bien"));
  assert.ok(greetingReply("hello boss"));
  assert.equal(greetingReply("Bonjour comment allez-vous mon dépôt est bloqué"),null);
  assert.ok(isClosingAcknowledgement("Ok merci tu es fort"));
  assert.ok(isClosingAcknowledgement("Oui j'ai pu"));
  assert.equal(isClosingAcknowledgement("Oui j'ai pu payer mais mon dépôt est bloqué"),false);
});
test("Owner-confirmed BCA answers have bounded aliases, honest calculations and verified-result guidance",()=>{
  for(const guide of bcaOwnerFaq) {
    for(const text of [guide.title,...guide.variants])assert.equal(bcaFaqFor(text)?.key,guide.key,text);
    for(const key of guide.followUpKeys)assert.ok(bcaGuides.some(item=>item.key===key),key);
  }
  assert.match(bcaOwnerCorrections["questions-views-and-credit"],/123.*0,60 F = 73,80 F/);
  assert.match(bcaOwnerFaq.find(guide=>guide.key==="owner-history")!.content,/16 octobre 2025.*12 mars 2026/);
  assert.match(bcaOwnerResultGuidance("deposit_status",{status:"success",data:{statut:"terminé",reference:"example"}}),/Vérifiez maintenant votre solde/);
  assert.match(bcaOwnerResultGuidance("deposit_status",{status:"pending",data:{statut:"pending",reference:"example"}}),/https:\/\/bcachat\.bizconnectacademy\.com/);
  assert.match(bcaOwnerResultGuidance("deposit_status",{status:"failed",data:{statut:"failed",reference:"example",motif:"Référence invalide"}}),/Référence invalide/);
  assert.match(bcaOwnerResultGuidance("deposit_status",{status:"failed",data:{statut:"failed",reference:"example"}}),/pas de motif.*confirmé/);
  assert.equal(bcaOwnerResultGuidance("referral_code",{status:"success",data:{statut:"ok",code_parrain:"example"}}),"");
});
test("Additional BCA questions use bounded aliases and explicit clarification, not guessed personal data",()=>{
  for(const group of bcaQuestionAliases) {
    assert.ok(bcaGuides.some(guide=>guide.key===group.key),group.key);
    for(const question of group.questions)assert.ok(isBcaHelpQuestion(question),question);
  }
  for(const guide of bcaQuestionFaq) {
    for(const question of [guide.title,...guide.variants])assert.equal(bcaFaqFor(question)?.key,guide.key,question);
    for(const key of guide.followUpKeys)assert.ok(bcaGuides.some(item=>item.key===key),key);
  }
  assert.equal(bcaFollowupKind("En quel année BCA à été fondé ?"),"year");
  assert.equal(bcaFollowupKind("Mon argent dois e123f"),"incomplete");
  assert.equal(bcaFollowupKind("Comment faire"),"explain");
  assert.equal(bcaFollowupKind("Comment faire un dépôt 12345"),undefined);
  assert.equal(bcaFollowupKind("Yo mais mon retrait est bloqué"),undefined);
  assert.ok(greetingReply("Yo"));
  assert.equal(greetingReply("Yo pourquoi mon dépôt est bloqué"),null);
});
