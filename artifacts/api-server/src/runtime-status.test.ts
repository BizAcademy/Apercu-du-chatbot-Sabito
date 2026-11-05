import assert from "node:assert/strict";
import test from "node:test";
import { runtimeStatus } from "./runtime-status";

test("Runtime status is stable and contains no server paths, credentials or PID",()=>{
  const status=runtimeStatus();
  assert.equal(runtimeStatus(),status);
  assert.deepEqual(Object.keys(status).sort(),["release","startedAt"]);
  assert.equal(status.release,"development");
  assert.ok(Number.isFinite(Date.parse(status.startedAt)));
  assert.ok(Object.isFrozen(status));
});
