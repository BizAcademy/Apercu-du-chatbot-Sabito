import assert from "node:assert/strict";
import { test } from "node:test";
import { isClosingAcknowledgement } from "./conversation-closing";

test("close only on whole acknowledgements, never on a question containing one", () => {
  for(const text of ["merci","Merci beaucoup !","OK","okk","okkk","daccord","d'accord","d’accord","tank","tanks","thanks","thank you","ok merci"]) {
    assert.equal(isClosingAcknowledgement(text),true,text);
  }
  for(const text of ["Merci, comment faire un retrait ?","ok mais mon dépôt est absent","le tank","bonjour","oui","non","comment obtenir un code ?",""]) {
    assert.equal(isClosingAcknowledgement(text),false,text);
  }
});
