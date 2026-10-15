import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { answerUnansweredQuestion, listUnansweredQuestions, type UnansweredQuestion } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, CircleHelp, MessageSquarePlus, RefreshCw, X } from "lucide-react";
import { errMsg, useAdmin } from "@/lib/admin";

type Filter = "a_traiter" | "traite" | "all";
const PAGE_SIZE = 50;
const card = "rounded-[22px] border border-[#e8eaff] bg-white p-6 shadow-[0_6px_24px_rgba(48,59,153,.045)]";
const input = "w-full rounded-[12px] border border-[#dfe2ef] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#9da5ff]";
const btn = "inline-flex items-center gap-2 rounded-[12px] bg-[#3641f5] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#2934dc] disabled:bg-[#c8cbea]";
const ghost = "inline-flex items-center gap-2 rounded-[12px] border border-[#e3e6f8] px-3 py-2 text-[12px] font-medium text-[#48506a] transition hover:border-[#abb1ff] hover:text-[#3641f5] disabled:opacity-50";
const FILTERS: [Filter, string][] = [["a_traiter", "À traiter"], ["traite", "Traitées"], ["all", "Toutes"]];

export const unansweredKey = (projectId: string) => ["sabito-admin", "unanswered", projectId] as const;

const fmt = (s: string) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

function Err({ msg, retry }: { msg: string; retry?: () => void }) {
  return <div role="alert" className="mb-3 rounded-xl border border-[#f3d2d2] bg-[#fff6f6] p-3 text-[12px] text-[#9b2c2c]">{msg}{retry && <button className="ml-2 font-semibold underline" onClick={retry}>Réessayer</button>}</div>;
}

export function UnansweredQuestions({ projectId }: { projectId: string }) {
  const { headers } = useAdmin();
  const [status, setStatus] = useState<Filter>("a_traiter");
  const [page, setPage] = useState(0);
  const [answering, setAnswering] = useState<UnansweredQuestion | null>(null);
  const q = useQuery({
    queryKey: [...unansweredKey(projectId), status, page],
    queryFn: () => listUnansweredQuestions(projectId, { status, page }, headers()),
    refetchInterval: 30_000, staleTime: 15_000, placeholderData: keepPreviousData,
  });
  const rows = q.data?.data ?? [];
  const total = q.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className={card} data-testid="section-unanswered">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold"><CircleHelp size={16} />Questions sans réponse
          {q.data && <span className="rounded-full bg-[#eef0ff] px-2 py-0.5 text-[11px] font-semibold text-[#3641f5]" data-testid="text-unanswered-total">{total}</span>}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[12px] border border-[#e3e6f8] p-0.5">
            {FILTERS.map(([v, l]) => (
              <button key={v} onClick={() => { setStatus(v); setPage(0); }} className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition ${status === v ? "bg-[#eef0ff] text-[#3641f5]" : "text-[#48506a] hover:text-[#3641f5]"}`} data-testid={`button-filter-${v}`}>{l}</button>
            ))}
          </div>
          <button className="p-1.5 text-[#737b94] hover:text-[#3641f5]" onClick={() => void q.refetch()} aria-label="Actualiser" data-testid="button-refresh-unanswered"><RefreshCw size={15} className={q.isFetching ? "animate-spin" : ""} /></button>
        </div>
      </div>
      <p className="-mt-2 mb-3 text-[12px] text-[#6c748d]">Questions auxquelles Sabito n'a pas su répondre, triées par fréquence. Une réponse ajoutée devient une référence publique validée : ne publie aucune donnée personnelle ni aucun statut de transaction individuel. Utilise les tickets pour ces demandes.</p>
      {q.isLoading && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-[#f1f3ff]" />)}</div>}
      {q.error && <Err msg={errMsg(q.error)} retry={() => void q.refetch()} />}
      {!q.isLoading && !q.error && rows.length === 0 && (
        <p className="rounded-xl bg-[#f6f7ff] p-4 text-[12px] text-[#6c748d]" data-testid="text-unanswered-empty">
          {status === "a_traiter" ? "Aucune question en attente. Sabito a trouvé une réponse à tout." : status === "traite" ? "Aucune question traitée pour l'instant." : "Aucune question enregistrée pour cette plateforme."}
        </p>
      )}
      {rows.length > 0 && (
        <div className={`divide-y divide-[#eef0fa] ${q.isPlaceholderData ? "opacity-60" : ""}`}>
          {rows.map((r) => (
            <div key={r.id} className="flex items-start gap-3 py-3" data-testid={`row-unanswered-${r.id}`}>
              <div className="grid min-w-[44px] place-items-center rounded-[10px] bg-[#f6f7ff] px-2 py-1.5 text-center" title="Nombre de fois posée">
                <span className="text-[15px] font-bold text-[#3641f5]" data-testid={`text-count-${r.id}`}>{r.nombre_de_fois_posee}</span>
                <span className="text-[9px] uppercase tracking-[.6px] text-[#8b92a8]">fois</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words text-[13px] font-semibold" data-testid={`text-question-${r.id}`}>{r.question}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8b92a8]">
                  <span>Dernière : {fmt(r.derniere_date)}</span>
                  <span>Première : {fmt(r.date_creation)}</span>
                  <span>{r.utilisateur_id ? <>Membre : <span className="font-mono text-[#48506a]">{r.utilisateur_id}</span></> : "Visiteur anonyme"}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.8px] ${r.statut === "traite" ? "bg-[#f1fbf5] text-[#178954]" : "bg-[#fffaf0] text-[#9a6a10]"}`} data-testid={`status-unanswered-${r.id}`}>{r.statut === "traite" ? "Traitée" : "À traiter"}</span>
                </div>
              </div>
              {r.statut === "a_traiter" && <button className={ghost} onClick={() => setAnswering(r)} data-testid={`button-answer-${r.id}`}><MessageSquarePlus size={14} />Ajouter une réponse</button>}
            </div>
          ))}
        </div>
      )}
      {total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between text-[12px] text-[#6c748d]">
          <span data-testid="text-unanswered-page">Page {page + 1} / {pages} · {total} questions</span>
          <div className="flex gap-2">
            <button className={ghost} disabled={page === 0 || q.isFetching} onClick={() => setPage((p) => p - 1)} data-testid="button-prev-page"><ChevronLeft size={14} />Précédente</button>
            <button className={ghost} disabled={page + 1 >= pages || q.isFetching} onClick={() => setPage((p) => p + 1)} data-testid="button-next-page">Suivante<ChevronRight size={14} /></button>
          </div>
        </div>
      )}
      {answering && <AnswerDialog projectId={projectId} question={answering} close={() => setAnswering(null)} />}
    </section>
  );
}

function AnswerDialog({ projectId, question, close }: { projectId: string; question: UnansweredQuestion; close: () => void }) {
  const { headers } = useAdmin();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const m = useMutation({
    mutationFn: () => answerUnansweredQuestion(projectId, question.id, { content }, headers()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: unansweredKey(projectId) });
      void qc.invalidateQueries({ queryKey: ["sabito-admin", "knowledge", projectId] });
      close();
    },
  });
  const len = content.trim().length;
  const valid = len >= 20 && content.length <= 20000;
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#11162b]/40 p-4">
      <form onSubmit={(e) => { e.preventDefault(); if (valid && !m.isPending) m.mutate(); }} className="w-full max-w-[600px] rounded-[22px] bg-white p-6 shadow-xl" data-testid="modal-answer">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-[16px] font-bold">Ajouter une réponse</h3><button type="button" onClick={close} disabled={m.isPending} aria-label="Fermer"><X size={17} /></button></div>
        <div className="rounded-xl bg-[#f6f7ff] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[.8px] text-[#8b92a8]">Question · posée {question.nombre_de_fois_posee} fois</div>
          <p className="mt-1 max-h-[140px] overflow-y-auto whitespace-pre-wrap break-words text-[13px] font-semibold" data-testid="text-answer-question">{question.question}</p>
        </div>
        <textarea className={`${input} mt-3 min-h-[200px]`} placeholder="Réponse validée (20 à 20 000 caractères)" value={content} onChange={(e) => setContent(e.target.value)} disabled={m.isPending} autoFocus data-testid="input-answer-content" />
        <p className={`mt-1 text-[11px] ${content.length > 20000 ? "text-[#b4441f]" : "text-[#8b92a8]"}`}>{len} / 20 000 caractères{len > 0 && len < 20 ? " · 20 minimum" : ""} · La réponse sera ajoutée aux références validées et la question marquée traitée.</p>
        {m.error && <Err msg={errMsg(m.error)} />}
        <div className="mt-3 flex justify-end gap-2"><button type="button" className={ghost} onClick={close} disabled={m.isPending}>Annuler</button><button disabled={!valid || m.isPending} className={btn} data-testid="button-save-answer">{m.isPending ? "Enregistrement…" : "Enregistrer la réponse"}</button></div>
      </form>
    </div>
  );
}
