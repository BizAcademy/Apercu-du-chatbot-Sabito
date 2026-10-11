import { test } from "node:test";
import assert from "node:assert/strict";
import { createSabitoSessionHandler } from "./sabito-session.mjs";

function response() {
  return { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
const request = { method: "POST", headers: { origin: "https://bca.example" },
  body: { user_id: "victim", external_user_id: "victim" } };
function options(extra = {}) {
  return { sabitoUrl: "https://sabito.example", platformOrigin: "https://bca.example",
    clientId: "fixture-id", clientSecret: "fixture-private-secret",
    getAuthenticatedUser: async () => ({ id: "real-user" }), verifyCsrf: async () => true,
    fetchImpl: async (_url, init) => {
      assert.deepEqual(JSON.parse(init.body), { external_user_id: "real-user" });
      assert.equal(init.redirect, "error");
      return Response.json({ success: true, data: { access_token: "temporary-fixture",
        expires_in: 900, external_user_id: "real-user", identity_type: "platform_user",
        clientSecret: "must-not-leak", socket_url: "https://untrusted.example" } });
    }, ...extra };
}

test("Session bridge derives identity server-side and allowlists its no-store response", async () => {
  const res = response();
  await createSabitoSessionHandler(options())(request, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.deepEqual(res.body, { access_token: "temporary-fixture", expires_in: 900,
    external_user_id: "real-user", socket_path: "/socket.io" });
});
test("Unauthenticated, cross-origin, non-POST and invalid-CSRF requests never call Sabito", async () => {
  for (const [req, extra, expected] of [
    [request, { getAuthenticatedUser: async () => null }, 401],
    [{ ...request, headers: { origin: "https://evil.example" } }, {}, 403],
    [{ ...request, headers: {} }, {}, 403],
    [{ ...request, method: "GET" }, {}, 405],
    [request, { verifyCsrf: async () => false }, 403],
    [request, { verifyCsrf: async () => "truthy" }, 403],
  ]) {
    let called = false;
    const res = response();
    await createSabitoSessionHandler(options({ ...extra, fetchImpl: async () => { called = true; } }))(req, res);
    assert.equal(res.statusCode, expected);
    assert.equal(called, false);
  }
});
test("Network errors and bad upstream responses never leak secrets or issue guest tokens", async () => {
  for (const fetchImpl of [
    async () => { throw new Error("fixture-private-secret"); },
    async () => new Response("private-body", { status: 401 }),
    async () => Response.json({ success: true, data: { access_token: "bad", expires_in: 900,
      external_user_id: "victim", identity_type: "platform_user" } }),
    async () => Response.json({ success: true, data: { access_token: "bad", expires_in: 900,
      external_user_id: "real-user", identity_type: "guest" } }),
  ]) {
    const res = response();
    await createSabitoSessionHandler(options({ fetchImpl }))(request, res);
    assert.ok([502, 503].includes(res.statusCode));
    assert.ok(!JSON.stringify(res.body).includes("private"));
    assert.equal(res.body.access_token, undefined);
  }
});
test("Unsafe configuration is rejected before serving", () => {
  for (const extra of [
    { sabitoUrl: "http://sabito.example" }, { sabitoUrl: "https://user:password@sabito.example" },
    { platformOrigin: "https://bca.example/path" }, { verifyCsrf: null }, { clientSecret: "" },
  ]) assert.throws(() => createSabitoSessionHandler(options(extra)), /SABITO_/);
});
