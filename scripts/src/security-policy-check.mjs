import assert from "node:assert/strict";

// Test the security contract, not the full header string: new independent
// directives must not break the smoke test or tempt us to remove protections.
export function assertFramePolicy(header, expectedAncestors) {
  assert.equal(typeof header, "string", "A Content-Security-Policy header is required");
  const directives = new Map();
  for (const directive of header.split(";").map(value => value.trim()).filter(Boolean)) {
    const [name, ...values] = directive.split(/\s+/);
    assert.ok(!directives.has(name), `Duplicate CSP directive: ${name}`);
    directives.set(name, values);
  }
  assert.deepEqual(directives.get("frame-ancestors"), expectedAncestors,
    "Only the exact approved frame ancestors must be allowed");
  for (const [name, expected] of [
    ["default-src", ["'none'"]],
    ["script-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'none'"]],
  ]) {
    assert.deepEqual(directives.get(name), expected, `Required protection: ${name}`);
  }
}
