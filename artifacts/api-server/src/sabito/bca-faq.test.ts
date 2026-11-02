import assert from "node:assert/strict";
import test from "node:test";
import { bcaFaq,bcaFaqFor } from "./bca-faq";

test("All eight BCA owner questions and colloquial variants route to public FAQ",()=>{
  for(const guide of bcaFaq) {
    assert.equal(bcaFaqFor(guide.title)?.key,guide.key,guide.title);
    for(const question of guide.variants)assert.equal(bcaFaqFor(question)?.key,guide.key,question);
  }
  assert.equal(bcaFaqFor("cmt monetiser mes status watsapp")?.key,"faq-status-income");
  assert.equal(bcaFaqFor("ma canpagne test est valide mais pas de campagne payante")?.key,"faq-no-paid-campaign");
  assert.equal(bcaFaqFor("mon compte difuseur est bloqué")?.key,"faq-blocked-publisher");
  for(const text of ["Vérifie mon compte diffuseur","Vérifie mon code parrain","Vérifie mon dépôt 000123"])
    assert.equal(bcaFaqFor(text),undefined,text);
  const content=(key:string)=>bcaFaq.find(g=>g.key===key)!.content;
  assert.match(content("faq-status-income"),/1,80 F par vue validée/);
  for(const key of ["faq-status-publish","faq-status-access","faq-no-paid-campaign"])
    assert.match(content(key),/Présentation BCA.*Guide d’utilisation/);
  assert.match(content("faq-blocked-publisher"),/n’ai pas consulté le motif réel/);
  assert.match(content("faq-registration-fees"),/n’annonce pas de nouveau paiement obligatoire/);
});
