import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { installRelease } from "../../deployment/deploy-plesk.mjs";
import { getDeploymentSourceFiles } from "./plesk-fingerprint.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const builtDir = path.join(root, "generated-artifacts/sabito-cybrancee");
// Outside the workspace: resolution cannot accidentally use its node_modules.
const packageDir = await mkdtemp(path.join(os.tmpdir(), "sabito-standalone-"));
const metadata = JSON.parse(await readFile(path.join(builtDir, "release.json"), "utf8"));
await installRelease({
  root: packageDir,
  archive: path.join(root, "generated-artifacts/sabito-cybrancee.zip"),
  checksum: (await readFile(path.join(root, "generated-artifacts/sabito-cybrancee.zip.sha256"), "utf8")).trim().split(/\s+/)[0],
  fingerprint: metadata.sourceFingerprint,
});
for (const name of await getDeploymentSourceFiles(root)) {
  const destination = path.join(packageDir, name);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(root, name), destination);
}
const manifest = JSON.parse(await readFile(path.join(packageDir, ".sabito-runtime/current/package.json"), "utf8"));
assert.equal(manifest.engines.node, ">=21.7.3");
assert.deepEqual(Object.keys(manifest.dependencies), []);
// Exercise a cold Restart too. Only GitHub downloads are mocked; the actual ZIP,
// checksum, installer, launcher, bundled server and MariaDB are real.
await rm(path.join(packageDir, ".sabito-runtime"), { recursive: true });
const preload = path.join(packageDir, "github-download-fixture.mjs");
await writeFile(preload, `
import { readFile } from "node:fs/promises";
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const address = String(url);
  if (!address.startsWith("https://api.github.com/")) return realFetch(url, options);
  if (address.endsWith("/releases/tags/plesk-${metadata.sourceFingerprint}")) {
    return Response.json({tag_name:"plesk-${metadata.sourceFingerprint}",draft:false,prerelease:false,
      assets:[{id:1,name:"sabito-cybrancee.zip"},{id:2,name:"sabito-cybrancee.zip.sha256"}]});
  }
  if (address.endsWith("/releases/assets/1")) return new Response(await readFile(${JSON.stringify(path.join(root, "generated-artifacts/sabito-cybrancee.zip"))}));
  if (address.endsWith("/releases/assets/2")) return new Response(await readFile(${JSON.stringify(path.join(root, "generated-artifacts/sabito-cybrancee.zip.sha256"))}));
  throw new Error("Unexpected GitHub fixture request");
};
`);
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
const child = spawn(process.execPath, ["--import", pathToFileURL(preload).href, "app.js"], {
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
  const widget = await fetch(`${origin}/widget/chat?parentOrigin=${encodeURIComponent(origin)}`);
  assert.equal(widget.status, 200);
  assert.ok(widget.headers.get("content-security-policy").includes("frame-ancestors"));
  assert.equal((await fetch(`${origin}/widget/chat?parentOrigin=https://evil.example`)).status, 403);
  const loader = await fetch(`${origin}/widget/sabito-chat.js`);
  assert.equal(loader.status, 200);
  assert.match(await loader.text(), /sabito:session-request/);
  console.info(`Plesk cold Restart OK on Node.js ${process.versions.node}: matching prebuilt GitHub package downloaded, checksum verified, no node_modules or build, MySQL, protected administration, knowledge, tokens, SPA routes/assets and private-file protection.`);
} finally {
  const stopped = child.exitCode === null ? once(child, "exit") : Promise.resolve();
  child.kill("SIGTERM");
  await stopped;
  if (projectId) {
    const require = createRequire(path.join(root, "artifacts/api-server/package.json"));
    const mysql = require("mysql2/promise");
    const connection = await mysql.createConnection(mysqlSettings);
    try {
      await connection.query("DELETE FROM sabito_audit_logs WHERE project_id=?", [projectId]);
      await connection.query("DELETE FROM sabito_projects WHERE id=?", [projectId]);
    } finally { await connection.end(); }
  }
  await rm(packageDir, { recursive: true, force: true });
}
