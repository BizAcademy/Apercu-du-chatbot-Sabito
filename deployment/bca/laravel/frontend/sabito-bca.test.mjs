import { test } from "node:test";
import assert from "node:assert/strict";
import { installSabitoBca } from "./sabito-bca.mjs";

test("Adapter only sends the current BCA JWT to the BCA API, without cookies or redirects", async () => {
  const old = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch };
  let script, call, token = "fixture-bca-a";
  globalThis.window = {};
  globalThis.document = {
    querySelector: () => null, createElement: () => ({ dataset: {} }),
    head: { appendChild(value) { script = value; } },
  };
  globalThis.fetch = async (url, init) => {
    call = { url: String(url), ...init };
    return new Response(JSON.stringify({ access_token: "fixture-sabito" }));
  };
  try {
    const ready = installSabitoBca({ apiOrigin: "https://api.bca.example", getAccessToken: () => token });
    assert.equal(script.src, "https://sabito.bizconnectacademy.com/widget/sabito-chat.js");
    assert.ok(!JSON.stringify(script).includes(token));
    window.SabitoWidget = {};
    script.onload();
    await ready;
    const signal = new AbortController().signal;
    await window.SabitoWidgetSession({ signal });
    assert.equal(call.url, "https://api.bca.example/api/v2/sabito/session");
    assert.equal(call.headers.Authorization, "Bearer fixture-bca-a");
    assert.equal(call.credentials, "omit");
    assert.equal(call.redirect, "error");
    token = "fixture-bca-b";
    await window.SabitoWidgetSession({ signal });
    assert.equal(call.headers.Authorization, "Bearer fixture-bca-b");
    token = "";
    call = null;
    assert.equal((await window.SabitoWidgetSession({ signal })).status, 401);
    assert.equal(call, null);
    assert.throws(() => installSabitoBca({ apiOrigin: "http://unsafe.example", getAccessToken: () => token }));
  } finally {
    Object.assign(globalThis, old);
  }
});
