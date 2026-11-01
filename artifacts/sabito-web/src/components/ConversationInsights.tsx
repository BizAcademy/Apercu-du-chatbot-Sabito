import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getConversationInsights, type ConversationInsights as Insights } from "@workspace/api-client-react";
import { BarChart3, RefreshCw } from "lucide-react";
import { errMsg, useAdmin } from "@/lib/admin";

type Days = 7 | 30 | 90;
const card = "rounded-[22px] border border-[#e8eaff] bg-white p-6 shadow-[0_6px_24px_rgba(48,59,153,.045)]";
const PERIODS: Days[] = [7, 30, 90];
const nf = new Intl.NumberFormat("fr-FR");
const pct = (v: number | null) => (v === null ? null : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(v)} %`);

export const insightsKey = (projectId: string) => ["sabito-admin", "insights", projectId] as const;

function Stat({ label, value, hint, id, tone = "default" }: { label: string; value: string; hint?: string; id: string; tone?: "default" | "muted" }) {
  return (
    <div className="rounded-[14px] border border-[#eef0fa] bg-[#f8f9ff] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[.8px] text-[#8b92a8]">{label}</div>
      <div className={`mt-1 text-[20px] font-bold tracking-[-.3px] ${tone === "muted" ? "text-[#8b92a8]" : "text-[#11162b]"}`} data-testid={`text-insight-${id}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-[#8b92a8]">{hint}</div>}
    </div>
  );
}

function Rate({ label, value, detail, id, empty }: { label: string; value: number | null; detail: string; id: string; empty: string }) {
  const p = pct(value);
  return (
    <div className="rounded-[14px] border border-[#eef0fa] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-[#4a5270]">{label}</span>
        <span className={`text-[18px] font-bold ${p ? "text-[#3641f5]" : "text-[#8b92a8]"}`} data-testid={`text-insight-${id}`}>{p ?? "—"}</span>
      </div>
      <p className="mt-1.5 text-[11px] text-[#8b92a8]">{p ? detail : empty}</p>
    </div>
  );
}

export function ConversationInsights({ projectId }: { projectId: string }) {
  const { headers } = useAdmin();
  const [days, setDays] = useState<Days>(30);
  const q = useQuery<Insights>({
    queryKey: [...insightsKey(projectId), days],
    queryFn: () => getConversationInsights(projectId, { days }, headers()),
    refetchInterval: 60_000, staleTime: 30_000, placeholderData: keepPreviousData,
  });
  const d = q.data;
  const s = d?.satisfaction;

  return (
    <section className={card} data-testid="section-insights">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold"><BarChart3 size={16} />Besoins des membres</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[12px] border border-[#e3e6f8] p-0.5" role="group" aria-label="Période">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setDays(p)} aria-pressed={days === p} className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition ${days === p ? "bg-[#eef0ff] text-[#3641f5]" : "text-[#48506a] hover:text-[#3641f5]"}`} data-testid={`button-insights-period-${p}`}>{p} j</button>
            ))}
          </div>
          <button className="p-1.5 text-[#737b94] hover:text-[#3641f5]" onClick={() => void q.refetch()} aria-label="Actualiser" data-testid="button-refresh-insights"><RefreshCw size={15} className={q.isFetching ? "animate-spin" : ""} /></button>
        </div>
      </div>
      <p className="-mt-2 mb-3 text-[12px] text-[#6c748d]">Ce que les membres demandent réellement{d ? ` sur les ${d.period_days} derniers jours` : ""}. La satisfaction ne compte que les avis explicitement donnés : une réponse envoyée n'est pas une réponse réussie.</p>
      {q.isLoading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[74px] animate-pulse rounded-[14px] bg-[#f1f3ff]" />)}</div>
          <div className="h-32 animate-pulse rounded-xl bg-[#f1f3ff]" />
        </div>
      )}
      {q.error && <div role="alert" className="mb-3 rounded-xl border border-[#f3d2d2] bg-[#fff6f6] p-3 text-[12px] text-[#9b2c2c]">{errMsg(q.error)}<button className="ml-2 font-semibold underline" onClick={() => void q.refetch()}>Réessayer</button></div>}
      {d && s && (
        <div className={`space-y-4 ${q.isPlaceholderData ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat id="total" label="Questions posées" value={nf.format(d.total_questions)} hint={`sur ${d.period_days} jours`} />
            <Stat id="asked" label="Avis demandés" value={nf.format(s.asked)} />
            <Stat id="answered" label="Avis reçus" value={nf.format(s.answered)} hint={`${nf.format(s.pending)} sans réponse`} />
            <Stat id="split" label="Satisfaits / non" value={`${nf.format(s.satisfied)} / ${nf.format(s.unsatisfied)}`} />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Rate id="rate" label="Satisfaction mesurée" value={s.rate} detail={`${nf.format(s.satisfied)} satisfaits sur ${nf.format(s.answered)} avis reçus.`} empty="Aucun avis reçu sur la période : satisfaction non mesurée." />
            <Rate id="response-rate" label="Taux de réponse aux avis" value={s.response_rate} detail={`${nf.format(s.answered)} avis reçus sur ${nf.format(s.asked)} demandés.`} empty="Aucun avis demandé sur la période." />
          </div>
          <div>
            <h3 className="mb-2 text-[12px] font-semibold text-[#4a5270]">Questions les plus fréquentes</h3>
            {d.top_questions.length === 0 ? (
              <p className="rounded-xl bg-[#f6f7ff] p-4 text-[12px] text-[#6c748d]" data-testid="text-insights-empty">Aucune question posée sur les {d.period_days} derniers jours.</p>
            ) : (
              <table className="w-full text-left text-[12.5px]">
                <thead><tr className="text-[10px] uppercase tracking-[.8px] text-[#8b92a8]"><th className="w-8 pb-1.5 font-semibold">#</th><th className="pb-1.5 font-semibold">Question</th><th className="w-20 pb-1.5 text-right font-semibold">Fois</th></tr></thead>
                <tbody className="divide-y divide-[#eef0fa]">
                  {d.top_questions.map((t, i) => (
                    <tr key={`${i}-${t.question}`} data-testid={`row-insight-question-${i}`}>
                      <td className="py-2 align-top font-mono text-[11px] text-[#8b92a8]">{i + 1}</td>
                      <td className="py-2 pr-3">
                        <p className="break-words font-medium">{t.question}</p>
                      </td>
                      <td className="py-2 text-right align-top font-semibold text-[#3641f5]">{nf.format(t.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
