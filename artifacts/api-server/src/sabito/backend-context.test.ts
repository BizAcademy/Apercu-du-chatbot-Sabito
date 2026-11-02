import assert from "node:assert/strict";
import test from "node:test";
import { backendContinuation,continuationFields,explainBackendObservation,parseBackendContext,rememberBackendObservation,
  type BackendObservation,type BackendContext } from "./backend-context";

const observation=(operation="deposit_status",fields={transaction_id:"PIM001"} as Record<string,string>):BackendObservation=>({
  operation,fields,result:{status:"pending",data:{statut:"pending",moyen_paiement:"Mobile Money",montant:null}},
  checkedAt:new Date().toISOString(),stage:"observed",question:"Mon dépôt est en attente",
});
const context=(entry=observation())=>rememberBackendObservation(null,"member-a",entry);
test("Pending payment follow-ups and quoted explanations do not trigger a financial action",()=>{
  const entry=observation(),state=context(entry);
  const plan=backendContinuation("Comment confirmer la transaction ?",state);
  assert.equal(plan.kind,"action");
  const answer=explainBackendObservation(entry,"Comment confirmer la transaction ?");
  assert.match(answer,/aucune nouvelle consultation/);assert.match(answer,/prestataire/);
  assert.match(answer,/Autoriser un paiement/);assert.match(answer,/ne peux ni confirmer/);
  assert.doesNotMatch(answer,/Montant : 0/);
  for(const quote of ["Le crédit du portefeuille et l’attribution d’un bonus sont distincts",
    "Explique ce résultat","Pourquoi est-ce encore en attente ?"])assert.equal(backendContinuation(quote,state).kind,"explain",quote);
});
test("Read-only related operations reuse exact input keys, never a returned reference",()=>{
  const state=context();
  const bonus=backendContinuation("Et mon bonus ?",state);
  assert.equal(bonus.kind,"read");
  if(bonus.kind==="read") {
    assert.equal(bonus.operation,"deposit_bonus_status");
    assert.deepEqual(bonus.observation.fields,{transaction_id:"PIM001"});
  }
  const recheck=backendContinuation("Vérifie encore",state);
  assert.equal(recheck.kind,"read");
  const orders=context(observation("order_status",{order_number:"000123"}));
  const refund=backendContinuation("Et mon remboursement ?",orders);
  assert.equal(refund.kind,"read");
  if(refund.kind==="read")assert.equal(refund.operation,"order_refund_status");
});
test("Several references require clarification, then the supplied target resumes the pending read",()=>{
  const state=rememberBackendObservation(context(),"member-a",observation("deposit_status",{phone_number:"+237650000001"}));
  const plan=backendContinuation("Vérifie encore",state);
  assert.equal(plan.kind,"clarify");
  if(plan.kind!=="clarify")return;
  state.awaiting={mode:plan.mode,operation:plan.operation};
  const choice=backendContinuation("PIM001",state);
  assert.equal(choice.kind,"read");
  if(choice.kind==="read")assert.deepEqual(choice.observation.fields,{transaction_id:"PIM001"});
  // A bonus observation of the same target does not introduce ambiguity.
  const one=rememberBackendObservation(context(),"member-a",observation("deposit_bonus_status"));
  assert.equal(backendContinuation("Explique-moi",one).kind,"explain");
});
test("Explicit topic changes and social greetings cannot be swallowed by financial context",()=>{
  for(const text of ["Changeons de sujet", "Comment fonctionne cette plateforme ?", "Comment passer une nouvelle commande ?",
    "Comment avoir des abonnés Instagram ?"])
    assert.equal(backendContinuation(text,context()).kind,"change",text);
  assert.equal(backendContinuation("Bonjour comment tu vas",context()).kind,"none");
  assert.equal(backendContinuation("Mon OTP 123456",context()).kind,"none");
  assert.equal(backendContinuation("Vérifie encore",{...context(),active:false}).kind,"none");
});
test("Account and expiry isolation reject old private context",()=>{
  const raw=JSON.stringify(context());
  assert.equal(parseBackendContext(raw,"member-b"),null);
  assert.equal(parseBackendContext(raw,"member-a",Date.now()+86401000)?.entries.length,0);
  assert.equal(parseBackendContext("invalid","member-a"),null);
});
test("Failed refresh replaces the former success and cannot become a current confirmation",()=>{
  const previous=context();
  const latest=rememberBackendObservation(previous,"member-a",{...observation(),result:undefined,stage:"unavailable"});
  assert.equal(latest.entries.length,1);
  assert.match(explainBackendObservation(latest.entries[0],"Explique"),/n’a pas permis de vérifier/);
  assert.doesNotMatch(explainBackendObservation(latest.entries[0],"Explique"),/D’après la consultation|Montant :/);
});
test("Wallet and referral follow-ups select supported read operations only",()=>{
  const wallet=context(observation("wallet_movement_status",{movement_number:"MV-1",movement_type:"deposit"}));
  const plan=backendContinuation("Vérifie encore",wallet);
  assert.equal(plan.kind,"read");
  if(plan.kind==="read")assert.deepEqual(plan.observation.fields,{movement_number:"MV-1",movement_type:"deposit"});
  assert.deepEqual(continuationFields("admin_adjustment_status",{movement_number:"MV-1",movement_type:"deposit"}),{movement_number:"MV-1"});
  assert.deepEqual(continuationFields("wallet_balance",{movement_number:"MV-1"}),{});
  const referral=context(observation("referral_reward_status",{}));
  assert.equal(backendContinuation("Explique-moi",referral).kind,"explain");
  assert.equal(backendContinuation("Et le bonus du filleul ?",referral).kind,"read");
});
