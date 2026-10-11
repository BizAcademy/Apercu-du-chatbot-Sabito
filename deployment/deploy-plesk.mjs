import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, lstat, mkdir, open, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSourceFingerprint, releaseTag } from "../scripts/src/plesk-fingerprint.mjs";

const assetName = "sabito-cybrancee.zip";
const maximumBytes = 100 * 1024 * 1024;
const fail = code => { const error = new Error(code); error.code = code; throw error; };
const checksumOf = bytes => createHash("sha256").update(bytes).digest("hex");
function tool(args) {
  const result = spawnSync("unzip", args, { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) fail("UNZIP_FAILED");
  return result.stdout;
}

export function validateArchiveEntries(names) {
  for (const name of names) {
    if (!name || name.startsWith("/") || name.includes("\\") || name.includes(":") ||
        /[\r\0]/.test(name) || name.split("/").includes("..") ||
        /(^|\/)(node_modules|\.git)(\/|$)/.test(name) ||
        /(^|\/)(\.env|\.sabito-deploy\.json)$/.test(name)) fail("UNSAFE_ARCHIVE");
  }
  for (const required of ["app.js", "index.mjs", "migrate.js", "migrate-mysql.mjs",
    "package.json", "release.json", "public/index.html", "migrations/mysql/001_sabito_core.sql"]) {
    if (!names.includes(required)) fail("INCOMPLETE_ARCHIVE");
  }
}

async function normalisePermissions(directory) {
  await chmod(directory, 0o755);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await normalisePermissions(filename);
    else if (entry.isFile()) await chmod(filename, 0o644);
    else fail("UNSAFE_ARCHIVE");
  }
}

export async function installRelease({ root, archive, checksum, fingerprint }) {
  if (!/^[a-f0-9]{64}$/.test(fingerprint) || !/^[a-f0-9]{64}$/.test(checksum)) fail("INVALID_RELEASE");
  const bytes = await readFile(archive);
  if (bytes.length > maximumBytes || checksumOf(bytes) !== checksum) fail("CHECKSUM_MISMATCH");
  const names = tool(["-Z1", archive]).trimEnd().split("\n");
  validateArchiveEntries(names);
  const modes = tool(["-Z", "-l", archive]).split("\n");
  if (modes.some(line => /^[lbcps][rwxStTs-]{9}\s/.test(line))) fail("UNSAFE_ARCHIVE");
  tool(["-tq", archive]);
  const store = path.join(root, ".sabito-runtime");
  await mkdir(path.join(store, "versions"), { recursive: true, mode: 0o755 });
  const lockPath = path.join(store, ".deploy.lock");
  let lock;
  try { lock = await open(lockPath, "wx", 0o600); } catch { fail("DEPLOYMENT_ALREADY_RUNNING"); }
  const staging = path.join(store, `.staging-${randomUUID()}`);
  const nextLink = path.join(store, `.current-${randomUUID()}`);
  try {
    await mkdir(staging, { mode: 0o700 });
    tool(["-q", archive, "-d", staging]);
    const metadata = JSON.parse(await readFile(path.join(staging, "release.json"), "utf8"));
    const manifest = JSON.parse(await readFile(path.join(staging, "package.json"), "utf8"));
    if (metadata.sourceFingerprint !== fingerprint || metadata.nodeMinimum !== "21.7.3" ||
        manifest.engines?.node !== ">=21.7.3" || Object.keys(manifest.dependencies ?? {}).length) {
      fail("RELEASE_DOES_NOT_MATCH_SOURCE");
    }
    await normalisePermissions(staging);
    await writeFile(path.join(staging, "archive-sha256.txt"), checksum + "\n");
    const target = path.join(store, "versions", fingerprint);
    let existing = false;
    try { await lstat(target); existing = true; } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (existing) {
      if ((await readFile(path.join(target, "archive-sha256.txt"), "utf8")).trim() !== checksum) {
        fail("IMMUTABLE_RELEASE_CONFLICT");
      }
    } else {
      await rename(staging, target);
    }
    const current = path.join(store, "current");
    try {
      if (!(await lstat(current)).isSymbolicLink()) fail("CURRENT_PATH_IS_NOT_A_RELEASE_LINK");
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    await symlink(`versions/${fingerprint}`, nextLink, "dir");
    await rename(nextLink, current);
    return { fingerprint };
  } finally {
    await rm(staging, { recursive: true, force: true });
    await rm(nextLink, { force: true });
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

async function boundedBytes(response) {
  if (!response.ok) fail("GITHUB_DOWNLOAD_FAILED");
  if (Number(response.headers.get("content-length") || 0) > maximumBytes) fail("RELEASE_TOO_LARGE");
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maximumBytes) fail("RELEASE_TOO_LARGE");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function githubReleaseFiles(repository, fingerprint, token, fetcher = fetch) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) fail("INVALID_REPOSITORY");
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetcher(
    `https://api.github.com/repos/${repository}/releases/tags/${releaseTag(fingerprint)}`,
    { headers, redirect: "error", signal: AbortSignal.timeout(30000) },
  );
  if (response.status === 404) fail("RELEASE_NOT_READY_OR_ACCESS_DENIED");
  if (!response.ok) fail("GITHUB_ACCESS_FAILED");
  const release = await response.json();
  if (release.draft || release.prerelease || release.tag_name !== releaseTag(fingerprint)) fail("INVALID_RELEASE");
  async function download(name) {
    const asset = release.assets.find(item => item.name === name);
    if (!asset || !Number.isSafeInteger(asset.id)) fail("INCOMPLETE_GITHUB_RELEASE");
    let result = await fetcher(`https://api.github.com/repos/${repository}/releases/assets/${asset.id}`, {
      headers: { ...headers, Accept: "application/octet-stream" },
      redirect: "manual", signal: AbortSignal.timeout(30000),
    });
    if ([301, 302, 303, 307, 308].includes(result.status)) {
      const location = new URL(result.headers.get("location"));
      if (location.protocol !== "https:" || location.username || location.password ||
          !["release-assets.githubusercontent.com", "objects.githubusercontent.com"].includes(location.hostname)) {
        fail("UNSAFE_DOWNLOAD_REDIRECT");
      }
      // Never forward the GitHub credential to the signed asset-download host.
      result = await fetcher(location.href, { redirect: "error", signal: AbortSignal.timeout(60000) });
    }
    return boundedBytes(result);
  }
  return { archive: await download(assetName), checksum: await download(`${assetName}.sha256`) };
}

export async function deployFromGithub(root) {
  const [major, minor, patch] = process.versions.node.split(".").map(Number);
  if (!(major > 21 || (major === 21 && (minor > 7 || (minor === 7 && patch >= 3))))) fail("NODE_VERSION_TOO_OLD");
  const fingerprint = await getSourceFingerprint(root);
  let config = { repository: "BizAcademy/Apercu-du-chatbot-Sabito", githubToken: "" };
  try {
    const configPath = path.join(root, ".sabito-deploy.json");
    const stat = await lstat(configPath);
    if (!stat.isFile() || (stat.mode & 0o077)) fail("PRIVATE_CONFIG_PERMISSIONS_REQUIRED");
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const files = await githubReleaseFiles(config.repository, fingerprint, config.githubToken);
  const checksum = files.checksum.toString("utf8").trim().split(/\s+/)[0];
  const store = path.join(root, ".sabito-runtime");
  await mkdir(store, { recursive: true, mode: 0o755 });
  const archive = path.join(store, `.download-${randomUUID()}.zip`);
  try {
    await writeFile(archive, files.archive, { mode: 0o600 });
    await installRelease({ root, archive, checksum, fingerprint });
    process.stdout.write("Sabito : version compilée installée. Aucun build, npm install ou changement de base effectué. Tu peux cliquer Restart.\n");
  } finally { await rm(archive, { force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  deployFromGithub(root).catch(error => {
    const allowed = new Set(["UNZIP_FAILED", "UNSAFE_ARCHIVE", "INCOMPLETE_ARCHIVE",
      "CHECKSUM_MISMATCH", "DEPLOYMENT_ALREADY_RUNNING", "RELEASE_DOES_NOT_MATCH_SOURCE",
      "IMMUTABLE_RELEASE_CONFLICT", "CURRENT_PATH_IS_NOT_A_RELEASE_LINK", "RELEASE_TOO_LARGE",
      "RELEASE_NOT_READY_OR_ACCESS_DENIED", "GITHUB_ACCESS_FAILED", "GITHUB_DOWNLOAD_FAILED",
      "INCOMPLETE_GITHUB_RELEASE", "UNSAFE_DOWNLOAD_REDIRECT", "INVALID_REPOSITORY",
      "INVALID_RELEASE", "NODE_VERSION_TOO_OLD", "PRIVATE_CONFIG_PERMISSIONS_REQUIRED"]);
    const code = allowed.has(error.code) ? error.code : "DEPLOYMENT_FAILED";
    process.stderr.write(`Sabito : ${code}. Version précédente conservée ; vérifie GitHub Actions et la configuration privée. Aucun secret affiché.\n`);
    process.exitCode = 1;
  });
}
