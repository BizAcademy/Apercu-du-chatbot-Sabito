import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// The same source tree is available to GitHub Actions and to Plesk's Git target.
// Build outputs, runtime releases, local configuration and secrets are excluded.
const directories = ["artifacts/api-server", "artifacts/sabito-web", "lib", "scripts", "deployment", "migrations/mysql", ".github/workflows"];
const files = ["app.js", "package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "tsconfig.json", "tsconfig.base.json", ".npmrc"];
const excluded = new Set(["node_modules", "dist", "build", ".git", ".replit-artifact", ".sabito-runtime"]);

export async function getDeploymentSourceFiles(root) {
  const names = [];
  async function walk(relative) {
    for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
      if (excluded.has(entry.name) || entry.name.startsWith(".env") ||
          /\.(tsbuildinfo|log)$/.test(entry.name)) continue;
      const name = `${relative}/${entry.name}`;
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) names.push(name);
      else throw new Error("Source symlinks are not supported in the deployment fingerprint.");
    }
  }
  for (const directory of directories) await walk(directory);
  names.push(...files);
  return names.sort();
}

export async function getSourceFingerprint(root) {
  const hash = createHash("sha256");
  for (const name of await getDeploymentSourceFiles(root)) {
    hash.update(name).update("\0").update(await readFile(path.join(root, name))).update("\0");
  }
  return hash.digest("hex");
}

export const releaseTag = fingerprint => `plesk-${fingerprint}`;
