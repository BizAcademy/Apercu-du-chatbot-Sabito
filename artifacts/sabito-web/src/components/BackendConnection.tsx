import { useQuery } from "@tanstack/react-query";
import { getAssistantConfiguration, getBackendConnectionStatus } from "@workspace/api-client-react";
import { Download, PlugZap, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { errMsg, useAdmin } from "@/lib/admin";
import { backendInstallationExample } from "./assistant/template-tools";

const card = "rounded-[22px] border border-[#e8eaff] bg-white p-6 shadow-[0_6px_24px_rgba(48,59,153,.045)]";

const fmt = (s: string) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

export function BackendConnection({ projectId, buzzBooster=false }: { projectId: string; buzzBooster?: boolean }) {
  const { headers } = useAdmin();
  const config = useQuery({
    queryKey: ["sabito-admin", "assistant-settings", projectId],
    queryFn: () => getAssistantConfiguration(projectId, headers()),
    staleTime: Infinity, refetchOnWindowFocus: false,
  });
  const bca = config.data?.profile === "bca";
  const q = useQuery({
    queryKey: ["sabito-admin", "backend", projectId],
    queryFn: () => getBackendConnectionStatus(projectId, headers()),
    refetchInterval: 10_000, staleTime: 5_000,
  });
  const sdkHref = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/integrations/sabito-backend.mjs`;
  const connected = q.data?.connected === true;

  return (
    <section className={card} data-testid="section-backend">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold"><PlugZap size={16} />Connexion au serveur de la plateforme</h2>
        <button className="p-1.5 text-[#737b94] hover:text-[#3641f5]" onClick={() => void q.refetch()} aria-label="Actualiser" data-testid="button-refresh-backend"><RefreshCw size={15} className={q.isFetching ? "animate-spin" : ""} /></button>
      </div>
      <p className="text-[12px] leading-5 text-[#6c748d]">{bca ? "BCA : consultation des paiements d’activation, dépôts, retraits et remboursements, transferts, conversions, soldes, parrainage, récompenses, formations, Digital Store et BCA Ads. Aucun mouvement d’argent n’est exécuté par Sabito." : config.data?.profile==="buzzbooster" || buzzBooster ? "Buzz Booster : consultation des dépôts Mobile Money et crypto, bonus de dépôt, commandes de boost et remboursements, code et commissions de parrainage, bonus du filleul, soldes, mouvements et ajustements administrateur. Aucune activation, aucun retrait ni mouvement d’argent n’est exécuté." : "Sabito peut interroger les fonctions de consultation configurées pour cette plateforme."} Le pont serveur authentifié utilise <b>les mêmes</b> SABITO_CLIENT_ID et SABITO_CLIENT_SECRET déjà configurés côté serveur : aucune nouvelle clé n'est nécessaire.</p>
      {bca && <p className="mt-2 text-[12px] leading-5 text-[#6c748d]">BCA utilise Laravel/PHP : le développeur peut implémenter le protocole ci-dessous dans une commande Laravel supervisée, sans réécrire le backend. L’exemple Node est une alternative, pas une obligation.</p>}

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-[#e8eaff] p-3" data-testid="status-backend-channel">
          <div className="text-[10px] font-semibold uppercase tracking-[.8px] text-[#8b92a8]">Canal</div>
          {q.isLoading ? <div className="mt-1.5 h-5 w-32 animate-pulse rounded bg-[#f1f3ff]" />
            : q.error ? <div className="mt-1 text-[12px] text-[#9b2c2c]">{errMsg(q.error)} <button className="font-semibold underline" onClick={() => void q.refetch()}>Réessayer</button></div>
            : <>
                <div className="mt-1 flex items-center gap-2 text-[13px] font-semibold">
                  <span className={`h-2 w-2 rounded-full ${connected ? "bg-[#1fa463]" : "bg-[#c3c7d6]"}`} />
                  {connected ? "Canal connecté" : "Canal non connecté"}
                </div>
                <div className="mt-0.5 text-[11px] text-[#8b92a8]">{q.data?.last_seen ? `Dernier signal : ${fmt(q.data.last_seen)}` : "Aucun signal reçu"} · vérifié toutes les 10 s</div>
              </>}
        </div>
        <div className="rounded-xl border border-[#f2e2b8] bg-[#fffaf0] p-3 text-[#7a5a12]">
          <div className="text-[10px] font-semibold uppercase tracking-[.8px]">Handlers</div>
          <div className="mt-1 flex items-center gap-2 text-[13px] font-semibold"><TriangleAlert size={14} />Non vérifiables ici</div>
          <div className="mt-0.5 text-[11px] leading-4">Un canal connecté prouve seulement que le SDK interroge Sabito, pas que les handlers sont branchés aux bons services ni que les données renvoyées sont justes. Testez chaque opération avec un vrai compte membre.</div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#f6f7ff] p-3 text-[12px] leading-5 text-[#48506a]">
        <div className="flex items-center gap-2 font-semibold text-[#11162b]"><ShieldCheck size={14} />À savoir</div>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Les clés seules n'exécutent rien : le développeur doit lancer le SDK sur le serveur de la plateforme et relier chaque handler aux services existants.</li>
          <li>Chaque handler vérifie que la donnée appartient à <code>job.external_user_id</code> et que l'accès est autorisé. Ne jamais se fier à un identifiant envoyé par le navigateur, ni rechercher une transaction par son seul identifiant.</li>
          <li>Les clés restent dans les variables d'environnement serveur, jamais dans le navigateur ni dans le code.</li>
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12px] font-semibold">Exemple d'installation pour le développeur de la plateforme</div>
        <a href={sdkHref} download="sabito-backend.mjs" className="inline-flex items-center gap-2 rounded-[12px] border border-[#e3e6f8] px-3 py-2 text-[12px] font-medium text-[#48506a] transition hover:border-[#abb1ff] hover:text-[#3641f5]" data-testid="link-download-sdk"><Download size={14} />Télécharger sabito-backend.mjs</a>
      </div>
      {config.error && <p role="alert" className="mt-2 text-[12px] text-[#9b2c2c]">Impossible de charger les fonctions configurées : {errMsg(config.error)}</p>}
      <pre className="mt-2 max-h-[480px] overflow-auto rounded-xl bg-[#171d53] p-4 font-mono text-[11.5px] leading-6 text-[#dfe3ff]" data-testid="text-backend-example">{config.data ? backendInstallationExample(config.data.settings.intents) : config.error ? "Rechargez les réglages avant de préparer le connecteur." : "Chargement des fonctions configurées…"}</pre>
      <p className="mt-2 text-[11px] text-[#8b92a8]">Protocole (géré par le SDK, authentification Basic) : <code>POST /v1/backend/jobs/poll</code> → <code>{"{ jobs }"}</code> ; <code>POST /v1/backend/jobs/:id/result</code> avec <code>{"{ result }"}</code>.</p>
    </section>
  );
}
