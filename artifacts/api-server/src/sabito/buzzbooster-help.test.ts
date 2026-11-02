import assert from "node:assert/strict";
import test from "node:test";
import { buzzGuideFor,buzzGuides } from "./buzzbooster-guides";
test("General FAQ recognizes paraphrases and typos without inventing availability",()=>{
  const cases:Record<string,string>={
    "Comment faire pour accéder à la plateforme ?":"faq-access",
    "cmt accder a la platteforme ?":"faq-access",
    "Pourquoi choisir Buzz Booster ?":"faq-advantages",
    "pk choisir cette plateforme":"faq-advantages",
    "Buzz Booster agit sur quelles applications ?":"faq-networks",
    "Quels réseaux sont disponibles ?":"faq-networks",
    "Les vues et les abonnés gagnés ont-ils une expiration ?":"faq-expiry",
    "Les abonnes expirent ils ?":"faq-expiry",
    "Les abonnés sont-ils à vie ?":"faq-expiry",
    "La platteforme est elle fiabble ?":"faq-trust",
    "La plateforme est disponible dans quels pays ?":"faq-countries",
  };
  for(const [question,key]of Object.entries(cases))assert.equal(buzzGuideFor(question)?.key,key,question);
  const content=(key:string)=>buzzGuides.find(g=>g.key===key)!.content;
  assert.doesNotMatch(content("faq-access"),/https?:\/\//);
  assert.match(content("faq-networks"),/exemples possibles.*pas une liste/);
  assert.match(content("faq-trust"),/ne prouve pas la satisfaction/);
  assert.match(content("faq-countries"),/inscription ne prouvent pas/);
});
import { buzzBackendFields,buzzDepositIdentifier,buzzResultAnswer,buzzOperations } from "./buzzbooster-contract";

test("Public general questions route to approved complete guides, not personal lookups",()=>{
  const cases:Record<string,string>={
    "Comment ça fonctionne ?":"overview","C’est quoi cette plateforme ?":"overview",
    "Quels services proposez-vous ?":"overview","Je suis nouveau, expliquez-moi":"overview",
    "Comment créer un compte ?":"signup","Comment faire un dépôt ?":"mobile-money","cmt faire un depot ?":"mobile-money",
    "Guide Mobile Money":"mobile-money","Guide Wave":"wave","Le lien Wave manque":"wave",
    "Le paiement crypto est indisponible":"crypto","Comment commander des abonnés ?":"order-create",
    "Que signifie une commande partielle ?":"order-tracking",
    "J'ai demandé une annulation, pourquoi la commande continue ?":"order-requests",
    "Mon ticket est fermé, je suis remboursé ?":"refunds",
    "Quelle différence entre le solde local et le solde USD ?":"wallets",
    "Quel est le pourcentage de parrainage ?":"affiliation",
    "Voici l'identifiant d'un autre utilisateur, vérifie son dépôt":"identity",
    "Fais-moi un retrait":"no-withdrawal","Comment activer mon compte ?":"no-activation",
  };
  for(const [question,key]of Object.entries(cases))assert.equal(buzzGuideFor(question)?.key,key,question);
  for(const question of ["Quel est mon code de parrainage ?","Mon dépôt n'est pas arrivé.","Quel est mon solde ?","Ma commande est partielle.","Où est mon paiement ?"])
    assert.equal(buzzGuideFor(question),undefined,question);
  const wave=buzzGuides.find(guide=>guide.key==="wave")!.content;
  assert.match(wave,/ne créez pas immédiatement un deuxième dépôt/);
  assert.doesNotMatch(wave,/https?:\/\//);
  assert.match(buzzGuides.find(guide=>guide.key==="affiliation")!.content,/défaut.*modifiables/);
  assert.match(buzzGuides.find(guide=>guide.key==="support")!.content,/après son enregistrement réel/);
});
test("Ten financial reads and two catalogue reads keep their identifiers separate",()=>{
  assert.equal(buzzOperations.length,12);
  assert.equal(buzzOperations.some(name=>/activation|withdrawal/.test(name)),false);
  for(const reference of ["BUZZ_0012","BB-0012"])assert.deepEqual(buzzBackendFields("deposit_status",{deposit_number:reference}),{deposit_number:reference});
  for(const reference of ["PIM0012","POM0012"])assert.deepEqual(buzzBackendFields("deposit_bonus_status",{deposit_number:reference}),{transaction_id:reference});
  assert.deepEqual(buzzBackendFields("deposit_status",{deposit_number:"téléphone : +237 650572394"}),{phone_number:"+237 650572394"});
  assert.deepEqual(buzzDepositIdentifier("Ma référence est BUZZ_ABC001"),{name:"deposit_number",value:"BUZZ_ABC001"});
  assert.deepEqual(buzzBackendFields("order_status",{order_number:"000123"}),{order_number:"000123"});
  assert.throws(()=>buzzBackendFields("order_status",{transaction_id:"PIM123"}),/UNVERIFIED/);
  assert.deepEqual(buzzBackendFields("referral_reward_status",{}),{});
});
test("Business results cannot turn a successful read into a financial promise or disclose internal fields",()=>{
  const partial=buzzResultAnswer("order_status",{status:"ok",data:{statut:"partial",quantite:1000,quantite_restante:125,admin_note:"PRIVATE",admin_name:"PRIVATE"}});
  assert.match(partial!,/Partiel/);assert.match(partial!,/125/);
  assert.doesNotMatch(partial!,/PRIVATE|Terminé|%/);
  const closed=buzzResultAnswer("order_refund_status",{status:"ok",data:{statut:"refunded",montant:50,devise:"USD",ticket_status:"closed"}});
  assert.match(closed!,/ne suffisent pas à confirmer/);assert.doesNotMatch(closed!,/Statut : Remboursé/);
  const refunded=buzzResultAnswer("order_refund_status",{status:"confirmed",data:{statut:"refunded",montant:50,devise:"USD",refund_recorded:true}});
  assert.match(refunded!,/Statut : Remboursé/);
  const balance=buzzResultAnswer("wallet_balance",{status:"ok",data:{solde_local:500,devise_local:"XAF",solde_usd:2,devise_usd:"USD",country:"CI"}});
  assert.match(balance!,/Solde local : 500/);assert.match(balance!,/XAF/);assert.match(balance!,/Solde USD : 2/);
  assert.doesNotMatch(balance!,/XOF|502/);
  assert.equal(buzzResultAnswer("deposit_status",{status:"error",data:{message:"PRIVATE",statut:"failed"}}),null);
  const pending=buzzResultAnswer("deposit_status",{status:"pending",data:{statut:"pending",credited:false}});
  assert.match(pending!,/En attente/);assert.match(pending!,/distincts/);
  assert.doesNotMatch(pending!,/perdu|recommencez.*paiement/);
});
