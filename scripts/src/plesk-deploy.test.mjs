import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { githubReleaseFiles, installRelease, validateArchiveEntries } from "../../deployment/deploy-plesk.mjs";
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
