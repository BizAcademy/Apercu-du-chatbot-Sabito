import { strict as assert } from "node:assert";
import { test } from "node:test";
import { greetingReply } from "./greeting-reply";
import { knowledgeReply } from "./knowledge-answer";

test("simple greetings and wellbeing get a polite reply without approved knowledge", () => {
  for (const text of ["bonjour", "Bonsoir !", "salut", "BONJOUR 👋", "bonjour comment tu vas",
    "bonsoir comment tu vas ?", "Salut, comment vas-tu ?", "Bonjour, comment allez-vous ?",
    "coucou", "hello", "bjr", "slt", "Bonjour Sabito", "Salut tout le monde !",
    "bonjour bonsoir", "ça va ?", "Comment tu vas ?", "bonjour j’espère que vous allez bien"]) {
    const reply = greetingReply(text);
    assert.ok(reply?.endsWith("Que puis-je faire pour vous ?"), text);
    assert.deepEqual(knowledgeReply(text, []), { answer: reply, reliable: true }, text);
  }
  assert.match(greetingReply("bonsoir")!, /^Bonsoir/);
});

test("never swallow a real question, transaction detail, confirmation or closing", () => {
  for (const text of ["", "merci", "ok", "oui", "non", "bonjour mon dépôt n'est pas reçu",
    "salut comment faire un retrait", "bonjour comment tu vas et où est mon dépôt",
    "bonjour 237600123456", "comment gagner de l'argent", "je veux dire bonjour",
    "comment tu vas vérifier mon compte", "salut donne moi mon code parrain"]) {
    assert.equal(greetingReply(text), null, text);
  }
});
