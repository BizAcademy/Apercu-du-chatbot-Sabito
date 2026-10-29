import { strict as assert } from "node:assert";
import { test } from "node:test";
import { platformTitle } from "./platform-title";

test("Chat title uses the platform name without repeating Sabito", () => {
  assert.equal(platformTitle("BCA"), "Sabito BCA");
  assert.equal(platformTitle("Buzz Booster"), "Sabito Buzz Booster");
  assert.equal(platformTitle("SabitoBCA"), "Sabito BCA");
  assert.equal(platformTitle("Sabito BCA"), "Sabito BCA");
  assert.equal(platformTitle("  BCA  "), "Sabito BCA");
  assert.equal(platformTitle("Sabito"), "Sabito");
  assert.equal(platformTitle(), "Sabito");
});
