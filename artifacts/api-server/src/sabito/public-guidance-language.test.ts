import test from "node:test";
import assert from "node:assert/strict";
import { publicJourney,paymentClues,guidanceLanguage } from "./public-guidance-language";
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
