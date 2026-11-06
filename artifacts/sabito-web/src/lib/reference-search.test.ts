import test from "node:test";
import assert from "node:assert/strict";
import { matchesReferenceQuestion } from "./reference-search";

test("Reference question search ignores accents, case, punctuation and word order", () => {
  assert.equal(matchesReferenceQuestion(" DEPOT effectuer ", ["Comment effectuer un dépôt ?"]), true);
  assert.equal(matchesReferenceQuestion("s'inscrire", ["Comment S’INSCRIRE ?"]), true);
  assert.equal(matchesReferenceQuestion("   ", ["Toutes les questions"]), true);
  assert.equal(matchesReferenceQuestion("compte retrait", ["Mon compte", "Un retrait"]), false);
  assert.equal(matchesReferenceQuestion("canal", ["Où est mon dépôt ?"]), false);
});

test("Reference question search includes alternative and follow-up question wording", () => {
  const questions = ["Accéder à la formation", "Où trouver CapCut ?", "Comment ouvrir le cours ?"];
  assert.equal(matchesReferenceQuestion("capcut", questions), true);
  assert.equal(matchesReferenceQuestion("ouvrir cours", questions), true);
  assert.equal(matchesReferenceQuestion("réponse secrète", questions), false);
  assert.equal(matchesReferenceQuestion("", []), true);
  assert.equal(matchesReferenceQuestion("capcut", []), false);
});
