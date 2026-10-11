import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = path.join(root, "generated-artifacts/sabito-cybrancee");
const run = (command, args, env = {}) => {
  const result = spawnSync(command, args, {
    cwd: root, stdio: "inherit", env: { ...process.env, ...env },
  });
  if (result.status !== 0) throw new Error(`${command} failed`);
};
run("pnpm", ["--filter", "@workspace/api-server", "run", "build"]);
run("pnpm", ["--filter", "@workspace/sabito-web", "run", "build"], {
  PORT: "22386", BASE_PATH: "/", NODE_ENV: "production",
});
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, "artifacts/api-server/dist"), output, { recursive: true });
await cp(path.join(root, "artifacts/sabito-web/dist/public"), path.join(output, "public"), { recursive: true });
const apiPackage = JSON.parse(await readFile(path.join(root, "artifacts/api-server/package.json"), "utf8"));
await writeFile(path.join(output, "package.json"), JSON.stringify({
  name: "sabito-cybrancee",
  version: "1.0.0",
  private: true,
  engines: { node: ">=22" },
  scripts: { start: "node app.js" },
  dependencies: { mysql2: apiPackage.dependencies.mysql2, dotenv: apiPackage.dependencies.dotenv },
}, null, 2) + "\n");
await writeFile(path.join(output, "app.js"), `// Plesk startup file; contains no credentials.
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
process.env.NODE_ENV = "production";
process.env.PORT ||= "3000";
process.env.SABITO_WEB_DIR = path.join(__dirname, "public");
import("./index.mjs").catch(() => {
  process.stderr.write("Sabito n'a pas pu démarrer. Vérifie DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, les permissions de la base et les variables d'environnement.\\n");
  process.exit(1);
});
`);
await cp(path.join(root, "deployment/cybrancee.env.example"), path.join(output, ".env.example"));
await cp(path.join(root, "deployment/CYBRANCEE.md"), path.join(output, "INSTALLATION.md"));
// A deployable ZIP contains built application files, never workspace .env or secrets.
const archive = path.join(root, "generated-artifacts/sabito-cybrancee.zip");
await rm(archive, { force: true });
const zip = spawnSync("zip", ["-qr", archive, "."], { cwd: output, stdio: "inherit" });
if (zip.status !== 0) throw new Error("ZIP generation failed");
console.info("Deployment package: generated-artifacts/sabito-cybrancee.zip");
