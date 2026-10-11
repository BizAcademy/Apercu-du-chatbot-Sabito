import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import mysql, { type Pool } from "mysql2/promise";
import {
  checkMysqlConnection, closeMysqlPool, createMysqlAdapter,
  getMysqlPool, withMysqlTransaction,
} from "./mysql-pool";

const keys = ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"] as const;
let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    MYSQL_HOST: "localhost", MYSQL_PORT: "3306", MYSQL_DATABASE: "sabito_test",
    MYSQL_USER: "fixture_user", MYSQL_PASSWORD: "fixture_password",
  });
});
afterEach(async () => {
  await closeMysqlPool();
  mock.restoreAll();
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function fixture(options: { callbackFailure?: boolean; commitFailure?: boolean } = {}) {
  const calls: string[] = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async commit() { calls.push("commit"); if (options.commitFailure) throw new Error("fixture commit failure"); },
    async rollback() { calls.push("rollback"); },
    release() { calls.push("release"); },
    async query() { return [[], []]; },
    async execute(sql: string, values?: unknown[]) {
      calls.push("execute");
      return [[{ sql, values }], []];
    },
  };
  const pool = {
    async getConnection() { return connection; },
    async execute(sql: string) { calls.push(sql); return [[{ ok: 1 }], []]; },
    async end() { calls.push("end"); },
  };
  const factory = mock.method(mysql, "createPool", () => pool as unknown as Pool);
  return { calls, factory, pool };
}

test("getMysqlPool is lazy, singleton and uses the requested options", async () => {
  const { factory, pool } = fixture();
  assert.equal(factory.mock.callCount(), 0);
  assert.equal(getMysqlPool(), pool);
  assert.equal(getMysqlPool(), pool);
  assert.equal(factory.mock.callCount(), 1);
  const options = factory.mock.calls[0].arguments[0];
  assert.equal(typeof options, "object");
  if (!options || typeof options === "string") throw new Error("Expected separate settings");
  assert.equal(options.waitForConnections, true);
  assert.equal(options.connectionLimit, 10);
  assert.equal(options.multipleStatements, true);
});

test("checkMysqlConnection performs SELECT 1", async () => {
  const { calls } = fixture();
  await checkMysqlConnection();
  assert.deepEqual(calls, ["SELECT 1"]);
});

test("closeMysqlPool is idempotent and allows a new singleton", async () => {
  const { calls, factory } = fixture();
  await closeMysqlPool();
  assert.equal(factory.mock.callCount(), 0);
  getMysqlPool();
  await closeMysqlPool();
  await closeMysqlPool();
  assert.deepEqual(calls, ["end"]);
  getMysqlPool();
  assert.equal(factory.mock.callCount(), 2);
});

test("successful transactions commit and always release", async () => {
  const { calls } = fixture();
  assert.equal(await withMysqlTransaction(async () => "fixture result"), "fixture result");
  assert.deepEqual(calls, ["begin", "commit", "release"]);
});

test("failed transactions roll back and always release", async () => {
  const { calls } = fixture();
  await assert.rejects(withMysqlTransaction(async () => { throw new Error("fixture failure"); }), /fixture failure/);
  assert.deepEqual(calls, ["begin", "rollback", "release"]);
});

test("failed commits also roll back and release", async () => {
  const { calls } = fixture({ commitFailure: true });
  await assert.rejects(withMysqlTransaction(async () => undefined), /fixture commit failure/);
  assert.deepEqual(calls, ["begin", "commit", "rollback", "release"]);
});

test("runtime values use prepared placeholders, never concatenation", async () => {
  const { calls } = fixture();
  const result = await createMysqlAdapter().query("SELECT $1 AS value", ["fixture'; DROP TABLE fixture; --"]);
  assert.equal(result.rows[0].sql, "SELECT ? AS value");
  assert.deepEqual(result.rows[0].values, ["fixture'; DROP TABLE fixture; --"]);
  assert.deepEqual(calls, ["execute", "release"]);
});
