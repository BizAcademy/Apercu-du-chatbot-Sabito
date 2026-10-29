import { strict as assert } from "node:assert";
import { test } from "node:test";
import { expandQuestion, tokenSimilarity, spellingSimilarity, protectedMismatch } from "./question-spelling";

test("common abbreviations are normalized as whole words without touching identifiers", () => {
  assert.equal(expandQuestion("Cmt gagner de l'argnt avc la BCA ?"), "comment gagner de l argnt avec la bca");
  assert.equal(expandQuestion("PK ma txn 12345 est en attente"), "pourquoi ma transaction 12345 est en attente");
  assert.equal(expandQuestion("AVC123 num123 cashback"), "avc123 num123 cashback");
});

test("missing letters, substitutions and adjacent transpositions match", () => {
  for (const [a,b] of [["gagnr","gagner"],["argnt","argent"],["ganger","gagner"],
    ["transcation","transaction"],["depot","depto"],["retrai","retrait"]]) {
    assert.ok(tokenSimilarity(a,b) >= .75, `${a} / ${b}`);
  }
  assert.ok(spellingSimilarity(["gagnr","argnt","bca"],["gagner","argent","bca"]) > .95);
  assert.equal(spellingSimilarity(["depot","depot"],["depot","retrait"]),0);
  assert.equal(spellingSimilarity(["solde"],["solide"],new Set(["solde","solide"])),0);
  assert.equal(tokenSimilarity("12345","12346"),0);
  assert.equal(tokenSimilarity("syn1","syn2"),0);
  assert.equal(tokenSimilarity("a".repeat(10000),"a".repeat(9999)+"b"),0);
});

test("opposite meanings and different amounts cannot be autocorrected", () => {
  for (const [a,b] of [
    [["depot","pas","recu"],["depot","recu"]],
    [["offre","100"],["offre","1000"]],
    [["compte","sans","frais"],["compte","frais"]],
  ]) {
    assert.equal(protectedMismatch(a,b),true);
    assert.equal(spellingSimilarity(a,b),0);
  }
});
