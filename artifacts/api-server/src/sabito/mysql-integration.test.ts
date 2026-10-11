import assert from "node:assert/strict";
import { test } from "node:test";
import { initializeMysqlSchema, mysqlMigrationStatus } from "./mysql-schema";
import { checkMysqlConnection, closeMysqlPool, getMysqlPool, withMysqlTransaction } from "./mysql-pool";

test("isolated MySQL: connection, migration replay protection, prepared values and rollback", async () => {
  assert.ok(["localhost", "127.0.0.1"].includes(process.env.MYSQL_HOST ?? ""), "Local test host required.");
  assert.match(process.env.MYSQL_DATABASE ?? "", /^sabito_test/, "Isolated test database required.");
  try {
    await checkMysqlConnection();
    await initializeMysqlSchema({ apply: true });
    const first = await mysqlMigrationStatus();
    assert.equal(first.applied.length, 1);
    assert.equal(first.pending.length, 0);
    const [before] = await getMysqlPool().execute("SELECT applied_at FROM schema_migrations");
    await initializeMysqlSchema({ apply: true });
    const [after] = await getMysqlPool().execute("SELECT applied_at FROM schema_migrations");
    assert.deepEqual(after, before, "Already applied migrations must not be replayed.");
    await initializeMysqlSchema({ apply: false });
    const [rows] = await getMysqlPool().execute("SELECT ? AS value", ["fixture'; SELECT 99; --"]);
    assert.equal((rows as { value: string }[])[0].value, "fixture'; SELECT 99; --");
    await getMysqlPool().query("CREATE TEMPORARY TABLE IF NOT EXISTS ignored_temp (value INT)");
    // A regular fixture table makes rollback visible across pool connections.
    await getMysqlPool().query("CREATE TABLE IF NOT EXISTS sabito_test_transaction (value INT) ENGINE=InnoDB");
    await getMysqlPool().execute("DELETE FROM sabito_test_transaction");
    await assert.rejects(withMysqlTransaction(async connection => {
      await connection.execute("INSERT INTO sabito_test_transaction (value) VALUES (?)", [7]);
      throw new Error("fixture rollback");
    }), /fixture rollback/);
    const [remaining] = await getMysqlPool().execute("SELECT value FROM sabito_test_transaction");
    assert.equal((remaining as unknown[]).length, 0);
    await withMysqlTransaction(async connection => {
      await connection.execute("INSERT INTO sabito_test_transaction (value) VALUES (?)", [8]);
    });
    const [committed] = await getMysqlPool().execute("SELECT value FROM sabito_test_transaction");
    assert.equal((committed as { value: number }[])[0].value, 8);
    await getMysqlPool().query("DROP TABLE sabito_test_transaction");
  } finally { await closeMysqlPool(); }
});
