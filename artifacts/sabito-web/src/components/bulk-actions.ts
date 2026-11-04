type Page<T> = { data: T[]; total: number };

/** Snapshot the entire filter without flooding the server with parallel pages. */
export async function collectAllPages<T extends { id: string }>(
  first: Page<T>, loadPage: (page: number) => Promise<Page<T>>, signal: AbortSignal,
  pageSize = 50,
): Promise<T[]> {
  const found = [...first.data];
  const count = Math.ceil(first.total / pageSize);
  for (let start = 1; start < count; start += 4) {
    if (signal.aborted) throw new Error("Chargement interrompu.");
    const pages = await Promise.all(Array.from({ length: Math.min(4, count - start) }, (_, i) => loadPage(start + i)));
    for (const page of pages) found.push(...page.data);
  }
  if (signal.aborted) throw new Error("Chargement interrompu.");
  if (found.length !== first.total || new Set(found.map((item) => item.id)).size !== first.total)
    throw new Error("La liste a changé pendant le chargement. Fermez la fenêtre puis réessayez.");
  return found;
}

export async function runBulk<T>(
  items: readonly T[], action: (item: T, signal: AbortSignal) => Promise<unknown>,
  signal: AbortSignal, progress: (completed: number) => void, concurrency = 3,
): Promise<{ success: number; failures: { item: T; error: unknown }[] }> {
  let next = 0, success = 0, completed = 0;
  const failures: { item: T; error: unknown }[] = [];
  const worker = async () => {
    while (!signal.aborted) {
      const index = next++;
      if (index >= items.length) return;
      const item = items[index];
      try {
        await action(item, signal);
        if (!signal.aborted) success++;
      } catch (error) {
        if (!signal.aborted) failures.push({ item, error });
      }
      if (!signal.aborted) progress(++completed);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  if (signal.aborted) throw new Error("Traitement interrompu. Certaines opérations ont pu aboutir.");
  return { success, failures };
}
