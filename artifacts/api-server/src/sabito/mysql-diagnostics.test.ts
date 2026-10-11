import assert from "node:assert/strict";
import { test } from "node:test";
import { describeMysqlFailure } from "./mysql-diagnostics";

test("MySQL diagnostics identify connection, authentication, database and permission failures", () => {
  for (const code of ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ER_ACCESS_DENIED_ERROR",
    "ER_DBACCESS_DENIED_ERROR", "ER_BAD_DB_ERROR", "ER_TABLEACCESS_DENIED_ERROR"]) {
    const diagnostic = describeMysqlFailure({ code, message: "PRIVATE_DRIVER_MESSAGE", sql: "PRIVATE_SQL" });
    assert.equal(diagnostic.code, code);
    assert.ok(diagnostic.reason && diagnostic.nextStep);
    assert.doesNotMatch(JSON.stringify(diagnostic), /PRIVATE_/);
  }
});

test("MySQL diagnostics distinguish missing configuration, invalid port and migration history", () => {
  assert.deepEqual(describeMysqlFailure(new Error("Missing MySQL configuration: MYSQL_HOST, MYSQL_PASSWORD.")).missingVariables,
    ["MYSQL_HOST", "MYSQL_PASSWORD"]);
  assert.equal(describeMysqlFailure(new Error("MYSQL_PORT must be an integer between 1 and 65535.")).code, "MYSQL_CONFIG_INVALID_PORT");
  assert.equal(describeMysqlFailure(new Error("MySQL migration files are missing.")).code, "MYSQL_MIGRATION_FILES_MISSING");
  assert.equal(describeMysqlFailure(new Error("Migration history contains files missing from this release. Review before continuing.")).code,
    "MYSQL_MIGRATION_HISTORY_MISMATCH");
  assert.equal(describeMysqlFailure(new Error("Pending MySQL migrations: review and apply them explicitly before production startup.")).code,
    "MYSQL_MIGRATIONS_PENDING");
});

test("MySQL diagnostics do not suggest automatic application without migration review", () => {
  for (const message of ["Production migrations require explicit review.",
    "Review the migration plan before explicitly approving application.",
    "A migration requires explicit destructive-change approval."]) {
    const diagnostic = describeMysqlFailure(new Error(message));
    assert.match(diagnostic.code, /REVIEW_REQUIRED$/);
    assert.match(diagnostic.nextStep, /plan|impact/);
  }
});

test("MySQL diagnostics recognize aggregate connection errors and bounded causes", () => {
  const nested = new AggregateError([{ code: "ECONNREFUSED", message: "PRIVATE_CONNECTION" }], "PRIVATE_AGGREGATE");
  assert.equal(describeMysqlFailure(new Error("PRIVATE_OUTER", { cause: nested })).code, "ECONNREFUSED");
  const cycle: { cause?: unknown } = {};
  cycle.cause = cycle;
  assert.equal(describeMysqlFailure(cycle).code, "MYSQL_DIAGNOSTIC_UNKNOWN");
});

test("Unknown diagnostics never disclose arbitrary messages, codes, SQL or configuration", () => {
  const cases = [
    { code: "PRIVATE_CODE", message: "PRIVATE_PASSWORD", sql: "PRIVATE_SQL", config: { password: "PRIVATE_PASSWORD" } },
    new Error("Missing MySQL configuration: PRIVATE_PASSWORD."),
    new Error("PRIVATE_CONNECTION_URL"),
    "PRIVATE_STRING",
    null,
  ];
  for (const error of cases) {
    const diagnostic = describeMysqlFailure(error);
    assert.equal(diagnostic.code, "MYSQL_DIAGNOSTIC_UNKNOWN");
    assert.doesNotMatch(JSON.stringify(diagnostic), /PRIVATE_/);
  }
});
