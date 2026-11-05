import assert from "node:assert/strict";
import test from "node:test";
import { bcaScenario,bcaChoiceIndexes,bcaQuestionParts,bcaPositiveEmotion,bcaTone } from "./bca-dialogue-rules";
import { defaultRetrievalSettings } from "./retrieval-settings";

const scenarios:[string,string][]=[
  ["Pourquoi ma formation est rejetée ?","rejected-training"],
  ["pk ma formasion est rejeter","rejected-training"],
  ["MA FORMATION A ETE REFUSEE POURQUOI","rejected-training"],
  ["j'ai parrainé avec mon lien et la commission est allée au compte FRANKLIN","wrong-commission"],
  ["ma commission a ete versee a un autre compte","wrong-commission"],
  ["un autre utilisateur a touche ma commission","wrong-commission"],
  ["Est-ce que le compte X et le compte Y sont reliés ?","account-link"],
  ["ces deux comptes sont ils rattaches","account-link"],
  ["le compte X est il le parrain de Y","account-link"],
  ["Pourquoi mon troisième jour n'est pas disponible ?","third-day"],
  ["pk le 3e jour est bloque","third-day"],
  ["LE JOUR 3 DE LA CAMPAGNE EST PAS VALIDE","third-day"],
  ["Qu'est-ce qui me rapporte plus de revenus ?","income"],
  ["comment gagner beaucoup de revnu","income"],
  ["je veux gagner plus","income"],
];
const choices=["Comment effectuer un retrait ?","Comment suivre une formation ?","Comment utiliser Digital Store ?"];
const selections:[string,number[]][]=[
  ["oui",[0,1,2]],["ok",[0,1,2]],["d'accord",[0,1,2]],["vas-y",[0,1,2]],
  ["tous",[0,1,2]],["les deux",[0,1]],["toutes",[0,1,2]],["1",[0]],["2",[1]],["3",[2]],
  ["retrait",[0]],["retraitt",[0]],["formation",[1]],["formasion",[1]],["digital store",[2]],
  ["Comment utiliser Digital Store ?",[2]],["non",[]],["9",[]],["162717",[]],["merci",[]],
  ["Comment faire",[]],["comment",[]],["pourquoi",[]],
];
const emotions=["merci","merci beaucoup","super","vous êtes top","très ému de votre réponse",
  "très émue de votre réponse","je suis très ému de votre réponse","génial"];
const subjects:[string,string,string|undefined][]=[
  ["et pour le retrait ?","withdrawal",undefined],["cmt faire un depo","deposit","how"],
  ["ou trouver parainage","referral","where"],["verifier mon compte","account","check"],
  ["digital store","digital-store",undefined],["BCA ADS NETWORK","ads",undefined],
  ["les formations","formations",undefined],["comment ca fonctione","", "how"],
  ["retraaaait","withdrawal",undefined],["mon depot est ou","deposit","where"],
  ["Pourquoi ma formation « Cours Alpha » est rejetée ?","digital-store","why"],
];
test("BCA dialogue evaluation: malformed messages, scenarios, choices and positive emotions",()=>{
  const results:{message:string;passed:boolean;actual:unknown;expected:unknown}[]=[];
  for(const [message,expected] of scenarios) {
    const actual=bcaScenario(message,defaultRetrievalSettings);
    results.push({message,expected,actual,passed:actual===expected});
  }
  for(const [message,expected] of selections) {
    const list=message==="les deux"?choices.slice(0,2):choices;
    const actual=bcaChoiceIndexes(message,list,defaultRetrievalSettings);
    results.push({message,expected,actual,passed:JSON.stringify(actual)===JSON.stringify(expected)});
  }
  for(const message of emotions)results.push({message,expected:true,actual:bcaPositiveEmotion(message),passed:bcaPositiveEmotion(message)});
  for(const [message,subject,request] of subjects) {
    const actual=bcaQuestionParts(message,defaultRetrievalSettings),expected={subject:subject||undefined,request};
    results.push({message,expected,actual,passed:actual.subject===expected.subject&&actual.request===request});
  }
  const passed=results.filter(item=>item.passed).length;
  console.info("BCA_DIALOGUE_EVALUATION",JSON.stringify({messages:results.length,passed,
    successRate:Math.round(passed/results.length*10000)/100,scope:"Détection déterministe hors ligne, pas une résolution métier en production.",
    failures:results.filter(item=>!item.passed)}));
  assert.ok(results.length>=40);
  assert.deepEqual(results.filter(item=>!item.passed),[]);
  assert.equal(bcaTone("Bonjour 🙂 Merci 👍 Encore ✅"),"Bonjour 🙂 Merci  Encore ");
  assert.equal(bcaTone("Une famille 👨‍👩‍👧‍👦 puis 🙂"),"Une famille 👨‍👩‍👧‍👦 puis ");
  assert.equal(bcaTone("Votre solde : 1 234,50 XAF"),"Votre solde : 1 234,50 XAF");
});

test("Scenario follow-up buttons use approved, related references and preserve authored choices",async()=>{
  const {bcaRelatedReply}=await import("./bca-dialogue");
  const {indexSearchDocuments}=await import("./question-search");
  const {defaultSettings}=await import("./assistant-settings");
  const settings=defaultSettings(true);
  const documents=[
    {id:"4bc049a7-00dc-4c31-a090-0827b65adaaf",title:"Comment réussir une campagne test ?",content:"Réponse test.",status:"ready"},
    {id:"fbd21edc-6b1c-4ec9-8646-f3ce7a12a2e2",title:"Comment vérifier une campagne ?",content:"Réponse vérification.",status:"ready"},
    {id:"30bb603b-a6f5-44b4-bff3-a28136acbe8e",title:"Comment suivre une campagne payante ?",content:"Réponse payante.",status:"ready"},
    {id:"e3813bab-99b5-4330-9fae-1b796c968b76",title:"Comment démarrer une campagne ?",content:"Brouillon.",status:"pending"},
    {id:"bca17c63-41ae-4393-a3f4-fdfd05465b4f",title:"Comment effectuer un dépôt ?",content:"Autre sujet.",status:"ready"},
  ];
  const state={settings,entries:indexSearchDocuments(settings,documents).entries};
  const answer={answer:documents[0].content,reliable:true,suggestions:[],closing_message:"",suggestions_label:""};
  assert.deepEqual(bcaRelatedReply(state,answer).suggestions.map(item=>item.question),
    documents.slice(1,3).map(item=>item.title));
  assert.equal(bcaRelatedReply(state,{...answer,reliable:false}).suggestions.length,0);
  const authored={...answer,suggestions:documents.slice(1,3).map(item=>({document_id:item.id,question:item.title}))};
  assert.deepEqual(bcaRelatedReply(state,authored).suggestions,authored.suggestions);
});
