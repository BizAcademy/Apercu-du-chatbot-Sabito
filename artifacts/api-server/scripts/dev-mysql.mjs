import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, access, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

// Development only: a loopback database, never production MYSQL_* credentials.
const artifact = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(artifact, "../..");
const runtime = path.join(root, "generated-artifacts/mysql-preview");
const data = path.join(runtime, "data");
const socket = path.join(runtime, "mysql.sock");
const marker = path.join(runtime, "initialized");
const osUser = os.userInfo().username;
const verifying = process.argv.includes("--verify");
const cliArgs = ["--no-defaults", `--socket=${socket}`, `--user=${osUser}`, "--batch"];
let database, application, stopping = false;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"], ...options,
    });
    // Do not forward database tool output: it may contain connection details.
    child.stdout?.resume();
    child.stderr?.resume();
    child.once("error", () => reject(new Error("Local MySQL tool unavailable.")));
    child.once("exit", code => code === 0 ? resolve() : reject(new Error("Local MySQL tool failed.")));
    child.stdin?.end(options.input);
  });
}

async function stop(code) {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(code || 1), 12000);
  deadline.unref();
  if (application && application.exitCode === null) {
    application.kill("SIGTERM");
    await new Promise(resolve => application.once("exit", resolve));
  }
  if (database && database.exitCode === null) {
    database.kill("SIGTERM");
    await new Promise(resolve => database.once("exit", resolve));
  }
  clearTimeout(deadline);
  process.exit(code);
}
process.once("SIGTERM", () => stop(0));
process.once("SIGINT", () => stop(0));

try {
  if (process.env.NODE_ENV === "production") throw new Error("Development database is forbidden in production.");
  await mkdir(data, { recursive: true, mode: 0o700 });
  let initialized = false;
  try { await access(marker); initialized = true; } catch {}
  if (!initialized) {
    await run("mariadb-install-db", [
      "--no-defaults", `--datadir=${data}`, "--auth-root-authentication-method=socket",
      `--auth-root-socket-user=${osUser}`, "--skip-test-db", "--skip-name-resolve",
      "--innodb-use-native-aio=0",
    ]);
    await writeFile(marker, "Local isolated development database initialized.\n", { mode: 0o600 });
  }
  let reuse = false;
  if (verifying) {
    try { await run("mariadb", cliArgs, { input: "SELECT 1;\n" }); reuse = true; } catch {}
  }
  if (!reuse) {
    database = spawn("mariadbd", [
      "--no-defaults", `--datadir=${data}`, `--socket=${socket}`,
      `--pid-file=${path.join(runtime, "mysql.pid")}`, "--bind-address=127.0.0.1",
      "--port=33308", "--skip-name-resolve", "--innodb-use-native-aio=0",
      `--log-error=${path.join(runtime, "mysql.log")}`,
    ], { stdio: "ignore" });
    database.once("error", () => stop(1));
    database.once("exit", () => { if (!stopping) stop(1); });
  }
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { await run("mariadb", cliArgs, { input: "SELECT 1;\n" }); ready = true; break; }
    catch { await delay(200); }
  }
  if (!ready) throw new Error("Local development database did not become ready.");
  // Process-local password, not persisted, printed or obtained from production.
  const password = randomBytes(32).toString("hex");
  // Verification does not rotate the running Preview's account or use its data.
  const databaseName = verifying ? "sabito_test_verify" : "sabito_test_preview";
  const databaseUser = verifying ? "sabito_verify" : "sabito_preview";
  await run("mariadb", cliArgs, { input: `
    CREATE DATABASE IF NOT EXISTS ${databaseName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER IF NOT EXISTS '${databaseUser}'@'127.0.0.1' IDENTIFIED BY '${password}';
    ALTER USER '${databaseUser}'@'127.0.0.1' IDENTIFIED BY '${password}';
    GRANT ALL PRIVILEGES ON ${databaseName}.* TO '${databaseUser}'@'127.0.0.1';
  ` });
  const env = {
    ...process.env, NODE_ENV: "development",
    MYSQL_HOST: "127.0.0.1", MYSQL_PORT: "33308", MYSQL_DATABASE: databaseName,
    MYSQL_USER: databaseUser, MYSQL_PASSWORD: password,
  };
  if (verifying) {
    for (const [command, args, cwd] of [
      [process.execPath, ["--import", "tsx", "--test", "--test-concurrency=1", "--test-timeout=45000",
        "src/sabito/core.test.ts", "src/sabito/mysql-integration.test.ts"], artifact],
      [process.execPath, ["scripts/src/smoke-cybrancee.mjs"], root],
    ]) {
      application = spawn(command, args, { cwd, env, stdio: "inherit" });
      const code = await new Promise(resolve => application.once("exit", resolve));
      if (code !== 0) throw new Error("Local MySQL verification failed.");
    }
    await stop(0);
  } else {
    application = spawn(process.execPath, ["--enable-source-maps", "dist/index.mjs"], {
      cwd: artifact, env, stdio: "inherit",
    });
    application.once("error", () => stop(1));
    application.once("exit", code => stop(code ?? 1));
  }
} catch {
  process.stderr.write("The isolated local MySQL environment could not start. Check MariaDB tools and local runtime permissions; no production database was used.\n");
  await stop(1);
}
