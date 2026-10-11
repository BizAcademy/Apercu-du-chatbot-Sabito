// Explicit operator command, never invoked by the server or Deploy Now.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const entry = path.join(root, ".sabito-runtime", "current", "migrate.js");
process.env.SABITO_CONFIG_FILE ||= path.join(root, ".env");
if (!fs.existsSync(entry)) {
  process.stderr.write("Sabito : déploie d'abord une version compilée.\n");
  process.exitCode = 1;
} else {
  require(entry);
}
