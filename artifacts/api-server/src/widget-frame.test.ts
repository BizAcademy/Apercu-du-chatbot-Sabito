import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";

const directory = await mkdtemp(path.join(os.tmpdir(), "sabito-widget-frame-"));
await writeFile(path.join(directory, "index.html"), "<!doctype html><title>Sabito fixture</title>");
process.env.SABITO_WEB_DIR = directory;
process.env.PUBLIC_URL = "https://sabito.example";
process.env.CORS_ORIGINS = "https://bca.example,https://buzz.example,https://bad.example/path,*";
process.env.NODE_ENV = "production";
const { default: app } = await import("./app");
after(() => rm(directory, { recursive: true, force: true }));

test("Widget document admits only configured exact parent origins", async () => {
  const res = await request(app).get("/widget/chat").query({ parentOrigin: "https://bca.example" });
  assert.equal(res.status, 200);
  assert.match(res.text, /Sabito fixture/);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(res.headers["referrer-policy"], "no-referrer");
  assert.equal(res.headers["content-security-policy"],
    "frame-ancestors 'self' https://sabito.example https://bca.example https://buzz.example");
});
test("Widget document rejects absent, lookalike and unconfigured parent origins", async () => {
  for (const parentOrigin of ["", "null", "https://bca.example.evil.test", "https://evil.test", "https://bad.example"]) {
    const res = await request(app).get("/widget/chat").query({ parentOrigin });
    assert.equal(res.status, 403);
    assert.ok(!res.text.includes("Sabito fixture"));
  }
});
