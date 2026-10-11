// Run from the Sabito checkout. Default: preview changes; --apply writes them.
import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const target = process.argv[2];
if (!target) throw new Error("Usage: node deployment/bca/install-laravel.mjs /chemin/backend-bca [--apply]");
const root = await realpath(target);
const kit = path.join(path.dirname(fileURLToPath(import.meta.url)), "laravel");
const composer = JSON.parse(await readFile(path.join(root, "composer.json"), "utf8"));
if (!composer.require?.["laravel/framework"]?.includes("12")) {
  throw new Error("Ce kit cible le backend BCA Laravel 12 fourni.");
}
const edits = new Map();
for (const file of ["config/sabito.php", "routes/sabito.php",
  "app/Http/Controllers/SabitoSessionController.php", "tests/Feature/SabitoSessionTest.php"]) {
  const content = await readFile(path.join(kit, file), "utf8");
  let existing;
  try { existing = await readFile(path.join(root, file), "utf8"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing !== undefined && existing !== content) {
    throw new Error(`Fichier existant différent : ${file}. Fusion manuelle requise, aucun fichier écrit.`);
  }
  if (existing === undefined) edits.set(file, content);
}
const routes = await readFile(path.join(root, "routes/api.php"), "utf8");
const include = "require __DIR__.'/sabito.php';";
if (!routes.includes(include)) edits.set("routes/api.php", `${routes.trimEnd()}\n\n${include}\n`);
const cors = await readFile(path.join(root, "config/cors.php"), "utf8");
if (!cors.includes("SABITO_FRONTEND_ORIGINS")) {
  const expected = "'allowed_origins' => ['http://localhost:5173', 'http://127.0.0.1:5173'],";
  if (!cors.includes(expected)) throw new Error("CORS différent de l'archive : fusion manuelle requise, aucun fichier écrit.");
  edits.set("config/cors.php", cors.replace(expected, `'allowed_origins' => array_values(array_unique(array_merge(
        ['http://localhost:5173', 'http://127.0.0.1:5173'],
        array_filter(array_map('trim', explode(',', (string) env('SABITO_FRONTEND_ORIGINS', ''))))
    ))),`));
}
for (const [file, content] of edits) {
  if (process.argv.includes("--apply")) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), content);
  }
  console.log(`${process.argv.includes("--apply") ? "Écrit" : "Prévu"} : ${file}`);
}
console.log("Aucune clé ni base modifiée. Frontend séparé : voir deployment/bca/laravel/README.md.");
