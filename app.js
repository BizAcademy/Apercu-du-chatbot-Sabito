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
start().catch(() => {
  process.stderr.write("Sabito : lancement impossible. Vérifie que GitHub Actions est terminé, l'accès aux Releases, unzip et les variables privées. Aucun build ni migration automatique effectué.\n");
  process.exitCode = 1;
});
