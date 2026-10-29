import { strict as assert } from "node:assert";
import { test } from "node:test";
import { platformTitle } from "./platform-title";

test("Chat title uses the platform name without repeating Sabito", () => {
  assert.equal(platformTitle("BCA"), "SabitoBCA");
  assert.equal(platformTitle("Buzz Booster"), "SabitoBuzz Booster");
  assert.equal(platformTitle("SabitoBCA"), "SabitoBCA");
  assert.equal(platformTitle("  BCA  "), "SabitoBCA");
  assert.equal(platformTitle(), "Sabito");
});
