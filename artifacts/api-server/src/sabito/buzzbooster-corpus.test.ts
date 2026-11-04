import test from "node:test";
import assert from "node:assert/strict";
import { buzzCorpus } from "./buzzbooster-corpus";
import { defaultSettings } from "./assistant-settings";
import { indexSearchDocuments,rankSearchState,type State } from "./question-search";
import { opaqueConversationInput,corpusClarificationKey } from "./conversation-input";
import { greetingReply } from "./greeting-reply";
import { isClosingAcknowledgement } from "./conversation-closing";
import { parseCatalogueFields,catalogueAnswer } from "./buzzbooster-catalogue";
import { guidanceLanguage,paymentClues } from "./public-guidance-language";
import { expandQuestion } from "./question-spelling";

const settings=defaultSettings(false);
const approved:State={settings,revision:1,profile:"buzzbooster",checked:0,
  ...indexSearchDocuments(settings,buzzCorpus.map(t=>({...t,id:t.key,status:"ready"})))};

test("Q1–Q97 are mapped once to 32 coherent proposals, with no private references as variants",()=>{
  const positions=buzzCorpus.flatMap(t=>t.questions).sort((a,b)=>a-b);
  assert.deepEqual(positions,Array.from({length:97},(_,i)=>i+1));
  assert.equal(buzzCorpus.length,32);
  assert.equal(new Set(buzzCorpus.map(t=>t.title)).size,32);
  for(const item of buzzCorpus){
    assert.ok(item.variants.length>=5&&item.variants.length<=10);
    assert.ok(item.content.length>=20&&item.keywords.length);
    assert.ok(item.variants.every(v=>!/^https?:|BB-|BUZZ_|PIM\d|POM\d|@example/i.test(v)));
  }
});

test("Available public corpus formulations use the production search index; clarifications are counted separately",()=>{
  const report={method:"164 supplied or authored public variants; not an independent holdout. Synthetic approval in memory, not production.",
    cases:0,correctOrientation:0,correctClarifications:0,falseAffirmatives:0,
    failures:[] as {query:string;expected:string;actual?:string;direct:boolean}[]};
  for(const item of buzzCorpus)for(const query of item.variants){
    report.cases++;
    const guard=corpusClarificationKey(query);
    const social=item.key==="salutations"&&!!greetingReply(query)||
      item.key==="accuses"&&isClosingAcknowledgement(query);
    const first=rankSearchState(approved,query).matches[0];
    const correct=social||guard===item.key||first?.documentId===item.key;
    if(correct){report.correctOrientation++;if(guard||item.clarification)report.correctClarifications++;}
    else {
      if(first?.directAnswer&&!guard)report.falseAffirmatives++;
      report.failures.push({query,expected:item.key,actual:first?.documentId,direct:!!first?.directAnswer});
    }
  }
  console.info(JSON.stringify({kind:"buzz-corpus-report",...report,
    orientationRate:100*report.correctOrientation/report.cases}));
  assert.equal(report.falseAffirmatives,0);
  assert.equal(report.failures.length,0);
});

test("Additional malformed controls are separate from the proposed aliases",()=>{
  let correct=0,clarifications=0,falseAffirmatives=0;
  const failures:{query:string;expected:string;actual?:string;direct:boolean}[]=[];
  for(const topic of buzzCorpus){
    // A reproducible perturbation not present in the authored variant arrays.
    const query=topic.title.replace(/[aeiouéè]/i,"").replace(/\?/g,"")+" svp";
    assert.ok(!topic.variants.includes(query));
    const first=rankSearchState(approved,query).matches[0];
    if(first?.documentId===topic.key){correct++;if(!first.directAnswer)clarifications++;}
    else{
      if(first?.directAnswer)falseAffirmatives++;
      failures.push({query,expected:topic.key,actual:first?.documentId,direct:!!first?.directAnswer});
    }
  }
  console.info(JSON.stringify({kind:"buzz-corpus-new-controls",method:"32 deterministic title perturbations, distinct from aliases; synthetic approval, not production.",
    cases:buzzCorpus.length,correctOrientation:correct,correctAttachmentsNeedingConfirmation:clarifications,
    falseAffirmatives,orientationRate:100*correct/buzzCorpus.length,failures}));
  assert.equal(falseAffirmatives,0);
});

test("New spellings and privacy-sensitive inputs are handled without changing the originals",()=>{
  for(const text of ["123456","#123456","BB-AbC_001","BUZZ_MixedCase","PIM000123","https://www.tiktok.com/@private/video/123456"]){
    const before=text;
    assert.ok(opaqueConversationInput(text));
    assert.ok(["reference","lien"].includes(corpusClarificationKey(text)!));
    expandQuestion(text);assert.equal(text,before);
  }
  for(const text of ["salut boss","hi","cv","bonsoir comment tu vas"])assert.ok(greetingReply(text));
  assert.ok(isClosingAcknowledgement("Merci vous êtes aimables"));
  assert.equal(isClosingAcknowledgement("Merci, mon dépôt n’est pas reçu"),false);
  assert.equal(corpusClarificationKey("depot recue"),"depot-attente");
  assert.equal(corpusClarificationKey("fonctionnement de BCA"),"fonctionnement");
  assert.notEqual(guidanceLanguage("dépo pa reçu"),guidanceLanguage("dépo reçu"));
  assert.equal(paymentClues("Wave Congo Kinshasa").country,"congo kinshasa");
  assert.equal(paymentClues("Wave Congo Brazzaville").country,"congo brazzaville");
});

test("Catalogue keeps WhatsApp subtypes, Facebook pages, quantities and currencies distinct",()=>{
  const status=parseCatalogueFields("100 vues de statuts WhatsApp");
  assert.equal(status.query,"statuts");assert.equal(status.quantity,"100");
  assert.equal(parseCatalogueFields("100 followers pour une page Facebook").query,"page");
  assert.equal(parseCatalogueFields("100 abonnés pour une chaîne WhatsApp").query,"chaîne");
  assert.equal(parseCatalogueFields("budget 1000 XOF").foreignCurrency,true);
  const result={status:"ok" as const,data:{service_1_id:1,service_1_nom:"Abonnés chaîne WhatsApp",
    service_1_fournisseur:1,service_1_categorie:"chaîne",service_1_conditions:"{}",service_1_prix:"{}",service_1_statistiques:"{}"}};
  assert.match(catalogueAnswer(result,status,"service_catalog"),/Aucun service correspondant au type demandé/);
  assert.doesNotMatch(catalogueAnswer(result,status,"service_catalog"),/Fournisseur :/);
  assert.match(catalogueAnswer({status:"forbidden"},status,"service_catalog"),/session membre autorisée/);
  assert.throws(()=>catalogueAnswer({status:"error"},status,"service_catalog"));
});

test("Pending proposals never become public retrieval documents",()=>{
  const state={...approved,...indexSearchDocuments(settings,buzzCorpus.map(t=>({...t,id:t.key,status:"pending"})))};
  assert.equal(state.entries.length,0);
});
