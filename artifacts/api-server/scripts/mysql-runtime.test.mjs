import assert from "node:assert/strict";
import { rm, stat } from "node:fs/promises";
import { test } from "node:test";
import { createMysqlRuntime } from "./mysql-runtime.mjs";

test("GitHub verification uses a short private temporary socket, even with a long repository name", async () => {
  const root = "/home/runner/work/Apercu-du-chatbot-Sabito/Apercu-du-chatbot-Sabito";
  assert.ok(Buffer.byteLength(`${root}/generated-artifacts/mysql-preview/mysql.sock`) > 107);
  const first = await createMysqlRuntime(root, { verify: true, githubActions: true });
  const second = await createMysqlRuntime(root, { verify: true, githubActions: true });
  try {
    assert.ok(Buffer.byteLength(first.socket) <= 107);
    assert.equal(first.temporary, true);
    assert.notEqual(first.runtime, second.runtime);
    assert.equal((await stat(first.runtime)).mode & 0o777, 0o700);
    assert.equal(first.port, 33309);
  } finally {
    await rm(first.runtime, { recursive: true, force: true });
    await rm(second.runtime, { recursive: true, force: true });
  }
});

test("Preview keeps its persistent local database; invalid socket paths fail explicitly", async () => {
  const preview = await createMysqlRuntime("/workspace", { verify: true });
  assert.equal(preview.runtime, "/workspace/generated-artifacts/mysql-preview");
  assert.equal(preview.port, 33308);
  assert.equal(preview.temporary, false);
  await assert.rejects(createMysqlRuntime(`/workspace/${"x".repeat(110)}`),
    { code: "MYSQL_LOCAL_SOCKET_PATH_TOO_LONG" });
});
