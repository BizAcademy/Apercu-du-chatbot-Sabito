import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSourceFingerprint } from "./plesk-fingerprint.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = path.join(root, "generated-artifacts/sabito-cybrancee");
const run = (command, args, env = {}) => {
  const result = spawnSync(command, args, {
    cwd: root, stdio: "inherit", env: { ...process.env, ...env },
  });
  if (result.status !== 0) throw new Error(`${command} failed`);
};
run("pnpm", ["--filter", "@workspace/api-server", "run", "build"], {
  SABITO_BUNDLE_MYSQL: "1",
});
run("pnpm", ["--filter", "@workspace/sabito-web", "run", "build"], {
  PORT: "22386", BASE_PATH: "/", NODE_ENV: "production",
});
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, "artifacts/api-server/dist"), output, { recursive: true });
await cp(path.join(root, "artifacts/sabito-web/dist/public"), path.join(output, "public"), { recursive: true });
const apiRequire = createRequire(path.join(root, "artifacts/api-server/package.json"));
const { build } = apiRequire("esbuild");
await writeFile(path.join(output, "package.json"), JSON.stringify({
  name: "sabito-cybrancee",
  version: "1.0.0",
  private: true,
  engines: { node: ">=21.7.3" },
  scripts: {
    start: "node app.js",
    "migrate:status": "node migrate.js --status",
    "migrate:plan": "node migrate.js --plan",
    "migrate:apply": "node migrate.js --apply",
  },
  dependencies: {},
}, null, 2) + "\n");
const appBootstrap = `// Plesk startup file; contains no credentials.
const path = require("node:path");
require("dotenv").config({ path: process.env.SABITO_CONFIG_FILE || path.join(__dirname, ".env"), quiet: true });
process.env.NODE_ENV = "production";
process.env.PORT ||= "3000";
process.env.SABITO_WEB_DIR = path.join(__dirname, "public");
import("./index.mjs").catch(() => {
  process.stderr.write("Sabito n'a pas pu démarrer. Vérifie les variables MYSQL_*, la connexion et l'historique des migrations.\\n");
  process.exit(1);
});
`;
const migrationBootstrap = `// Explicit operator action; never executed by app.js.
const path = require("node:path");
require("dotenv").config({ path: process.env.SABITO_CONFIG_FILE || path.join(__dirname, ".env"), quiet: true });
process.env.NODE_ENV = "production";
import("./migrate-mysql.mjs").catch(() => {
  process.stderr.write("La commande de migration MySQL a échoué.\\n");
  process.exitCode = 1;
});
`;
for (const [filename, contents] of [["app.js", appBootstrap], ["migrate.js", migrationBootstrap]]) {
  await build({
    stdin: { contents, resolveDir: path.join(root, "artifacts/api-server"), sourcefile: filename },
    outfile: path.join(output, filename),
    bundle: true, platform: "node", format: "cjs", target: "node21.7",
    external: ["./index.mjs", "./migrate-mysql.mjs"],
  });
}
await writeFile(path.join(output, "release.json"), JSON.stringify({
  sourceFingerprint: await getSourceFingerprint(root),
  nodeMinimum: "21.7.3",
}, null, 2) + "\n");
await cp(path.join(root, "deployment/cybrancee.env.example"), path.join(output, ".env.example"));
await cp(path.join(root, "deployment/CYBRANCEE.md"), path.join(output, "INSTALLATION.md"));
await cp(path.join(root, "deployment/PLESK_GIT.md"), path.join(output, "PLESK_GIT.md"));
// A deployable ZIP contains built application files, never workspace .env or secrets.
const archive = path.join(root, "generated-artifacts/sabito-cybrancee.zip");
await rm(archive, { force: true });
const zip = spawnSync("zip", ["-qr", archive, "."], { cwd: output, stdio: "inherit" });
if (zip.status !== 0) throw new Error("ZIP generation failed");
const checksum = createHash("sha256").update(await readFile(archive)).digest("hex");
await writeFile(`${archive}.sha256`, `${checksum}  sabito-cybrancee.zip\n`);
console.info("Deployment package: generated-artifacts/sabito-cybrancee.zip");
