import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { mock } from "node:test";
import { pool } from "./sabito/database";

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
    assert.equal(res.headers["content-security-policy"], "frame-ancestors 'none'");
    assert.ok(!res.text.includes("Sabito fixture"));
  }
});

test("Member product resolves the same project origins as visitor projectId, before any session", async () => {
  const id="c75c390d-a028-4edf-982d-8503fe73ec70";
  const database=mock.method(pool,"query",async (_sql:string,values:unknown[])=>({
    rows:values[0]===id||values[0]==="buzzbooster"
      ? [{id,slug:"buzzbooster",origins_json:JSON.stringify(["https://member.buzz.example"])}] : [],rowCount:1,
  }));
  try {
    for (const selector of [{product:"buzzbooster"},{projectId:id},{projectId:id,product:"buzzbooster"}]) {
      const res=await request(app).get("/widget/chat").query({...selector,parentOrigin:"https://member.buzz.example"});
      assert.equal(res.status,200);
      assert.match(res.text,/Sabito fixture/);
      assert.equal(res.headers["content-security-policy"],"frame-ancestors 'self' https://member.buzz.example");
      assert.equal(res.headers["cache-control"],"no-store");
    }
    const before=database.mock.callCount();
    for (const selector of [{product:"unknown"},{product:"buzzbooster",projectId:"invalid"},
      {projectId:id,product:"bca"},{product:""},{product:"buzzbooster/path"},{product:["buzzbooster","bca"]},
      {projectId:[id,id]},{projectId:"00000000-0000-4000-8000-000000000000"}]) {
      // Even a globally allowed origin cannot rescue an invalid project selector.
      const res=await request(app).get("/widget/chat").query({...selector,parentOrigin:"https://bca.example"});
      assert.equal(res.status,403);
      assert.equal(res.headers["content-security-policy"],"frame-ancestors 'none'");
      assert.ok(!res.text.includes("Sabito fixture"));
    }
    assert.ok(database.mock.callCount()>before);
    for (const origin of ["https://bca.example","https://member.buzz.example.evil.test","null",""]) {
      const res=await request(app).get("/widget/chat").query({product:"buzzbooster",parentOrigin:origin});
      assert.equal(res.status,403);
    }
    assert.ok(database.mock.calls.every(call=>String(call.arguments[0]).includes("p.status='active'")));
  } finally { database.mock.restore(); }
});

test("Both hosted chat entry points start with HTTP polling for Plesk compatibility", async () => {
  for (const page of ["project-chat.tsx", "widget-chat.tsx"]) {
    const source = await readFile(new URL(`../../sabito-web/src/pages/${page}`, import.meta.url), "utf8");
    assert.match(source, /transports:\s*\[\s*"polling"\s*,\s*"websocket"\s*\]/,
      `${page} must connect over HTTP before attempting an optional WebSocket upgrade`);
  }
});
