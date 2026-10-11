import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { readFile } from "node:fs/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const packageDir = path.join(root, "generated-artifacts/sabito-cybrancee");
const manifest = JSON.parse(await readFile(path.join(packageDir, "package.json"), "utf8"));
assert.equal(manifest.engines.node, ">=21.7.3");
assert.deepEqual(Object.keys(manifest.dependencies).sort(), ["dotenv", "mysql2"]);
const [major, minor, patch] = process.versions.node.split(".").map(Number);
assert.ok(major > 21 || (major === 21 && (minor > 7 || (minor === 7 && patch >= 3))),
  "The standalone runtime must support Node.js 21.7.3 or newer.");
assert.ok(["127.0.0.1", "localhost"].includes(process.env.MYSQL_HOST), "Only a local temporary test database is allowed.");
assert.match(process.env.MYSQL_DATABASE ?? "", /^sabito_test/);
const mysqlSettings = {
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
};
const origin = "http://127.0.0.1:33307";
const adminKey = randomBytes(32).toString("base64url");
let logs = "", projectId;
const child = spawn(process.execPath, ["app.js"], {
  cwd: packageDir,
  // Deliberately omit all real workspace credentials and managed AI variables.
  env: {
    PATH: process.env.PATH, NODE_ENV: "production", PORT: "33307",
    MYSQL_HOST: process.env.MYSQL_HOST, MYSQL_PORT: process.env.MYSQL_PORT || "3306",
    MYSQL_DATABASE: process.env.MYSQL_DATABASE,
    MYSQL_USER: process.env.MYSQL_USER, MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
    ADMIN_API_KEY: adminKey,
    JWT_SECRET: randomBytes(32).toString("base64url"),
    CLIENT_SECRET_PEPPER: randomBytes(32).toString("base64url"),
    PUBLIC_URL: origin, CORS_ORIGINS: origin,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", bytes => { logs += bytes.toString(); });
child.stderr.on("data", bytes => { logs += bytes.toString(); });
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) throw new Error(`Standalone startup failed: ${logs}`);
    try { ready = (await fetch(`${origin}/api/healthz`)).ok; } catch {}
    if (ready) break;
    await delay(200);
  }
  assert.ok(ready, "Standalone server should become healthy");
  const json = async (route, method = "GET", body, authenticated = true) => {
    const response = await fetch(`${origin}${route}`, {
      method, headers: { "Content-Type": "application/json", ...(authenticated ? {"X-Admin-Key":adminKey} : {}) },
      ...(body ? {body:JSON.stringify(body)} : {}),
    });
    return { response, data: await response.json() };
  };
  const status = await json("/api/v1/status");
  assert.equal(status.data.configured, true);
  assert.equal(status.data.engine, "local-knowledge");
  assert.equal((await json("/api/v1/admin/projects", "GET", undefined, false)).response.status, 401);
  const created = await json("/api/v1/admin/projects", "POST", {
    slug:`standalone-${randomUUID()}`, name:"Standalone test", assistant_name:"Sabito",
    system_prompt:"Use approved local knowledge only; do not invent information.",
  });
  assert.equal(created.response.status, 201);
  projectId = created.data.data.project.id;
  assert.ok(created.data.data.credentials.clientSecret);
  const listed = await json("/api/v1/admin/projects");
  assert.ok(listed.data.data.some(project => project.id === projectId));
  const knowledge = await json(`/api/v1/admin/projects/${projectId}/knowledge`, "POST", {
    title:"Local reference", content:"La formation locale commence chaque lundi à neuf heures.",
  });
  assert.equal(knowledge.response.status, 201);
  const token = await json(`/api/v1/admin/projects/${projectId}/test-token`, "POST");
  assert.equal(token.response.status, 200);
  assert.equal(token.data.data.socket_url, origin);
  for (const route of ["/", "/admin", `/projects/${projectId}/chat`]) {
    const page = await fetch(`${origin}${route}`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /id="root"/);
    const asset = html.match(/src="([^"]+\.js)"/)?.[1];
    assert.ok(asset);
    assert.equal((await fetch(new URL(asset, origin))).status, 200);
  }
  for (const route of ["/.env", "/.env.example", "/package.json", "/index.mjs"]) {
    assert.equal((await fetch(`${origin}${route}`)).status, 404);
  }
  console.info(`Standalone production package OK on Node.js ${process.versions.node}: startup without managed AI/session secrets, MySQL, protected administration, knowledge, tokens, SPA routes/assets and private-file protection.`);
} finally {
  const stopped = child.exitCode === null ? once(child, "exit") : Promise.resolve();
  child.kill("SIGTERM");
  await stopped;
  if (projectId) {
    const require = createRequire(path.join(packageDir, "package.json"));
    const mysql = require("mysql2/promise");
    const connection = await mysql.createConnection(mysqlSettings);
    try {
      await connection.query("DELETE FROM sabito_audit_logs WHERE project_id=?", [projectId]);
      await connection.query("DELETE FROM sabito_projects WHERE id=?", [projectId]);
    } finally { await connection.end(); }
  }
}
