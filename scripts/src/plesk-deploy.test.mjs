import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { deploymentErrorCode, ensureCurrentRelease, githubReleaseFiles, installRelease, validateArchiveEntries } from "../../deployment/deploy-plesk.mjs";
import { getSourceFingerprint, releaseTag } from "./plesk-fingerprint.mjs";

const fingerprint = "a".repeat(64);
const required = ["app.js", "index.mjs", "migrate.js", "migrate-mysql.mjs", "package.json",
  "release.json", "public/index.html", "migrations/mysql/001_sabito_core.sql"];
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "sabito-deploy-test-"));
  const content = path.join(root, "bundle");
  await mkdir(path.join(content, "public"), { recursive: true });
  await mkdir(path.join(content, "migrations/mysql"), { recursive: true });
  for (const name of required) await writeFile(path.join(content, name), "fixture");
  await writeFile(path.join(content, "package.json"), JSON.stringify({
    engines: { node: ">=21.7.3" }, dependencies: {},
  }));
  await writeFile(path.join(content, "release.json"), JSON.stringify({
    sourceFingerprint: fingerprint, nodeMinimum: "21.7.3",
  }));
  const archive = path.join(root, "release.zip");
  const zip = spawnSync("zip", ["-qr", archive, "."], { cwd: content });
  assert.equal(zip.status, 0);
  const checksum = createHash("sha256").update(await readFile(archive)).digest("hex");
  return { root, content, archive, checksum, fingerprint };
}

test("Deploy Now installs atomically, is repeatable and preserves private configuration", async () => {
  const data = await fixture();
  try {
    await writeFile(path.join(data.root, ".env"), "PRIVATE_FIXTURE=unchanged");
    await installRelease(data);
    const link = await readlink(path.join(data.root, ".sabito-runtime/current"));
    assert.equal(link, `versions/${fingerprint}`);
    await installRelease(data);
    assert.equal(await readlink(path.join(data.root, ".sabito-runtime/current")), link);
    assert.equal(await readFile(path.join(data.root, ".env"), "utf8"), "PRIVATE_FIXTURE=unchanged");
  } finally { await rm(data.root, { recursive: true, force: true }); }
});

test("Wrong checksum or stale source never replaces the active release", async () => {
  const data = await fixture();
  try {
    await installRelease(data);
    await assert.rejects(installRelease({ ...data, checksum: "b".repeat(64) }), /CHECKSUM_MISMATCH/);
    await assert.rejects(installRelease({ ...data, fingerprint: "c".repeat(64) }), /RELEASE_DOES_NOT_MATCH_SOURCE/);
    assert.equal(await readlink(path.join(data.root, ".sabito-runtime/current")), `versions/${fingerprint}`);
  } finally { await rm(data.root, { recursive: true, force: true }); }
});

test("A matching migrator can run offline without downloading again", async () => {
  const data = await fixture();
  try {
    await installRelease(data);
    const current = await ensureCurrentRelease(data.root, fingerprint, async () => {
      assert.fail("A matching release must not need network access");
    });
    assert.equal(current, path.join(data.root, ".sabito-runtime/current"));
  } finally { await rm(data.root, { recursive: true, force: true }); }
});

test("A stale migrator is replaced by the exact source release before running", async () => {
  const data = await fixture();
  const next = "b".repeat(64);
  try {
    await installRelease(data);
    await writeFile(path.join(data.root, ".env"), "PRIVATE_FIXTURE=unchanged");
    await writeFile(path.join(data.content, "release.json"), JSON.stringify({
      sourceFingerprint: next, nodeMinimum: "21.7.3",
    }));
    await rm(data.archive);
    assert.equal(spawnSync("zip", ["-qr", data.archive, "."], { cwd: data.content }).status, 0);
    const checksum = createHash("sha256").update(await readFile(data.archive)).digest("hex");
    let calls = 0;
    await ensureCurrentRelease(data.root, next, async root => {
      calls++;
      assert.equal(root, data.root);
      await installRelease({ ...data, fingerprint: next, checksum });
    });
    assert.equal(calls, 1);
    assert.equal(await readlink(path.join(data.root, ".sabito-runtime/current")), `versions/${next}`);
    assert.equal(await readFile(path.join(data.root, ".env"), "utf8"), "PRIVATE_FIXTURE=unchanged");
  } finally { await rm(data.root, { recursive: true, force: true }); }
});

test("Unavailable or mismatched updates never permit a stale migrator", async () => {
  const data = await fixture();
  try {
    await installRelease(data);
    await assert.rejects(ensureCurrentRelease(data.root, "b".repeat(64), async () => {
      const error = new Error("private-fixture");
      error.code = "RELEASE_NOT_READY_OR_ACCESS_DENIED";
      throw error;
    }), { code: "RELEASE_NOT_READY_OR_ACCESS_DENIED" });
    await assert.rejects(ensureCurrentRelease(data.root, "b".repeat(64), async () => {}),
      { code: "RELEASE_DOES_NOT_MATCH_SOURCE" });
    assert.equal(await readlink(path.join(data.root, ".sabito-runtime/current")), `versions/${fingerprint}`);
    assert.equal(deploymentErrorCode({ code: "private-fixture", message: "private-fixture" }), "DEPLOYMENT_FAILED");
    assert.equal(deploymentErrorCode({ code: "GITHUB_ACCESS_FAILED" }), "GITHUB_ACCESS_FAILED");
  } finally { await rm(data.root, { recursive: true, force: true }); }
});

test("Plesk command preserves approval flags and refuses an unavailable update without leaking errors", async () => {
  const data = await fixture();
  try {
    await writeFile(path.join(data.content, "migrate.js"),
      'process.stdout.write(JSON.stringify(process.argv.slice(2)));');
    await rm(data.archive);
    assert.equal(spawnSync("zip", ["-qr", data.archive, "."], { cwd: data.content }).status, 0);
    data.checksum = createHash("sha256").update(await readFile(data.archive)).digest("hex");
    await installRelease(data);
    await mkdir(path.join(data.root, "deployment"));
    await mkdir(path.join(data.root, "scripts/src"), { recursive: true });
    for (const name of ["migrate-plesk.cjs", "deploy-plesk.mjs"]) {
      await writeFile(path.join(data.root, "deployment", name),
        await readFile(new URL(`../../deployment/${name}`, import.meta.url)));
    }
    const hasher = path.join(data.root, "scripts/src/plesk-fingerprint.mjs");
    const fakeHasher = hash =>
      `export async function getSourceFingerprint() { return "${hash}"; }
       export const releaseTag = hash => "plesk-" + hash;`;
    await writeFile(hasher, fakeHasher(fingerprint));
    const hook = path.join(data.root, "offline.mjs");
    await writeFile(hook,
      'globalThis.fetch = async () => { throw new Error("PRIVATE_ERROR_FIXTURE"); };');
    const run = flags => spawnSync(process.execPath,
      ["--import", hook, "deployment/migrate-plesk.cjs", ...flags],
      { cwd: data.root, encoding: "utf8", timeout: 15000 });
    for (const flags of [["--status"], ["--plan"], ["--apply", "--reviewed"]]) {
      const result = run(flags);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), flags);
      assert.equal(result.stderr, "");
    }
    await writeFile(hasher, fakeHasher("b".repeat(64)));
    const failed = run(["--status"]);
    assert.equal(failed.status, 1);
    assert.equal(failed.stdout, "");
    assert.match(failed.stderr, /DEPLOYMENT_FAILED/);
    assert.ok(!failed.stderr.includes("PRIVATE_ERROR_FIXTURE"));
    await writeFile(hook,
      'globalThis.fetch = async () => new Response(null, { status: 404 });');
    const unavailable = run(["--status"]);
    assert.equal(unavailable.status, 1);
    assert.equal(unavailable.stdout, "");
    assert.match(unavailable.stderr, /RELEASE_NOT_READY_OR_ACCESS_DENIED/);
    assert.equal(await readlink(path.join(data.root, ".sabito-runtime/current")), `versions/${fingerprint}`);
  } finally { await rm(data.root, { recursive: true, force: true }); }
});

test("Archive traversal, secret files, dependency directories and incomplete packages are rejected", () => {
  for (const invalid of ["../outside", "/absolute", "C:/drive", "folder\\escape", ".env",
    ".sabito-deploy.json", "node_modules/driver.js", ".git/config"]) {
    assert.throws(() => validateArchiveEntries([...required, invalid]), /UNSAFE_ARCHIVE/);
  }
  assert.throws(() => validateArchiveEntries(["app.js"]), /INCOMPLETE_ARCHIVE/);
});

test("Archive symlinks are rejected before extraction", async () => {
  const data = await fixture();
  try {
    await symlink("/tmp", path.join(data.content, "unsafe-link"));
    await rm(data.archive);
    assert.equal(spawnSync("zip", ["-qry", data.archive, "."], { cwd: data.content }).status, 0);
    data.checksum = createHash("sha256").update(await readFile(data.archive)).digest("hex");
    await assert.rejects(installRelease(data), /UNSAFE_ARCHIVE/);
  } finally { await rm(data.root, { recursive: true, force: true }); }
});

test("Private GitHub authentication is never forwarded to signed download URLs", async () => {
  const calls = [];
  const token = "fake-unit-test-token";
  const mock = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("/releases/tags/")) return Response.json({
      tag_name: releaseTag(fingerprint), draft: false, prerelease: false,
      assets: [{ id: 1, name: "sabito-cybrancee.zip" }, { id: 2, name: "sabito-cybrancee.zip.sha256" }],
    });
    if (url.includes("/releases/assets/")) return new Response(null, {
      status: 302, headers: { location: "https://release-assets.githubusercontent.com/signed-fixture" },
    });
    return new Response("fixture");
  };
  await githubReleaseFiles("BizConnectAcademy/sabito", fingerprint, token, mock);
  assert.ok(calls.filter(call => call.url.startsWith("https://api.github.com/"))
    .every(call => call.options.headers.Authorization === `Bearer ${token}`));
  assert.ok(calls.filter(call => call.url.startsWith("https://release-assets."))
    .every(call => !call.options.headers?.Authorization));
});

test("Missing build and untrusted redirects fail explicitly", async () => {
  await assert.rejects(githubReleaseFiles("BizConnectAcademy/sabito", fingerprint, "",
    async () => new Response(null, { status: 404 })), /RELEASE_NOT_READY_OR_ACCESS_DENIED/);
  const mock = async url => url.includes("/releases/tags/") ? Response.json({
    tag_name: releaseTag(fingerprint), draft: false, prerelease: false,
    assets: [{ id: 1, name: "sabito-cybrancee.zip" }],
  }) : new Response(null, { status: 302, headers: { location: "https://example.invalid/leak" } });
  await assert.rejects(githubReleaseFiles("BizConnectAcademy/sabito", fingerprint, "fake-fixture", mock),
    /UNSAFE_DOWNLOAD_REDIRECT/);
});

test("Source matching ignores local secrets and build output, but notices code changes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sabito-fingerprint-test-"));
  try {
    for (const directory of ["artifacts/api-server", "artifacts/sabito-web", "lib", "scripts",
      "deployment", "migrations/mysql", ".github/workflows"]) await mkdir(path.join(root, directory), { recursive: true });
    for (const file of ["app.js", "package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml",
      "tsconfig.json", "tsconfig.base.json", ".npmrc"]) await writeFile(path.join(root, file), "fixture");
    const before = await getSourceFingerprint(root);
    await writeFile(path.join(root, ".env"), "fake-secret-fixture");
    await mkdir(path.join(root, "artifacts/api-server/dist"));
    await writeFile(path.join(root, "artifacts/api-server/dist/index.mjs"), "generated-output");
    assert.equal(await getSourceFingerprint(root), before);
    await writeFile(path.join(root, "artifacts/api-server/source.ts"), "changed-source");
    assert.notEqual(await getSourceFingerprint(root), before);
  } finally { await rm(root, { recursive: true, force: true }); }
});
