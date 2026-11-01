import assert from "node:assert/strict";
import test from "node:test";
import { explicitOrderRead,orderReferences,orderRecheck,orderOutcomeAnswer } from "./buzzbooster-orders";

test("Explicit and contextual order references retain leading zeros without capturing quantities or other private numbers",()=>{
  for(const text of ["Vérifie cette commande 162717","Vérifie la commande 162717","Où en est ma commande 162717 ?"])
    assert.deepEqual(orderReferences(text),["162717"],text);
  for(const text of ["162718","Et 162718 ?","Et celle-ci : 162718 ?","Celle-ci aussi : 162718","Vérifie aussi 162718","Maintenant 162718"])
    {assert.deepEqual(orderReferences(text,true),["162718"],text);assert.deepEqual(orderReferences(text),[],`No prior topic: ${text}`);}
  assert.deepEqual(orderReferences("Vérifie 162717, 162718 et 162719"),["162717","162718","162719"]);
  assert.deepEqual(orderReferences("Où en sont mes commandes 162717 et 162718 ?"),["162717","162718"]);
  assert.deepEqual(orderReferences("Vérifie les commandes 0012, 0012, 0013"),["0012","0013"]);
  assert.deepEqual(orderReferences("Vérifie la commande 162717 pour 1000 abonnés, budget 5000 XAF"),["162717"]);
  assert.deepEqual(orderReferences("Vérifie la commande 162717 et 1000 abonnés"),["162717"]);
  for(const text of ["Mon dépôt est de 5000 XAF","mon OTP : 123456","PIN 123456","Annule la commande 123456","Le montant est 123456"])
    assert.deepEqual(orderReferences(text,true),[],text);
  assert.equal(orderRecheck("Revérifie celle-ci"),true);
  assert.equal(orderRecheck("Revérifie mes commandes"),false);
  assert.equal(explicitOrderRead("Suivre ma commande"),true);
});
test("Order business statuses are separate from transport success, and inaccessible data is never rendered",()=>{
  const answer=orderOutcomeAnswer({number:"0012",result:{status:"ok",data:{order_number:"12",order_status:"partial",
    service:"Instagram",quantite:1000,remains:250,private_note:"PRIVATE"}}});
  assert.match(answer,/Commande : 0012/);assert.match(answer,/Statut : Partiel/);
  assert.match(answer,/Quantité commandée : 1000/);assert.match(answer,/Quantité restante : 250/);
  assert.doesNotMatch(answer,/PRIVATE/);
  assert.match(orderOutcomeAnswer({number:"123",result:{status:"ok",data:{quantity:100}}}),/Statut : Non disponible/);
  assert.match(orderOutcomeAnswer({number:"123",result:{status:"error",data:{statut:"failed",service:"PRIVATE"}}}),/n’a pas abouti/);
  assert.doesNotMatch(orderOutcomeAnswer({number:"123",result:{status:"forbidden",data:{service:"PRIVATE"}}}),/PRIVATE/);
  assert.match(orderOutcomeAnswer({number:"123",result:{status:"ok",data:{order_number:"999",statut:"completed"}}}),/ne permet pas de confirmer/);
});
