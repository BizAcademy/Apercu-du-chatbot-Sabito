import assert from "node:assert/strict";
import { test } from "node:test";
import { assertFramePolicy } from "./security-policy-check.mjs";

const protections = "default-src 'none'; script-src 'self'; object-src 'none'; base-uri 'none'";

test("The strengthened CSP accepts only the authorized member origin", () => {
  assertFramePolicy(`${protections}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; frame-ancestors 'self' https://member.fixture.example`,
    ["'self'", "https://member.fixture.example"]);
});

test("The strengthened refusal policy denies all parent frames", () => {
  assertFramePolicy(`${protections}; frame-ancestors 'none'`, ["'none'"]);
});

test("Missing protections, extra origins and duplicate directives still fail", () => {
  for (const header of [
    "frame-ancestors 'self' https://member.fixture.example",
    `${protections}; frame-ancestors 'self' https://member.fixture.example https://evil.example`,
    `${protections}; frame-ancestors *`,
    `${protections}; frame-ancestors 'none'`,
    `${protections}; frame-ancestors 'self' https://member.fixture.example; script-src *`,
    null,
  ]) {
    assert.throws(() => assertFramePolicy(header, ["'self'", "https://member.fixture.example"]));
  }
});
