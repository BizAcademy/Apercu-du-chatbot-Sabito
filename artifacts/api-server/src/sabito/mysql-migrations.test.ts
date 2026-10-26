import assert from "node:assert/strict";
import { mock, test } from "node:test";
import mysql, { type Pool } from "mysql2/promise";
import { closeMysqlPool } from "./mysql-pool";
import { initializeMysqlSchema, loadMysqlMigrations, mysqlMigrationStatus } from "./mysql-schema";

test("migrations: production stays read-only; tracked files apply only once", async () => {
  const keys = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD", "NODE_ENV"];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    MYSQL_HOST: "localhost", MYSQL_DATABASE: "sabito_test",
    MYSQL_USER: "fixture", MYSQL_PASSWORD: "fixture", NODE_ENV: "production",
  });
  let tableExists = false, applications = 0, releases = 0;
  const applied: string[] = [];
  const connection = {
    async execute(sql: string, values: unknown[] = []) {
      if (sql.includes("information_schema")) return [tableExists ? [{ exists: 1 }] : [], []];
      if (sql.startsWith("SELECT name")) return [applied.map(name => ({ name })), []];
      if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }], []];
      if (sql.startsWith("INSERT INTO schema_migrations")) applied.push(String(values[0]));
      return [[], []];
    },
    async query(sql: string) {
      if (sql.includes("CREATE TABLE IF NOT EXISTS schema_migrations")) tableExists = true;
      else applications++;
      return [[], []];
    },
    release() { releases++; },
  };
  mock.method(mysql, "createPool", () => ({
    async getConnection() { return connection; }, async end() {},
  }) as unknown as Pool);
  try {
    const expectedMigrations = (await loadMysqlMigrations()).map(migration => migration.name);
    assert.ok(expectedMigrations.length > 0, "The suite must exercise the tracked migrations.");
    await assert.rejects(initializeMysqlSchema({ apply: false }), /Pending MySQL migrations/);
    assert.equal(tableExists, false, "Production startup must not create the history table.");
    await assert.rejects(initializeMysqlSchema({ apply: true }), /explicit review/);
    assert.equal(applications, 0);
    await assert.rejects(initializeMysqlSchema({ apply: true, reviewed: true }), /explicit destructive-change approval/);
    await initializeMysqlSchema({ apply: true, reviewed: true, allowDestructive: true });
    assert.deepEqual(applied, expectedMigrations, "Every tracked migration must be applied in order.");
    assert.equal(applications, expectedMigrations.length);
    await initializeMysqlSchema({ apply: true, reviewed: true, allowDestructive: true });
    assert.deepEqual(applied, expectedMigrations, "Already applied migrations must not be tracked twice.");
    assert.equal(applications, expectedMigrations.length, "Already applied migrations must not run again.");
    assert.equal((await mysqlMigrationStatus()).pending.length, 0);
    assert.ok(releases >= 4);
  } finally {
    await closeMysqlPool();
    mock.restoreAll();
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
