import assert from "node:assert/strict";
import { test } from "node:test";
import { readMysqlConfiguration } from "./database-config";

const fields = {
  MYSQL_HOST: " localhost ", MYSQL_DATABASE: " sabito_test ",
  MYSQL_USER: " test_user ", MYSQL_PASSWORD: "  fixture:@#%/?  ",
};

test("required configuration uses MYSQL_* only and defaults to port 3306", () => {
  const config = readMysqlConfiguration(fields);
  assert.equal(config.host, "localhost");
  assert.equal(config.database, "sabito_test");
  assert.equal(config.user, "test_user");
  assert.equal(config.password, fields.MYSQL_PASSWORD);
  assert.equal(config.port, 3306);
});

test("custom ports are trimmed and validated", () => {
  assert.equal(readMysqlConfiguration({ ...fields, MYSQL_PORT: " 33308 " }).port, 33308);
  for (const port of ["0", "65536", "-1", "abc", "3306.5", "1e3"]) {
    assert.throws(() => readMysqlConfiguration({ ...fields, MYSQL_PORT: port }), /MYSQL_PORT/);
  }
  for (const port of ["1", "65535"]) {
    assert.equal(readMysqlConfiguration({ ...fields, MYSQL_PORT: port }).port, Number(port));
  }
});

test("every required field is checked without exposing values", () => {
  for (const field of ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"]) {
    assert.throws(() => readMysqlConfiguration({ ...fields, [field]: "" }), new RegExp(field));
  }
  for (const field of ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER"]) {
    assert.throws(() => readMysqlConfiguration({ ...fields, [field]: " " }), new RegExp(field));
  }
});

test("password whitespace is not modified", () => {
  assert.equal(readMysqlConfiguration({ ...fields, MYSQL_PASSWORD: "  " }).password, "  ");
});

test("URLs and old DB_* settings are never a fallback", () => {
  assert.throws(() => readMysqlConfiguration({
    DATABASE_URL: "postgresql://fixture:fixture@localhost/test",
    CYBRANCEE_DATABASE_URL: "mysql://fixture:fixture@localhost/test",
    DB_HOST: "localhost", DB_NAME: "test", DB_USER: "fixture", DB_PASSWORD: "fixture",
  }), /MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD/);
});
