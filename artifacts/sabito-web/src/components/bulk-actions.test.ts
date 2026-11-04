import test from "node:test";
import assert from "node:assert/strict";
import { collectAllPages, runBulk } from "./bulk-actions";

test("snapshots all pages in order, not just the visible 50 rows", async () => {
  const controller = new AbortController();
  const ids = Array.from({ length: 121 }, (_, i) => ({ id: `row-${i}` }));
  const pages: number[] = [];
  const all = await collectAllPages(
    { data: ids.slice(0, 50), total: 121 },
    async (page) => { pages.push(page); return { total: 121, data: ids.slice(page * 50, (page + 1) * 50) }; },
    controller.signal,
  );
  assert.deepEqual(pages, [1, 2]);
  assert.deepEqual(all, ids);
});

test("refuses a changing or duplicate snapshot before destructive operations", async () => {
  const signal = new AbortController().signal;
  await assert.rejects(collectAllPages({ data: [{ id: "a" }], total: 2 },
    async () => ({ total: 2, data: [] }), signal, 1), /liste a changé/);
  await assert.rejects(collectAllPages({ data: [{ id: "a" }], total: 2 },
    async () => ({ total: 2, data: [{ id: "a" }] }), signal, 1), /liste a changé/);
});

test("reports partial success and never retries failed deletes or approvals silently", async () => {
  const ids = ["a", "b", "c", "d", "e"];
  const seen: string[] = [], progress: number[] = [];
  const result = await runBulk(ids, async (id) => {
    seen.push(id);
    if (id === "c") throw new Error("422: contenu à vérifier");
  }, new AbortController().signal, (n) => progress.push(n));
  assert.deepEqual(seen, ids);
  assert.equal(result.success, 4);
  assert.deepEqual(result.failures.map(({ item }) => item), ["c"]);
  assert.deepEqual(progress, [1, 2, 3, 4, 5]);
});

test("logout stops queued work, even when an in-flight request finishes", async () => {
  const controller = new AbortController();
  const seen: number[] = [];
  await assert.rejects(runBulk([1, 2, 3, 4, 5], async (item) => {
    seen.push(item);
    if (item === 1) controller.abort();
  }, controller.signal, () => {}), /interrompu/);
  assert.ok(seen.length <= 3, "At most three in-flight requests, no queued work after logout");
});
