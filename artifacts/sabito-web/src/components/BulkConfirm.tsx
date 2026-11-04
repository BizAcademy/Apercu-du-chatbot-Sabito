import { useEffect, useRef, useState } from "react";
import { errMsg, useAdmin } from "@/lib/admin";
import { runBulk } from "./bulk-actions";

export type BulkItem = { id: string; label: string };
type Props = {
  title: string;
  warning: string;
  word: "SUPPRIMER" | "VALIDER";
  load: (signal: AbortSignal) => Promise<BulkItem[]>;
  action: (item: BulkItem, signal: AbortSignal) => Promise<unknown>;
  concurrency?: number;
  onChange: () => void;
  close: () => void;
};

/** A fixed, project-scoped snapshot. In-flight requests may succeed after a
 * network interruption; report failures rather than silently claiming success. */
export function BulkConfirm({ title, warning, word, load, action, concurrency, onChange, close }: Props) {
  const { onLogout } = useAdmin();
  const controller = useRef(new AbortController());
  const [items, setItems] = useState<BulkItem[] | null>(null);
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [success, setSuccess] = useState(0);
  const [failures, setFailures] = useState<{ item: BulkItem; message: string }[]>([]);
  // The modal is keyed by project and filter. Capture only its opening snapshot.
  useEffect(() => {
    const signal = controller.current.signal;
    void load(signal).then((found) => {
      if (!signal.aborted) setItems(found);
    }).catch((e: unknown) => { if (!signal.aborted) setError(errMsg(e)); });
    return () => controller.current.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => onLogout(() => { controller.current.abort(); close(); }), [onLogout, close]);

  async function run() {
    if (!items?.length || typed !== word || busy || done) return;
    setBusy(true);
    const signal = controller.current.signal;
    try {
      const result = await runBulk(items, action, signal, setCompleted, concurrency);
      if (signal.aborted) return;
      setSuccess(result.success);
      setFailures(result.failures.map(({ item, error }) => ({ item, message: errMsg(error) })));
      setDone(true);
      setBusy(false);
      onChange();
    } catch(e) {
      if (signal.aborted) return;
      setError(errMsg(e));
      setBusy(false);
      setDone(true);
      onChange();
    }
  }

  return <div className="fixed inset-0 z-40 grid place-items-center bg-[#11162b]/55 p-4" role="presentation">
    <div role="dialog" aria-modal="true" aria-labelledby="bulk-title" className="w-full max-w-[540px] rounded-[22px] bg-white p-6 shadow-xl">
      <h3 id="bulk-title" className="text-[17px] font-bold">{title}</h3>
      {error && <p role="alert" className="mt-3 text-[13px] text-[#9b2c2c]">{error}</p>}
      {!items && !error && <p className="mt-3 text-[13px] text-[#6c748d]">Chargement de la liste complète…</p>}
      {items && <div className="mt-3 space-y-3 text-[13px] text-[#48506a]">
        <p><strong>{items.length}</strong> élément{items.length > 1 ? "s" : ""} de cette plateforme et du filtre sélectionné.</p>
        <p className="rounded-xl bg-[#fff6f4] p-3 text-[#8e391f]">{warning}</p>
        {!busy && !done && items.length > 0 && <>
          <label htmlFor="bulk-confirm-word" className="block font-semibold">Tapez {word} pour confirmer l’action sur ces {items.length} éléments.</label>
          <input id="bulk-confirm-word" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)}
            className="w-full rounded-xl border border-[#dfe2ef] px-3 py-2 outline-none focus:border-[#4f46e5]" />
        </>}
        {busy && <p role="status" aria-live="polite">Traitement : {completed} / {items.length}. Ne fermez pas cette page.</p>}
        {done && <div role="status" aria-live="polite">
          <p>{success} réussite{success > 1 ? "s" : ""}, {failures.length} échec{failures.length > 1 ? "s" : ""}.</p>
          {failures.length > 0 && <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-[#9b2c2c]">
            {failures.map(({ item, message }) => <li key={item.id} className="break-words">{item.label.slice(0, 90)} : {message}</li>)}
          </ul>}
        </div>}
      </div>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" disabled={busy} onClick={close} className="rounded-xl border border-[#e3e6f8] px-4 py-2 text-[13px] disabled:opacity-40">{done ? "Fermer" : "Annuler"}</button>
        {!done && <button type="button" disabled={!items?.length || typed !== word || busy} onClick={() => void run()}
          className={`rounded-xl px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40 ${word === "SUPPRIMER" ? "bg-[#b4441f]" : "bg-[#3641f5]"}`}>
          {busy ? "Traitement…" : `${word === "SUPPRIMER" ? "Supprimer" : "Valider"} ${items?.length ?? 0}`}
        </button>}
      </div>
    </div>
  </div>;
}
