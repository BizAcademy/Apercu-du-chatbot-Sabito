import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupportTicketMessages, listSupportTickets, updateSupportTicket, type SupportTicket } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, LifeBuoy, MessagesSquare, RefreshCw, RotateCcw, CheckCircle2, X } from "lucide-react";
import { errMsg, useAdmin } from "@/lib/admin";

type Filter = "ouvert" | "ferme" | "all";
const PAGE_SIZE = 50;
const card = "rounded-[22px] border border-[#e8eaff] bg-white p-6 shadow-[0_6px_24px_rgba(48,59,153,.045)]";
const ghost = "inline-flex items-center gap-2 rounded-[12px] border border-[#e3e6f8] px-3 py-2 text-[12px] font-medium text-[#48506a] transition hover:border-[#abb1ff] hover:text-[#3641f5] disabled:opacity-50";
const FILTERS: [Filter, string][] = [["ouvert", "Ouverts"], ["ferme", "Fermés"], ["all", "Tous"]];

export const INTENTS: Record<string, string> = {
  account_activation: "Activation du compte",
  deposit_status: "Statut d'un dépôt",
  referral_code: "Code de parrainage",
};
const REASONS: Record<string, string> = {
  MEMBER_AUTH_REQUIRED: "Connexion membre vérifiée requise",
  BACKEND_UNAVAILABLE: "Service de la plateforme indisponible",
  BACKEND_OFFLINE: "Serveur de la plateforme non connecté",
  BACKEND_TIMEOUT: "Le serveur de la plateforme n'a pas répondu à temps",
  BACKEND_BUSY: "Serveur de la plateforme saturé",
  BACKEND_INTERRUPTED: "Traitement interrompu côté serveur de la plateforme",
  BACKEND_UNVERIFIED_RESULT: "Résultat non vérifiable (refus, introuvable ou erreur)",
};
export const ticketsKey = (projectId: string) => ["sabito-admin", "tickets", projectId] as const;

const fmt = (s: string) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
function Err({ msg, retry }: { msg: string; retry?: () => void }) {
  return <div role="alert" className="mb-3 rounded-xl border border-[#f3d2d2] bg-[#fff6f6] p-3 text-[12px] text-[#9b2c2c]">{msg}{retry && <button className="ml-2 font-semibold underline" onClick={retry}>Réessayer</button>}</div>;
}

export function SupportTickets({ projectId }: { projectId: string }) {
  const { headers } = useAdmin();
  const qc = useQueryClient();
  const [status, setStatus] = useState<Filter>("ouvert");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<SupportTicket | null>(null);
  const q = useQuery({
    queryKey: [...ticketsKey(projectId), status, page],
    queryFn: () => listSupportTickets(projectId, { status, page }, headers()),
    refetchInterval: 30_000, staleTime: 15_000, placeholderData: keepPreviousData,
  });
  const upd = useMutation({
    mutationFn: (v: { id: string; status: "ouvert" | "ferme" }) => updateSupportTicket(projectId, v.id, { status: v.status }, headers()),
    onSuccess: (_r, v) => { setOpen((o) => (o && o.id === v.id ? { ...o, status: v.status } : o)); void qc.invalidateQueries({ queryKey: ticketsKey(projectId) }); },
  });
  const rows = q.data?.data ?? [];
  const total = q.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const toggle = (t: SupportTicket) => upd.mutate({ id: t.id, status: t.status === "ouvert" ? "ferme" : "ouvert" });

  return (
    <section className={card} data-testid="section-tickets">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold"><LifeBuoy size={16} />Tickets d'assistance
          {q.data && <span className="rounded-full bg-[#eef0ff] px-2 py-0.5 text-[11px] font-semibold text-[#3641f5]" data-testid="text-tickets-total">{total}</span>}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[12px] border border-[#e3e6f8] p-0.5">
            {FILTERS.map(([v, l]) => (
              <button key={v} onClick={() => { setStatus(v); setPage(0); }} className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition ${status === v ? "bg-[#eef0ff] text-[#3641f5]" : "text-[#48506a] hover:text-[#3641f5]"}`} data-testid={`button-ticket-filter-${v}`}>{l}</button>
            ))}
          </div>
          <button className="p-1.5 text-[#737b94] hover:text-[#3641f5]" onClick={() => void q.refetch()} aria-label="Actualiser" data-testid="button-refresh-tickets"><RefreshCw size={15} className={q.isFetching ? "animate-spin" : ""} /></button>
        </div>
      </div>
      <p className="-mt-2 mb-3 text-[12px] text-[#6c748d]">Demandes que Sabito n'a pas pu vérifier de façon fiable auprès du serveur de la plateforme. Aucun résultat n'a été inventé : l'équipe doit reprendre la main.</p>
      {q.isLoading && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-[#f1f3ff]" />)}</div>}
      {q.error && <Err msg={errMsg(q.error)} retry={() => void q.refetch()} />}
      {upd.error && <Err msg={errMsg(upd.error)} />}
      {!q.isLoading && !q.error && rows.length === 0 && (
        <p className="rounded-xl bg-[#f6f7ff] p-4 text-[12px] text-[#6c748d]" data-testid="text-tickets-empty">
          {status === "ouvert" ? "Aucun ticket ouvert." : status === "ferme" ? "Aucun ticket fermé." : "Aucun ticket pour cette plateforme."}
        </p>
      )}
      {rows.length > 0 && (
        <div className={`divide-y divide-[#eef0fa] ${q.isPlaceholderData ? "opacity-60" : ""}`}>
          {rows.map((t) => (
            <div key={t.id} className="flex flex-wrap items-start gap-3 py-3" data-testid={`row-ticket-${t.id}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold" data-testid={`text-ticket-intent-${t.id}`}>{INTENTS[t.intent] ?? t.intent}</span>
                  <StatusTag s={t.status} id={t.id} />
                </div>
                <p className="mt-0.5 text-[12px] text-[#6c748d]" data-testid={`text-ticket-reason-${t.id}`}>{REASONS[t.reason] ?? t.reason}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#8b92a8]">
                  <span>Créé : {fmt(t.created_at)}</span>
                  <span>Mis à jour : {fmt(t.updated_at)}</span>
                  <span>{t.external_user_id ? <>Membre : <span className="font-mono text-[#48506a]">{t.external_user_id}</span></> : "Visiteur anonyme"}</span>
                  <span className="font-mono">#{t.id.slice(0, 8)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className={ghost} onClick={() => setOpen(t)} data-testid={`button-ticket-open-${t.id}`}><MessagesSquare size={14} />Conversation</button>
                <button className={ghost} disabled={upd.isPending} onClick={() => toggle(t)} data-testid={`button-ticket-toggle-${t.id}`}>
                  {t.status === "ouvert" ? <><CheckCircle2 size={14} />Fermer</> : <><RotateCcw size={14} />Rouvrir</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between text-[12px] text-[#6c748d]">
          <span>Page {page + 1} / {pages} · {total} tickets</span>
          <div className="flex gap-2">
            <button className={ghost} disabled={page === 0 || q.isFetching} onClick={() => setPage((p) => p - 1)} data-testid="button-tickets-prev"><ChevronLeft size={14} />Précédente</button>
            <button className={ghost} disabled={page + 1 >= pages || q.isFetching} onClick={() => setPage((p) => p + 1)} data-testid="button-tickets-next">Suivante<ChevronRight size={14} /></button>
          </div>
        </div>
      )}
      {open && <TicketDetail projectId={projectId} t={open} pending={upd.isPending} toggle={() => toggle(open)} close={() => setOpen(null)} />}
    </section>
  );
}

function StatusTag({ s, id }: { s: string; id: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.8px] ${s === "ferme" ? "bg-[#f1fbf5] text-[#178954]" : "bg-[#fffaf0] text-[#9a6a10]"}`} data-testid={`status-ticket-${id}`}>{s === "ferme" ? "Fermé" : "Ouvert"}</span>;
}

function TicketDetail({ projectId, t, pending, toggle, close }: { projectId: string; t: SupportTicket; pending: boolean; toggle: () => void; close: () => void }) {
  const { headers } = useAdmin();
  const m = useQuery({
    queryKey: [...ticketsKey(projectId), "messages", t.id],
    queryFn: () => getSupportTicketMessages(projectId, t.id, headers()),
    refetchInterval: 30_000, staleTime: 10_000,
  });
  const msgs = m.data?.data ?? [];
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#11162b]/40 p-4">
      <div className="flex max-h-[88dvh] w-full max-w-[640px] flex-col rounded-[22px] bg-white p-6 shadow-xl" data-testid="modal-ticket">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><h3 className="text-[16px] font-bold">{INTENTS[t.intent] ?? t.intent}</h3><StatusTag s={t.status} id={`detail-${t.id}`} /></div>
            <p className="mt-0.5 text-[12px] text-[#6c748d]">{REASONS[t.reason] ?? t.reason}</p>
            <p className="mt-0.5 text-[11px] text-[#8b92a8]">{t.external_user_id ? <>Membre <span className="font-mono">{t.external_user_id}</span></> : "Visiteur anonyme"} · conversation <span className="font-mono">{t.conversation_id}</span></p>
          </div>
          <button type="button" onClick={close} aria-label="Fermer"><X size={17} /></button>
        </div>
        <div className="min-h-[120px] flex-1 space-y-2 overflow-y-auto rounded-xl bg-[#f6f7ff] p-3">
          {m.isLoading && [0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-white" />)}
          {m.error && <Err msg={errMsg(m.error)} retry={() => void m.refetch()} />}
          {!m.isLoading && !m.error && msgs.length === 0 && <p className="text-[12px] text-[#6c748d]">Aucun message dans cette conversation.</p>}
          {msgs.map((x) => (
            <div key={x.id} className={`flex ${x.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-[14px] px-3 py-2 text-[12.5px] leading-5 ${x.role === "user" ? "bg-[#3641f5] text-white" : "border border-[#e8eaff] bg-white text-[#11162b]"}`} data-testid={`text-ticket-message-${x.id}`}>
                <div className={`mb-0.5 text-[9px] font-semibold uppercase tracking-[.8px] ${x.role === "user" ? "text-white/70" : "text-[#8b92a8]"}`}>{x.role === "user" ? "Utilisateur" : "Sabito"}</div>
                <p className="whitespace-pre-wrap break-words">{x.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className={ghost} onClick={close}>Fermer la fenêtre</button>
          <button className="inline-flex items-center gap-2 rounded-[12px] bg-[#3641f5] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#2934dc] disabled:bg-[#c8cbea]" disabled={pending} onClick={toggle} data-testid="button-ticket-detail-toggle">
            {pending ? "Mise à jour…" : t.status === "ouvert" ? "Marquer comme fermé" : "Rouvrir le ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
