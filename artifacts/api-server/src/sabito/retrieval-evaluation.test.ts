import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultSettings } from "./assistant-settings";
import { indexSearchDocuments, rankSearchState, type State, type SearchDocument } from "./question-search";
import { supervisedBuzzKnowledge } from "./buzzbooster-supervised-pack";
import { expandQuestion } from "./question-spelling";
import { safeVariant } from "./variant-privacy";
import { retrievalSettingsSchema } from "./retrieval-settings";
import { backendContinuation, rememberBackendObservation, type BackendObservation } from "./backend-context";
import { buzzBackendFields, buzzResultAnswer } from "./buzzbooster-contract";

// Tuning examples are documented separately and never counted as controls.
export const dictionaryExamples=["cmt → comment","pq → pourquoi","mdp → mot de passe","dépo → depot","pa → pas"];
export const controls:[string,string][]=[
  ["cmt cree un comte","register"],["comnt ouvrir un comte","register"],["je veu m inscrir","register"],
  ["cmt me conecter","login"],["conexxion a mon compte","login"],["ouvrir ma sesion","login"],
  ["mdp oublie","password"],["recuperer mon comte","password"],["reinitialiser mon mdp","password"],
  ["cmt fair un depo","deposit"],["recharger mon porteufeuille","deposit"],["ajouter argent au portefeuil","deposit"],
  ["dépo pa reçu","missing-deposit"],["recharge non recue","missing-deposit"],["depot pa credite","missing-deposit"],
  ["cmt confirmer paiement mobile mone","mobile-confirmation"],["validr mon paiement mobile money","mobile-confirmation"],["autoriser notificasion paiement","mobile-confirmation"],
  ["depot cripto","crypto"],["deposer cryptomonaies","crypto"],["recharger en cripto","crypto"],
  ["suivie ma comande","order"],["statut de ma comande","order"],["ou est ma comand","order"],
  ["verifier mon remboursment","refund"],["suivie de mon remboursement","refund"],["ou est mon remboursemant","refund"],
  ["verifier mon bnonus de depot","bonus"],["bnonus de recharge","bonus"],["consulter bonus du depo","bonus"],
  ["mon cod parain","referral"],["code de parainage","referral"],["voir mon cod parrain","referral"],
  ["consulter mon sold","wallet"],["voir mon portefeuil","wallet"],["solde du porteufeuille","wallet"],
  ["historik de mes transactions","history"],["historique de mes paiments","history"],["voir mes transacions","history"],
  ["contacter le suport","support"],["joindre le suoppport","support"],["besoin asistence","support"],
];
const settings=defaultSettings(false);
const documents:SearchDocument[]=supervisedBuzzKnowledge.map(draft=>({
  ...draft,id:draft.key,status:"ready",
}));
function state(docs=documents):State {
  return {settings,revision:1,profile:"buzzbooster",checked:0,...indexSearchDocuments(settings,docs)};
}

test("Control corpus: actual deterministic retrieval, separate from dictionary examples",()=>{
  let correct=0,direct=0,clarifications=0,falsePositives=0;
  const failures:{query:string;expected:string;actual?:string;direct:boolean;score?:number}[]=[];
  for(const [query,expected] of controls) {
    const ranked=rankSearchState(state(),query).matches;
    const first=ranked[0];
    if(first?.documentId===expected){correct++;if(first.directAnswer)direct++;else clarifications++;}
    else {
      if(first?.directAnswer)falsePositives++;
      failures.push({query,expected,actual:first?.documentId,direct:!!first?.directAnswer,score:first?.similarity});
    }
  }
  console.info(JSON.stringify({kind:"retrieval-control-report",cases:controls.length,correctAttachments:correct,
    correctDirectAnswers:direct,correctAttachmentsRequiringConfirmation:clarifications,falsePositives,
    successRate:100*correct/controls.length,method:"Expected document ranked first / all control formulations; not a confidence probability.",
    remainingFailures:failures},null,2));
  // Fail closed on affirmative answers to the wrong topic. Remaining recall
  // failures are published in the report, never hidden with threshold changes.
  assert.equal(falsePositives,0);
  assert.ok(correct>=30,"At least 30 distinct malformed controls must be correctly attached");
});

test("Pending/rejected knowledge and unapproved variants never enter the public index",()=>{
  const pending={...documents[0],id:"private-draft",title:"Procédure secrète provisoire",status:"pending",variants:["texte non valide"]};
  const rejected={...pending,id:"rejected",status:"rejected"};
  const index=state([documents[0],pending,rejected]);
  assert.ok(index.entries.every(entry=>entry.documentId===documents[0].id));
  assert.ok(!index.entries.some(entry=>entry.question==="texte non valide"));
});

test("Equal approved answers with different content require clarification; unrelated inputs never assert an answer",()=>{
  const duplicate=state([
    {...documents[0],id:"a",title:"Mon bonus",variants:[],keywords:[],content:"Bonus de dépôt à consulter."},
    {...documents[1],id:"b",title:"Mon bonus",variants:[],keywords:[],content:"Bonus du filleul à consulter."},
  ]);
  assert.ok(rankSearchState(duplicate,"mon bonus").matches.every(entry=>!entry.directAnswer));
  for(const query of ["la météo à Paris","résultat du match de football","recette de gâteau","retirer mon argent","activer mon compte"]) {
    assert.ok(!rankSearchState(state(),query).matches.some(entry=>entry.directAnswer),query);
  }
});

test("Original backend fields are immutable and reusable examples contain no private identifiers",()=>{
  const original="dépo pa reçu BUZZ_AbC-00199 +237699123456 alice@example.invalid 15000 XAF";
  expandQuestion(original);
  assert.equal(original,"dépo pa reçu BUZZ_AbC-00199 +237699123456 alice@example.invalid 15000 XAF");
  const fields={deposit_number:"BUZZ_AbC-00199",payment_method:"Wave"};
  assert.deepEqual(buzzBackendFields("deposit_status",fields),fields);
  const example=safeVariant(original);
  assert.ok(example&&!/00199|237|alice|15000/.test(example));
  assert.equal(safeVariant("mon otp est 123456"),null);
  assert.equal(safeVariant("Authorization Bearer confidential-value"),null);
  assert.equal(safeVariant("mon dépôt de Jean Dupont est bloqué"),null);
  assert.equal(retrievalSettingsSchema.safeParse({...settings.retrieval,corrections:{pas:"oui"}}).success,false);
});

test("Negation, cancellation, debit and refund are not silently replaced",()=>{
  const positive={id:"received",title:"Dépôt reçu",content:"Paiement reçu.",status:"ready",variants:[]};
  const negative={...positive,id:"not-received",title:"Dépôt pas reçu",content:"Dépôt non reçu."};
  const result=rankSearchState(state([positive,negative]),"dépo pa reçu").matches;
  assert.equal(result[0].documentId,"not-received");
  assert.equal(result.find(entry=>entry.documentId==="received")?.similarity,0);
  for(const word of ["annulé","débité","remboursé"])assert.ok(expandQuestion(word).includes(word.normalize("NFKD").replace(/\p{M}/gu,"")));
});

test("Backend continuation distinguishes explanation, fresh consultation and action, preserves targets and clarifies duplicates",()=>{
  const observation:BackendObservation={operation:"deposit_status",fields:{deposit_number:"BUZZ_AbC-00199",payment_method:"Wave"},
    result:{status:"pending",data:{status:"pending"}},checkedAt:"2026-11-04T00:00:00.000Z",stage:"observed",question:"Mon dépôt"};
  const context=rememberBackendObservation(null,"member-fixture",observation);
  assert.equal(backendContinuation("pourquoi ?",context,"buzzbooster").kind,"explain");
  const reread=backendContinuation("vérifie encore",context,"buzzbooster");
  assert.equal(reread.kind,"read");
  if(reread.kind==="read")assert.deepEqual(reread.observation.fields,observation.fields);
  assert.equal(backendContinuation("comment confirmer ?",context,"buzzbooster").kind,"action");
  const bonus=backendContinuation("et mon bonus ?",context,"buzzbooster");
  assert.equal(bonus.kind,"read");
  if(bonus.kind==="read")assert.equal(bonus.operation,"deposit_bonus_status");
  assert.equal(backendContinuation("autre sujet",context,"buzzbooster").kind,"change");
  const multiple=rememberBackendObservation(context,"member-fixture",{...observation,fields:{deposit_number:"BUZZ_other"}});
  assert.equal(backendContinuation("vérifie encore",multiple,"buzzbooster").kind,"clarify");
  assert.equal(buzzResultAnswer("wallet_balance",{status:"ok",data:{solde_local:null}}),null);
  assert.equal(buzzResultAnswer("deposit_status",{status:"error",data:{credited:true}}),null);
});
