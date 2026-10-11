import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveDatabaseConfiguration } from "./database-config";

const mysqlFields = {
  DB_HOST: "localhost", DB_PORT: "3306", DB_NAME: "sabito_test",
  DB_USER: "test_user", DB_PASSWORD: "test:@#%/? with spaces ",
};

test("separate settings select MySQL even with a managed PostgreSQL URL", () => {
  const config = resolveDatabaseConfiguration({
    ...mysqlFields, DATABASE_URL: "postgresql://test:test@localhost/test",
  });
  assert.equal(config.dialect, "mysql");
  if (config.dialect !== "mysql") throw new Error("Expected MySQL");
  assert.equal(config.mysql.host, "localhost");
  assert.equal(config.mysql.port, 3306);
  assert.equal(config.mysql.database, "sabito_test");
  assert.equal(config.mysql.user, "test_user");
  assert.equal(config.mysql.password, mysqlFields.DB_PASSWORD);
  assert.equal(config.mysql.tls, false);
});

test("port defaults to 3306 and custom ports are supported", () => {
  for (const [value, expected] of [[undefined, 3306], ["33308", 33308]] as const) {
    const config = resolveDatabaseConfiguration({ ...mysqlFields, DB_PORT: value });
    assert.equal(config.dialect, "mysql");
    if (config.dialect === "mysql") assert.equal(config.mysql.port, expected);
  }
});

test("incomplete separate settings never fall back to PostgreSQL", () => {
  assert.throws(() => resolveDatabaseConfiguration({
    DB_HOST: "localhost", DATABASE_URL: "postgresql://test:test@localhost/test",
  }), /Required: DB_NAME, DB_USER, DB_PASSWORD/);
});

test("missing fields and whitespace-only identifiers are rejected without values", () => {
  for (const field of ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"]) {
    assert.throws(() => resolveDatabaseConfiguration({ ...mysqlFields, [field]: "" }), new RegExp(field));
  }
  assert.throws(() => resolveDatabaseConfiguration({ ...mysqlFields, DB_HOST: " " }), /DB_HOST/);
});

test("invalid ports fail explicitly", () => {
  for (const port of ["0", "65536", "-1", "abc", "3306.5"]) {
    assert.throws(() => resolveDatabaseConfiguration({ ...mysqlFields, DB_PORT: port }), /DB_PORT/);
  }
});

test("TLS is explicit and invalid values are rejected", () => {
  const config = resolveDatabaseConfiguration({ ...mysqlFields, DB_SSL: "true" });
  if (config.dialect !== "mysql") throw new Error("Expected MySQL");
  assert.equal(config.mysql.tls, true);
  assert.throws(() => resolveDatabaseConfiguration({ ...mysqlFields, DB_SSL: "insecure" }), /DB_SSL/);
});

test("existing MySQL URLs remain supported", () => {
  const config = resolveDatabaseConfiguration({
    DATABASE_URL: "mysql://test_user:test%40%23%25@localhost:33308/sabito_test?ssl=true",
  });
  if (config.dialect !== "mysql") throw new Error("Expected MySQL");
  assert.equal(config.mysql.password, "test@#%");
  assert.equal(config.mysql.port, 33308);
  assert.equal(config.mysql.tls, true);
});

test("PostgreSQL stays available only without separate MySQL settings", () => {
  assert.equal(resolveDatabaseConfiguration({
    DATABASE_URL: "postgresql://test:test@localhost/test",
  }).dialect, "postgres");
});

test("invalid URLs never appear in errors", () => {
  for (const value of ["not-a-url-FAKE_PASSWORD", "https://test:FAKE_PASSWORD@localhost/test"]) {
    assert.throws(() => resolveDatabaseConfiguration({ DATABASE_URL: value }), error =>
      error instanceof Error && !error.message.includes("FAKE_PASSWORD"));
  }
  assert.throws(() => resolveDatabaseConfiguration({ DATABASE_URL: "mysql://user:%zz@localhost/test" }),
    /invalid URL encoding/);
});
