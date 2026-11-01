import test from "node:test";
import assert from "node:assert/strict";
import { publicJourney,paymentClues,guidanceLanguage } from "./public-guidance-language";
import { guidanceBudget } from "./guidance-budget";
test("Purpose and budget requests retain declared money without treating F as XAF",()=>{
  for(const q of ["Quel est le but de la plateforme ?","À quoi sert Buzz Booster ?",
    "Qu’est-ce que ça peut m’apporter ?","Pourquoi utiliser cette plateforme ?"])
    assert.equal(publicJourney(q),"purpose",q);
  for(const q of ["J’ai 1000f, je veux faire un boostage, que me conseilles-tu ?",
    "Que puis-je faire avec 1000 FCFA ?","Quel boost choisir avec mon budget ?",
    "J’ai un petit budget pour booster mon compte."])assert.equal(publicJourney(q),"boost",q);
  const initial=guidanceBudget("J’ai 1000f, je veux booster");
  assert.deepEqual(initial,{amount:"1000",currency:"unknown",funding:"unknown"});
  const xaf=guidanceBudget("XAF",initial,"currency");
  assert.equal(xaf?.amount,"1000");assert.equal(xaf?.currency,"XAF");
  const total=guidanceBudget("Somme totale frais compris",xaf,"funding");
  assert.equal(total?.funding,"total");
  assert.deepEqual(guidanceBudget("900",total,"usable"),{amount:"900",currency:"XAF",funding:"wallet"});
  assert.equal(guidanceBudget("20 USD")?.currency,"foreign");
  assert.equal(guidanceBudget("1000 FCFA")?.currency,"unknown");
});
test("Every supplied colloquial action is a guide, not a financial lookup",()=>{
  for(const q of ["Je veux faire le dépôt","Je veux déposer","Comment recharger ?","Je veux mettre de l’argent",
    "Je veux alimenter mon compte","Je veux ajouter du solde","jvx faire un deppot"])
    assert.equal(publicJourney(q),"deposit",q);
  for(const q of ["Je veux booster","Je veux bosster","Je veux boost","Je veux des abonnés","Je veux augmenter mes vues",
    "Je veux promouvoir ma page","Je veux commander des likes","Je veux des vues TikTok","jveux booser insta"])
    assert.equal(publicJourney(q),"boost",q);
  for(const q of ["Mon dépôt n’est pas arrivé","Vérifie ma commande 162717","Vérifie mon dépôt",
    "Quel est le statut de mon dépôt ?","Comment vérifier mon dépôt ?","Comment fonctionne Buzz Booster ?"])
    assert.equal(publicJourney(q),undefined,q);
  assert.equal(publicJourney("Je veux annuler ma commande 162717"),"cancel");
  assert.equal(publicJourney("Pourquoi mon dépôt ne passe pas ?"),"diagnostic");
  assert.deepEqual(paymentClues("Je veux recharger avec Wave au Sénégal"),{country:"senegal",operator:"wave",method:"Mobile Money"});
  assert.match(guidanceLanguage("jvx bosster insta"),/je veux booster instagram/);
  assert.match(guidanceLanguage("650572394 BUZZ-000123"),/650572394/);
});
