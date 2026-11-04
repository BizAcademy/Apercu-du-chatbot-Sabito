import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import request from "supertest";
import { contentSecurityPolicy, safeHttpErrors, securityHeaders } from "./http-security";

function fixture() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(securityHeaders);
  app.use(express.json({ limit: "2kb", inflate: false }));
  const formOptions = { extended: true, parameterLimit: 3, depth: 2, inflate: false };
  app.use(express.urlencoded(formOptions));
  app.get("/", (_req, res) => { res.send("<!doctype html><title>Fixture</title>"); });
  app.get("/widget/chat", (_req, res) => {
    res.setHeader("Content-Security-Policy", contentSecurityPolicy("'self' https://bca.example"));
    res.send("<!doctype html><title>Widget</title>");
  });
  app.post("/echo", (req, res) => { res.json(req.body); });
  app.get("/fail", () => { throw new Error("private SQL, credentials and stack must never escape"); });
  app.use(safeHttpErrors);
  return app;
}

test("HTTP defenses protect the dashboard without blocking authorized widget framing", async () => {
  const app = fixture();
  const page = await request(app).get("/").set("X-Forwarded-Proto", "https");
  assert.equal(page.status, 200);
  assert.equal(page.headers["x-content-type-options"], "nosniff");
  assert.equal(page.headers["referrer-policy"], "no-referrer");
  assert.equal(page.headers["strict-transport-security"], "max-age=31536000");
  assert.equal(page.headers["x-frame-options"], "DENY");
  assert.equal(page.headers["x-powered-by"], undefined);
  assert.match(page.headers["content-security-policy"], /script-src 'self'/);
  assert.match(page.headers["content-security-policy"], /frame-ancestors 'none'/);
  const widget = await request(app).get("/widget/chat");
  assert.equal(widget.headers["x-frame-options"], undefined);
  assert.match(widget.headers["content-security-policy"], /frame-ancestors 'self' https:\/\/bca\.example/);
  assert.equal((await request(app).get("/")).headers["strict-transport-security"], undefined);
});

test("Authenticated responses must not be stored by shared caches", async () => {
  for (const [header, value] of [["Authorization", "Bearer fixture-only"], ["X-Admin-Key", "fixture-only"]]) {
    const response = await request(fixture()).get("/").set(header, value);
    assert.equal(response.headers["cache-control"], "no-store");
  }
});

test("Request parsing rejects malformed, oversized, compressed and overly nested inputs safely", async () => {
  const app = fixture();
  const invalid = await request(app).post("/echo").type("json").send('{"broken":');
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.message, "Format de requête invalide.");
  assert.ok(!invalid.text.includes("SyntaxError"));
  assert.equal((await request(app).post("/echo").send({ value: "x".repeat(3000) })).status, 413);
  assert.equal((await request(app).post("/echo").type("json")
    .set("Content-Encoding", "gzip").send("not-decoded")).status, 415);
  assert.equal((await request(app).post("/echo").type("form").send("a=1&b=2&c=3&d=4")).status, 413);
  assert.equal((await request(app).post("/echo").type("form").send("a[b][c][d]=x")).status, 400);
  assert.equal((await request(app).post("/echo").send({ valid: true })).status, 200);
});

test("Unhandled server failures never disclose SQL, secrets or stack traces", async () => {
  const response = await request(fixture()).get("/fail");
  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { success: false, message: "Erreur interne. Veuillez réessayer." });
  assert.ok(!response.text.includes("private SQL"));
});
