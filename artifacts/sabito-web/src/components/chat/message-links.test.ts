import assert from "node:assert/strict";
import { test } from "node:test";
import { messageLinks } from "./message-links.ts";

test("configured guide URL is clickable and preserves the exact answer", () => {
  const text = "Consultez ce guide : https://presentationbizconnectacademy.com/aide";
  const parts = messageLinks(text);
  assert.equal(parts.map(p => p.text).join(""), text);
  assert.deepEqual(parts.filter(p => p.href), [{
    text: "https://presentationbizconnectacademy.com/aide",
    href: "https://presentationbizconnectacademy.com/aide",
  }]);
});

test("multiple URLs, punctuation, line breaks, query strings and balanced parentheses", () => {
  const text = "Voir (https://example.com/aide).\nwww.example.org/a_(b), https://example.net/?a=1&b=2#suite !";
  const parts = messageLinks(text);
  assert.equal(parts.map(p => p.text).join(""), text);
  assert.deepEqual(parts.filter(p => p.href).map(p => p.href), [
    "https://example.com/aide", "https://www.example.org/a_(b)", "https://example.net/?a=1&b=2#suite",
  ]);
});

test("HTML, unsafe schemes, credentials and malformed URLs stay plain text", () => {
  for (const text of [
    '<img src=x onerror="alert(1)"> javascript:alert(1) data:text/html,test',
    "https:// https://?bad http://user:password@example.com",
    "javascript:https://example.com ftp://www.example.com",
    "Réponse sans lien.",
  ]) {
    const parts = messageLinks(text);
    assert.equal(parts.map(p => p.text).join(""), text);
    assert.equal(parts.some(p => p.href), false);
  }
});
