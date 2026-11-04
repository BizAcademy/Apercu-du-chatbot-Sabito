import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  decideKnowledgeReview, decideVariantCandidate, listKnowledgeReviews, listVariantCandidates, updateKnowledgeReview,
  type KnowledgeReview, type KnowledgeReviewInput, type VariantCandidate,
} from "@workspace/api-client-react";
import { Check, ChevronDown, ClipboardCheck, RefreshCw, Save, ShieldCheck, X } from "lucide-react";
import { errMsg, useAdmin } from "@/lib/admin";
import { BulkConfirm } from "./BulkConfirm";

const card = "rounded-[22px] border border-[#e8eaff] bg-white p-6 shadow-[0_6px_24px_rgba(48,59,153,.045)]";
const input = "w-full rounded-[12px] border border-[#dfe2ef] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#9da5ff] disabled:bg-[#f7f8fc]";
const btn = "inline-flex items-center gap-2 rounded-[12px] bg-[#3641f5] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#2934dc] disabled:bg-[#c8cbea]";
const ghost = "inline-flex items-center gap-2 rounded-[12px] border border-[#e3e6f8] px-3 py-2 text-[12px] font-medium text-[#48506a] transition hover:border-[#abb1ff] hover:text-[#3641f5] disabled:opacity-50";
const danger = "inline-flex items-center gap-2 rounded-[12px] border border-[#f0d3c8] px-3 py-2 text-[12px] font-medium text-[#9a3817] transition hover:bg-[#fff6f6] disabled:opacity-50";
const lbl = "text-[12px] font-semibold text-[#4a5270]";
const hint = "mt-1 text-[11px] leading-4 text-[#8b92a8]";

export const knowledgeReviewKey = (p: string) => ["sabito-admin", "knowledge-review", p] as const;
export const variantCandidatesKey = (p: string) => ["sabito-admin", "variant-candidates", p] as const;

type Tab = "refs" | "variants";
type RefFilter = "pending" | "ready" | "rejected" | "all";
type VarFilter = "pending" | "approved" | "rejected" | "all";

const REF_STATUS: Record<KnowledgeReview["status"], [string, string]> = {
  pending: ["À vérifier", "bg-[#fffaf0] text-[#9a6a10]"],
  ready: ["Validée · publique", "bg-[#f1fbf5] text-[#178954]"],
  rejected: ["Refusée", "bg-[#fff6f6] text-[#9b2c2c]"],
};
const VAR_STATUS: Record<VariantCandidate["status"], [string, string]> = {
  pending: ["À valider", "bg-[#fffaf0] text-[#9a6a10]"],
  approved: ["Validée", "bg-[#f1fbf5] text-[#178954]"],
  rejected: ["Refusée", "bg-[#fff6f6] text-[#9b2c2c]"],
};
const REASON: Record<VariantCandidate["reason"], string> = { selection: "Choisie dans les suggestions", positive_feedback: "Réponse jugée utile" };

function Err({ msg, retry }: { msg: string; retry?: () => void }) {
  return <div role="alert" className="mt-3 rounded-xl border border-[#f3d2d2] bg-[#fff6f6] p-3 text-[12px] text-[#9b2c2c]">{msg}{retry && <button type="button" className="ml-2 font-semibold underline" onClick={retry}>Réessayer</button>}</div>;
}
function Badge({ s }: { s: [string, string] }) {
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.8px] ${s[1]}`}>{s[0]}</span>;
}
function Skeleton() {
  return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-[#f1f3ff]" />)}</div>;
}

function useInvalidate(projectId: string) {
  const qc = useQueryClient();
  return () => {
    for (const k of [knowledgeReviewKey(projectId), variantCandidatesKey(projectId), ["sabito-admin", "knowledge", projectId], ["sabito-admin", "assistant-settings", projectId]])
      void qc.invalidateQueries({ queryKey: k });
  };
}

export function KnowledgeReviewPanel({ projectId }: { projectId: string }) {
  const { headers } = useAdmin();
  const [tab, setTab] = useState<Tab>("refs");
  const refs = useQuery({ queryKey: knowledgeReviewKey(projectId), queryFn: () => listKnowledgeReviews(projectId, headers()), staleTime: 15_000, refetchInterval: 30_000 });
  const vars = useQuery({ queryKey: variantCandidatesKey(projectId), queryFn: () => listVariantCandidates(projectId, headers()), staleTime: 15_000, refetchInterval: 30_000 });
  const pendingRefs = refs.data?.data.filter((r) => r.status === "pending").length ?? 0;
  const pendingVars = vars.data?.data.filter((v) => v.status === "pending").length ?? 0;
  const active = tab === "refs" ? refs : vars;

  return (
    <section className={card} data-testid="section-knowledge-review">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-bold"><ClipboardCheck size={16} />Références à valider</h2>
          <p className="mt-0.5 max-w-[640px] text-[12px] text-[#6c748d]">Rien n'est montré au public avant votre validation explicite. Vérifiez la source, la réponse et les formulations, puis validez ou refusez.</p>
        </div>
        <div className="flex items-center gap-2">
          {active.dataUpdatedAt > 0 && <span className="text-[11px] text-[#8b92a8]" data-testid="text-review-updated">Mis à jour à {new Date(active.dataUpdatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
          <button type="button" className="p-1.5 text-[#737b94] hover:text-[#3641f5]" onClick={() => { void refs.refetch(); void vars.refetch(); }} aria-label="Actualiser" data-testid="button-refresh-review"><RefreshCw size={15} className={refs.isFetching || vars.isFetching ? "animate-spin" : ""} /></button>
        </div>
      </div>
      <div className="mb-4 flex gap-1 rounded-[14px] bg-[#f4f5ff] p-1">
        {([["refs", "Références", pendingRefs], ["variants", "Variantes proposées", pendingVars]] as const).map(([k, l, n]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`flex flex-1 items-center justify-center gap-2 rounded-[11px] px-3 py-2 text-[12px] font-semibold transition ${tab === k ? "bg-white text-[#3641f5] shadow-sm" : "text-[#6c748d] hover:text-[#3641f5]"}`} data-testid={`tab-review-${k}`}>
            {l}{n > 0 && <span className="rounded-full bg-[#3641f5] px-1.5 text-[10px] text-white">{n}</span>}
          </button>
        ))}
      </div>
      {tab === "refs" ? <RefsTab projectId={projectId} q={refs} /> : <VariantsTab projectId={projectId} q={vars} />}
    </section>
  );
}

type Q<T> = { data?: { data: T[] }; isLoading: boolean; error: unknown; refetch: () => unknown };

function RefsTab({ projectId, q }: { projectId: string; q: Q<KnowledgeReview> }) {
  const {headers}=useAdmin();
  const invalidate=useInvalidate(projectId);
  const [filter, setFilter] = useState<RefFilter>("pending");
  const [open, setOpen] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);
  const all = q.data?.data ?? [];
  const rows = filter === "all" ? all : all.filter((r) => r.status === filter);
  const count = (f: RefFilter) => f === "all" ? all.length : all.filter((r) => r.status === f).length;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Filters value={filter} set={(v) => setFilter(v)} items={[["pending", "À vérifier"], ["ready", "Validées"], ["rejected", "Refusées"], ["all", "Toutes"]] as [RefFilter, string][]} count={count} />
        <button type="button" disabled={count("pending")===0 || q.isLoading || !!q.error || bulk}
          onClick={()=>setBulk(true)} data-testid="button-approve-references-bulk"
          className="inline-flex items-center gap-2 rounded-xl bg-[#3641f5] px-3 py-2 text-[12px] font-semibold text-white disabled:bg-[#c8cbea]">
          <Check size={14}/>Valider les références en attente en masse
        </button>
      </div>
      {q.isLoading && <Skeleton />}
      {q.error ? <Err msg={errMsg(q.error)} retry={() => void q.refetch()} /> : null}
      {!q.isLoading && !q.error && rows.length === 0 && <p className="rounded-xl bg-[#f6f7ff] p-4 text-[12px] text-[#6c748d]" data-testid="text-refs-empty">{filter === "pending" ? "Aucune référence en attente. Tout a été vérifié." : "Aucune référence dans cette catégorie."}</p>}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-[#eef0fa]" data-testid={`row-ref-${r.id}`}>
            <button type="button" className="flex w-full items-start gap-3 p-3 text-left" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id} data-testid={`button-open-ref-${r.id}`}>
              <div className="min-w-0 flex-1">
                <p className="break-words text-[13px] font-semibold">{r.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#8b92a8]">
                  <span data-testid={`status-ref-${r.id}`}><Badge s={REF_STATUS[r.status]} /></span>
                  <span>{r.category}</span><span>{r.variants.length} variantes</span><span>{r.keywords.length} mots-clés</span>
                </div>
              </div>
              <ChevronDown size={16} className={`mt-1 text-[#8b92a8] transition-transform ${open === r.id ? "rotate-180" : ""}`} />
            </button>
            {open === r.id && <RefForm key={r.id} projectId={projectId} doc={r} close={() => setOpen(null)} />}
          </div>
        ))}
      </div>
      {bulk && <BulkConfirm key={projectId} title="Publier toutes les références en attente ?" word="VALIDER"
        concurrency={1}
        warning="Ces réponses et leurs variantes deviendront publiques pour cette plateforme. Vérifiez leurs sources, l’absence de données personnelles et leur exactitude avant de confirmer. La validation est individuelle côté serveur : les éléments invalides resteront en attente et seront signalés. Les références déjà validées ou refusées ne sont pas incluses."
        load={async(signal)=>{
          const result=await listKnowledgeReviews(projectId,{...headers(),signal});
          return result.data.filter(r=>r.status==="pending").map(r=>({id:r.id,label:r.title}));
        }}
        action={(item,signal)=>decideKnowledgeReview(projectId,item.id,{decision:"approve"},{...headers(),signal})}
        onChange={invalidate}
        close={()=>setBulk(false)} />}
    </div>
  );
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const list = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function validate(f: KnowledgeReviewInput): string[] {
  const e: string[] = [];
  if (f.title.trim().length < 2 || f.title.length > 500) e.push("Question : 2 à 500 caractères.");
  if (f.content.trim().length < 20 || f.content.length > 20000) e.push("Réponse : 20 à 20 000 caractères.");
  if (f.category.trim().length < 2 || f.category.length > 100) e.push("Catégorie : 2 à 100 caractères.");
  if (f.source.trim().length < 10 || f.source.length > 4000) e.push("Source vérifiable : 10 à 4 000 caractères (lien, document, page).");
  if (f.keywords.length < 1 || f.keywords.length > 30) e.push("Mots-clés : 1 à 30.");
  const distinct = new Set(f.variants.map(norm));
  if (f.variants.length < 5 || f.variants.length > 10) e.push(`Variantes : 5 à 10 formulations (actuellement ${f.variants.length}).`);
  if (distinct.size !== f.variants.length) e.push("Variantes : chaque formulation doit être distincte.");
  return e;
}

function RefForm({ projectId, doc, close }: { projectId: string; doc: KnowledgeReview; close: () => void }) {
  const { headers, onLogout } = useAdmin();
  const invalidate = useInvalidate(projectId);
  const init = { title: doc.title, content: doc.content, category: doc.category, source: doc.source, keywords: doc.keywords.join(", "), variants: doc.variants.join("\n") };
  const [f, setF] = useState(init);
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);
  useEffect(() => onLogout(() => { setConfirm(null); }), [onLogout]);
  const body: KnowledgeReviewInput = { title: f.title.trim(), content: f.content.trim(), category: f.category.trim(), source: f.source.trim(), keywords: list(f.keywords), variants: lines(f.variants) };
  const errors = validate(body);
  const dirty = JSON.stringify(f) !== JSON.stringify(init);
  const save = useMutation({ mutationFn: () => updateKnowledgeReview(projectId, doc.id, body, headers()), onSuccess: invalidate });
  const decide = useMutation({
    mutationFn: async (d: "approve" | "reject") => {
      if (d === "approve" && dirty) await updateKnowledgeReview(projectId, doc.id, body, headers());
      await decideKnowledgeReview(projectId, doc.id, { decision: d }, headers());
    },
    onSuccess: () => { setConfirm(null); invalidate(); close(); },
  });
  const busy = save.isPending || decide.isPending;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="border-t border-[#eef0fa] bg-[#fbfbff] p-4" data-testid={`form-ref-${doc.id}`}>
      {doc.status !== "ready" && <p className="mb-3 flex items-center gap-2 rounded-lg bg-[#eef0ff] p-2 text-[11px] text-[#2b3170]"><ShieldCheck size={13} />Cette référence n'est pas publique. Elle ne sera utilisée par Sabito qu'après « Valider et publier ».</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2"><label className={lbl}>Question</label><input className={`${input} mt-1`} value={f.title} onChange={set("title")} disabled={busy} data-testid={`input-ref-title-${doc.id}`} /></div>
        <div className="md:col-span-2"><label className={lbl}>Réponse</label><textarea className={`${input} mt-1 min-h-[140px]`} value={f.content} onChange={set("content")} disabled={busy} data-testid={`input-ref-content-${doc.id}`} /><p className={hint}>{f.content.trim().length} / 20 000 caractères. Aucune donnée personnelle ni statut de transaction individuel.</p></div>
        <div><label className={lbl}>Catégorie</label><input className={`${input} mt-1`} value={f.category} onChange={set("category")} disabled={busy} data-testid={`input-ref-category-${doc.id}`} /></div>
        <div><label className={lbl}>Mots-clés <span className="font-normal text-[#8b92a8]">(séparés par des virgules, {body.keywords.length}/30)</span></label><input className={`${input} mt-1`} value={f.keywords} onChange={set("keywords")} disabled={busy} data-testid={`input-ref-keywords-${doc.id}`} /></div>
        <div className="md:col-span-2"><label className={lbl}>Source vérifiable</label><textarea className={`${input} mt-1 min-h-[60px]`} value={f.source} onChange={set("source")} disabled={busy} data-testid={`input-ref-source-${doc.id}`} /><p className={hint}>Lien, document interne ou page officielle permettant à un autre administrateur de vérifier la réponse.</p></div>
        <div className="md:col-span-2"><label className={lbl}>Variantes de la question <span className="font-normal text-[#8b92a8]">(une par ligne, 5 à 10 distinctes, {body.variants.length}/10)</span></label><textarea className={`${input} mt-1 min-h-[150px]`} value={f.variants} onChange={set("variants")} disabled={busy} data-testid={`input-ref-variants-${doc.id}`} /></div>
      </div>
      {errors.length > 0 && <ul className="mt-3 list-disc rounded-xl bg-[#fff6f6] py-2 pl-7 pr-3 text-[11px] text-[#9b2c2c]" data-testid={`errors-ref-${doc.id}`}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      {save.error ? <Err msg={errMsg(save.error)} /> : null}
      {decide.error ? <Err msg={errMsg(decide.error)} /> : null}
      {save.isSuccess && !dirty && <p className="mt-2 text-[11px] text-[#178954]">Enregistré. La référence reste non publique tant qu'elle n'est pas validée.</p>}
      {confirm && (
        <div role="alertdialog" className={`mt-3 rounded-xl p-3 text-[12px] ${confirm === "approve" ? "bg-[#f1fbf5] text-[#145c3a]" : "bg-[#fff6f6] text-[#7a2a12]"}`} data-testid={`confirm-ref-${doc.id}`}>
          {confirm === "approve" ? "Valider rend cette réponse publique : Sabito pourra la donner à tout visiteur. Les modifications non enregistrées seront d'abord sauvegardées." : "Refuser retire cette référence des réponses possibles. Elle restera consultable dans « Refusées »."}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className={ghost} onClick={() => setConfirm(null)} disabled={busy} data-testid={`button-cancel-decision-${doc.id}`}>Annuler</button>
            <button type="button" className={confirm === "approve" ? btn : "inline-flex items-center gap-2 rounded-[12px] bg-[#b4441f] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"} disabled={busy} onClick={() => decide.mutate(confirm)} data-testid={`button-confirm-decision-${doc.id}`}>{decide.isPending ? "Envoi…" : confirm === "approve" ? "Confirmer la publication" : "Confirmer le refus"}</button>
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-[11px] text-[#8b92a8]">{dirty ? "Modifications non enregistrées" : "À jour"}</span>
        <button type="button" className={ghost} disabled={!dirty || busy} onClick={() => { setF(init); save.reset(); }} data-testid={`button-reset-ref-${doc.id}`}>Annuler les modifications</button>
        <button type="button" className={ghost} disabled={!dirty || errors.length > 0 || busy} onClick={() => save.mutate()} data-testid={`button-save-ref-${doc.id}`}><Save size={13} />{save.isPending ? "Enregistrement…" : "Enregistrer"}</button>
        {doc.status !== "rejected" && <button type="button" className={danger} disabled={busy} onClick={() => { decide.reset(); setConfirm("reject"); }} data-testid={`button-reject-ref-${doc.id}`}><X size={13} />Refuser</button>}
        {doc.status !== "ready" && <button type="button" className={btn} disabled={errors.length > 0 || busy} onClick={() => { decide.reset(); setConfirm("approve"); }} data-testid={`button-approve-ref-${doc.id}`}><Check size={14} />Valider et publier</button>}
      </div>
    </div>
  );
}

function VariantsTab({ projectId, q }: { projectId: string; q: Q<VariantCandidate> }) {
  const { headers } = useAdmin();
  const invalidate = useInvalidate(projectId);
  const [filter, setFilter] = useState<VarFilter>("pending");
  const all = q.data?.data ?? [];
  const rows = (filter === "all" ? all : all.filter((r) => r.status === filter)).slice().sort((a, b) => b.occurrences - a.occurrences);
  const count = (f: VarFilter) => f === "all" ? all.length : all.filter((r) => r.status === f).length;
  const m = useMutation({
    mutationFn: ({ id, d }: { id: string; d: "approve" | "reject" }) => decideVariantCandidate(projectId, id, { decision: d }, headers()),
    onSettled: invalidate,
  });
  return (
    <div>
      <p className="mb-3 text-[12px] text-[#6c748d]">Formulations réelles et anonymisées de visiteurs ayant mené à une référence. Valider ajoute la formulation aux variantes de la référence cible. Les doublons sont fusionnés par le serveur.</p>
      <Filters value={filter} set={(v) => setFilter(v)} items={[["pending", "À valider"], ["approved", "Validées"], ["rejected", "Refusées"], ["all", "Toutes"]] as [VarFilter, string][]} count={count} />
      {q.isLoading && <Skeleton />}
      {q.error ? <Err msg={errMsg(q.error)} retry={() => void q.refetch()} /> : null}
      {m.error ? <Err msg={errMsg(m.error)} /> : null}
      {!q.isLoading && !q.error && rows.length === 0 && <p className="rounded-xl bg-[#f6f7ff] p-4 text-[12px] text-[#6c748d]" data-testid="text-variants-empty">{filter === "pending" ? "Aucune variante en attente." : "Aucune variante dans cette catégorie."}</p>}
      <div className="divide-y divide-[#eef0fa]">
        {rows.map((v) => {
          const busy = m.isPending && m.variables?.id === v.id;
          return (
            <div key={v.id} className="flex flex-wrap items-start gap-3 py-3" data-testid={`row-variant-${v.id}`}>
              <div className="grid min-w-[44px] place-items-center rounded-[10px] bg-[#f6f7ff] px-2 py-1.5 text-center" title="Occurrences">
                <span className="text-[15px] font-bold text-[#3641f5]" data-testid={`text-occurrences-${v.id}`}>{v.occurrences}</span>
                <span className="text-[9px] uppercase tracking-[.6px] text-[#8b92a8]">fois</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-[13px] font-semibold" data-testid={`text-formulation-${v.id}`}>« {v.formulation} »</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8b92a8]">
                  <span>Référence cible : <span className="text-[#48506a]" data-testid={`text-target-${v.id}`}>{v.title}</span></span>
                  <span>{REASON[v.reason] ?? v.reason}</span>
                  <span data-testid={`status-variant-${v.id}`}><Badge s={VAR_STATUS[v.status]} /></span>
                </div>
              </div>
              <div className="flex gap-2">
                {v.status === "pending" && <button type="button" className={danger} disabled={m.isPending} onClick={() => m.mutate({ id: v.id, d: "reject" })} data-testid={`button-reject-variant-${v.id}`}><X size={13} />Refuser</button>}
                {v.status === "pending" && <button type="button" className={ghost} disabled={m.isPending} onClick={() => m.mutate({ id: v.id, d: "approve" })} data-testid={`button-approve-variant-${v.id}`}><Check size={13} />{busy ? "Envoi…" : "Valider"}</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Filters<T extends string>({ value, set, items, count }: { value: T; set: (v: T) => void; items: readonly (readonly [T, string])[]; count: (v: T) => number }) {
  return (
    <div className="mb-3 inline-flex flex-wrap rounded-[12px] border border-[#e3e6f8] p-0.5">
      {items.map(([v, l]) => (
        <button key={v} type="button" onClick={() => set(v)} className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition ${value === v ? "bg-[#eef0ff] text-[#3641f5]" : "text-[#48506a] hover:text-[#3641f5]"}`} data-testid={`button-filter-review-${v}`}>{l} <span className="text-[#8b92a8]">{count(v)}</span></button>
      ))}
    </div>
  );
}
