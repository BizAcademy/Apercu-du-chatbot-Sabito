import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getWidgetSettings, updateWidgetSettings, type Platform } from "@workspace/api-client-react";
import { useAdmin } from "@/lib/admin";
import { Copy } from "lucide-react";

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export function WidgetIntegration({ project }: { project: Platform }) {
  const { headers } = useAdmin();
  const [domains, setDomains] = useState("");
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState("");
  const q = useQuery({ queryKey: ["sabito-admin", "widget", project.id],
    queryFn: () => getWidgetSettings(project.id, headers()), staleTime: 60_000, refetchOnWindowFocus: false });
  useEffect(() => { if (q.data && !dirty) setDomains(q.data.origins.join("\n")); }, [q.data, dirty]);
  const save = useMutation({
    mutationFn: () => updateWidgetSettings(project.id, { origins: domains.split(/[\n,]/).map(s => s.trim()).filter(Boolean) }, headers()),
    onSuccess: async () => { await q.refetch(); setDirty(false); },
  });
  const origin = window.location.origin;
  const snippet = `<script
  defer
  src="${escape(origin)}/widget/sabito-chat.js"
  data-api-url="${escape(origin)}"
  data-project-id="${escape(project.id)}"
  data-product-code="${escape(project.slug)}"
  data-title="${escape(project.assistantName)}"
  data-language="fr"
  data-primary-color="#4f46e5"
  data-position="right"
></script>`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(snippet); setCopied("Script copié."); }
    catch { setCopied("Copie automatique indisponible : sélectionne le script ci-dessous."); }
  };
  return <section className="rounded-[22px] border border-[#e8eaff] bg-white p-6">
    <h2 className="text-[15px] font-bold">Widget de cette plateforme</h2>
    <p className="mt-2 text-[13px] text-[#6c748d]">Le chat et les réponses restent hébergés dans Sabito. Colle ce script dans le frontend de ton site, avant la fermeture de body. Aucun secret n'est inclus.</p>
    <label className="mt-4 block text-[13px] font-semibold" htmlFor="widget-domains">Domaines autorisés (une origine HTTPS par ligne)</label>
    <textarea id="widget-domains" data-testid="input-widget-origins" disabled={q.isLoading || Boolean(q.error)}
      className="mt-2 min-h-24 w-full rounded-xl border p-3 text-[13px]" placeholder="https://bizconnectacademy.com"
      value={domains} onChange={e => { setDirty(true); setDomains(e.target.value); }} />
    <p className="mt-1 text-[12px] text-[#6c748d]">Sans chemin : https://exemple.com, pas https://exemple.com/dashboard. Ajouter www séparément si nécessaire.</p>
    <button data-testid="button-save-widget" disabled={q.isLoading || Boolean(q.error) || save.isPending}
      onClick={() => save.mutate()} className="mt-3 rounded-xl bg-[#3641f5] px-4 py-2 text-[13px] text-white disabled:opacity-50">
      {save.isPending ? "Enregistrement…" : "Enregistrer les domaines"}</button>
    {save.isSuccess && !dirty && <p role="status" className="mt-2 text-sm text-green-700">Domaines enregistrés.</p>}
    {(q.error || save.error) && <p role="alert" className="mt-2 text-sm text-red-700">Impossible de charger ou enregistrer les domaines. Vérifie les origines HTTPS et la migration du widget.</p>}
    {!q.data?.origins.length && <p className="mt-3 text-sm text-amber-700">Le script est généré. Enregistre au moins un domaine pour autoriser son utilisation.</p>}
    <button onClick={copy} data-testid="button-copy-widget" className="mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px]"><Copy size={14} />Copier le script</button>
    {copied && <p role="status" className="mt-2 text-sm">{copied}</p>}
    <pre data-testid="text-widget-script" className="mt-3 overflow-x-auto rounded-xl bg-[#171d53] p-4 text-[12px] leading-6 text-[#dfe3ff]">{snippet}</pre>
    <p className="mt-3 text-[12px] text-[#6c748d]">Mode visiteur : références validées de cette plateforme seulement. Ce script n'ouvre pas l'accès aux transactions privées ou à l'identité vérifiée d'un membre. Les vérifications de domaine ne remplacent pas une authentification utilisateur. En production, copie le script depuis ton dashboard Sabito en ligne, pour utiliser son adresse publique.</p>
  </section>;
}
