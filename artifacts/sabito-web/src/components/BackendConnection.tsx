import { useQuery } from "@tanstack/react-query";
import { getBackendConnectionStatus } from "@workspace/api-client-react";
import { Download, PlugZap, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { errMsg, useAdmin } from "@/lib/admin";

const card = "rounded-[22px] border border-[#e8eaff] bg-white p-6 shadow-[0_6px_24px_rgba(48,59,153,.045)]";

const fmt = (s: string) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const example = `// EXEMPLE À ADAPTER pour le développeur de la plateforme — serveur Node 21+ uniquement.
// Variables d'environnement serveur (déjà configurées, aucune nouvelle clé) :
//   SABITO_URL=https://…   SABITO_CLIENT_ID   SABITO_CLIENT_SECRET
import { startSabitoBackend } from "./sabito-backend.mjs"; // fichier téléchargé

const controller = new AbortController();

startSabitoBackend({
  signal: controller.signal,
  onError: (code) => console.warn("sabito", code),
  handlers: {
    // job = { id, operation, external_user_id, expires_at, signal,
    //         fields: { deposit_number, country, payment_method, transaction_id } }
    async account_activation(job) {
      // Brancher ici VOTRE service existant de comptes.
      // Retrouver le membre par job.external_user_id (identité vérifiée par Sabito).
      // Retour : { status: "active" | "inactive" | "pending" | "failed" }
      throw new Error("Raccorder account_activation au service réel");
    },
    async deposit_status(job) {
      // Brancher VOTRE service de dépôts. Vérifier que le dépôt
      // appartient bien à job.external_user_id — jamais par transaction_id seul.
      // Retour : { status: "confirmed" | "pending" | "failed" }
      throw new Error("Raccorder deposit_status au service réel");
    },
    async referral_code(job) {
      // Brancher VOTRE service de parrainage, avec contrôle des droits.
      // Retour : { status: "ok", code }
      throw new Error("Raccorder referral_code au service réel");
    },
  },
});
// Refus, introuvable ou erreur : { status: "forbidden" | "not_found" | "error" }
// Exception non gérée → traitée comme "error" : ticket pour l'équipe,
// aucune vérification n'est présentée comme effectuée.`;

export function BackendConnection({ projectId }: { projectId: string }) {
  const { headers } = useAdmin();
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
      <p className="text-[12px] leading-5 text-[#6c748d]">Sabito peut interroger le serveur de la plateforme pour répondre aux questions d'activation de compte, de statut de dépôt et de code de parrainage. Le pont serveur authentifié est disponible dès maintenant. Il utilise <b>les mêmes</b> SABITO_CLIENT_ID et SABITO_CLIENT_SECRET déjà configurés côté serveur : aucune nouvelle clé n'est nécessaire.</p>

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
      <pre className="mt-2 overflow-x-auto rounded-xl bg-[#171d53] p-4 font-mono text-[11.5px] leading-6 text-[#dfe3ff]" data-testid="text-backend-example">{example}</pre>
      <p className="mt-2 text-[11px] text-[#8b92a8]">Protocole (géré par le SDK, authentification Basic) : <code>POST /v1/backend/jobs/poll</code> → <code>{"{ jobs }"}</code> ; <code>POST /v1/backend/jobs/:id/result</code> avec <code>{"{ result }"}</code>.</p>
    </section>
  );
}
