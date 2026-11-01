import assert from "node:assert/strict";
import test from "node:test";
import { substantialQuestion } from "./support-memory";
test("Support statistics exclude greetings, acknowledgements, collection fields and retry controls",()=>{
  for(const text of ["bonjour","bonsoir comment tu vas","merci","oui","non","162717","Et 162719 ?","Mon OTP est 123456","aidez-moi à nouveau","suite"])
    assert.equal(substantialQuestion(text),false,text);
  for(const text of ["Comment effectuer un dépôt ?","Je ne trouve pas mon retrait","Comment modifier mon profil ?"])
    assert.equal(substantialQuestion(text),true,text);
});
