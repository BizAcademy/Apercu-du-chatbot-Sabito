// Production launcher for Plesk. Build outputs are downloaded by Deploy Now,
// never compiled at startup and never committed into the source repository.
const path = require("node:path");
const fs = require("node:fs");
process.env.SABITO_CONFIG_FILE ||= path.join(__dirname, ".env");
async function start() {
  const { getSourceFingerprint } = await import("./scripts/src/plesk-fingerprint.mjs");
  const fingerprint = await getSourceFingerprint(__dirname);
  const current = path.join(__dirname, ".sabito-runtime", "current");
  let activeFingerprint;
  try {
    activeFingerprint = JSON.parse(fs.readFileSync(path.join(current, "release.json"), "utf8")).sourceFingerprint;
  } catch {}
  if (activeFingerprint !== fingerprint) {
    // Only download an already built GitHub Release. Never build or install here.
    const { deployFromGithub } = await import("./deployment/deploy-plesk.mjs");
    await deployFromGithub(__dirname);
  }
  require(path.join(current, "app.js"));
}
start().catch((error) => {
  const known = new Set(["CHECKSUM_MISMATCH", "CURRENT_PATH_IS_NOT_A_RELEASE_LINK",
    "DEPLOYMENT_ALREADY_RUNNING", "GITHUB_ACCESS_FAILED", "GITHUB_DOWNLOAD_FAILED",
    "IMMUTABLE_RELEASE_CONFLICT", "INCOMPLETE_ARCHIVE", "INCOMPLETE_GITHUB_RELEASE",
    "INVALID_RELEASE", "INVALID_REPOSITORY", "NODE_VERSION_TOO_OLD",
    "PRIVATE_CONFIG_PERMISSIONS_REQUIRED", "RELEASE_DOES_NOT_MATCH_SOURCE",
    "RELEASE_NOT_READY_OR_ACCESS_DENIED", "RELEASE_TOO_LARGE", "UNSAFE_ARCHIVE",
    "UNSAFE_DOWNLOAD_REDIRECT", "UNZIP_FAILED", "MODULE_NOT_FOUND", "ERR_MODULE_NOT_FOUND"]);
  const code = known.has(error?.code) ? error.code : "STARTUP_FAILED";
  process.stderr.write(`Sabito : lancement impossible [${code}]. Vérifie que GitHub Actions est terminé, l'accès aux Releases, unzip et les variables privées. Aucun build ni migration automatique effectué.\n`);
  // Passenger keeps its control channel open: exitCode alone can leave a failed
  // bootstrap alive forever without an HTTP listener.
  process.exit(1);
});
