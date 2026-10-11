// Explicit operator command, never invoked by the server or Deploy Now.
const path = require("node:path");
const root = path.resolve(__dirname, "..");
process.env.SABITO_CONFIG_FILE ||= path.join(root, ".env");
async function run() {
  const { getSourceFingerprint } = await import("../scripts/src/plesk-fingerprint.mjs");
  const { ensureCurrentRelease } = await import("./deploy-plesk.mjs");
  const fingerprint = await getSourceFingerprint(root);
  // Download only the already built release, never build/install or apply SQL.
  const current = await ensureCurrentRelease(root, fingerprint);
  require(path.join(current, "migrate.js"));
}
run().catch(async error => {
  let code = "DEPLOYMENT_FAILED";
  try {
    const { deploymentErrorCode } = await import("./deploy-plesk.mjs");
    code = deploymentErrorCode(error);
  } catch {}
  process.stderr.write(`Sabito : ${code}. Impossible de lancer le migrateur correspondant aux sources. Vérifie le workflow GitHub et le déploiement du dépôt. Aucun secret affiché.\n`);
  process.exitCode = 1;
});
