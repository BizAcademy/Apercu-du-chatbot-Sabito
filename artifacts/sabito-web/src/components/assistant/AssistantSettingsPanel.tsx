import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAssistantConfiguration, updateAssistantConfiguration, type AssistantSettings } from "@workspace/api-client-react";
import { Plus, RefreshCw, Save, Settings2, TriangleAlert } from "lucide-react";
import { errMsg, useAdmin } from "@/lib/admin";
import { MessagesEditor } from "./MessagesEditor";
import { SynonymsEditor } from "./SynonymsEditor";
import { IntentEditor } from "./IntentEditor";
import { blankIntent, depositIntent, withdrawalIntent, orderIntent, referralRewardIntent, settingsWarnings, validateSettings } from "./validate";
import { btn, card, ghost, hint, label } from "./styles";
import { appendIntentTemplates } from "./template-tools";

type Tab = "retrieval" | "messages" | "intents";

export function AssistantSettingsPanel({ projectId, buzzBooster=false }: { projectId: string; buzzBooster?: boolean }) {
  const { headers } = useAdmin();
  const qc = useQueryClient();
  const key = ["sabito-admin", "assistant-settings", projectId];
  const q = useQuery({ queryKey: key, queryFn: () => getAssistantConfiguration(projectId, headers()), staleTime: Infinity, refetchOnWindowFocus: false });
  const [draft, setDraft] = useState<AssistantSettings | null>(null);
  const [revision, setRevision] = useState<number | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("intents");
  const [templateId, setTemplateId] = useState("");
  const baseline = useRef("");

  useEffect(() => {
    if (q.data && draft === null) {
      setDraft(q.data.settings); setRevision(q.data.revision); baseline.current = JSON.stringify(q.data.settings);
    }
  }, [q.data, draft]);

  const save = useMutation({
    mutationFn: (s: AssistantSettings) => updateAssistantConfiguration(projectId, { settings: s, expected_revision: revision ?? 0 }, headers()),
    onSuccess: (r) => {
      qc.setQueryData(key, r);
      setDraft(r.settings); setRevision(r.revision); baseline.current = JSON.stringify(r.settings);
      setConflict(false); setSaved(true); window.setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => { if ((e as { status?: number }).status === 409) setConflict(true); },
  });

  const reload = async () => {
    const r = await q.refetch();
    if (r.data) { setDraft(r.data.settings); setRevision(r.data.revision); baseline.current = JSON.stringify(r.data.settings); setConflict(false); save.reset(); }
  };

  const header = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-bold"><Settings2 size={16} />Configuration de l'assistant</h2>
        <p className="mt-0.5 text-[12px] text-[#6c748d]">Messages rédigés par l'administrateur, recherche classique et intentions de compte. Aucune génération par IA.</p>
      </div>
      {revision !== null && <span className="rounded-full bg-[#f1f3ff] px-2.5 py-1 font-mono text-[10px] text-[#5b63a8]" data-testid="text-settings-revision">révision {revision}</span>}
    </div>
  );

  if (q.isLoading || (!draft && !q.error)) return <section className={card} id="assistant-settings">{header}<div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-[#f1f3ff]" />)}</div></section>;
  if (q.error || !draft) return <section className={card} id="assistant-settings">{header}<div role="alert" className="rounded-xl border border-[#f3d2d2] bg-[#fff6f6] p-3 text-[12px] text-[#9b2c2c]">{errMsg(q.error)} <button className="ml-2 font-semibold underline" onClick={() => void q.refetch()}>Réessayer</button></div></section>;

  const errors = validateSettings(draft);
  const warnings = settingsWarnings(draft);
  const dirty = JSON.stringify(draft) !== baseline.current;
  const bca = q.data?.profile === "bca";
  const smm = q.data?.profile === "buzzbooster" || buzzBooster;
  const catalogPlatform = bca ? "BCA" : smm ? "Buzz Booster" : "";
  const catalogKey = bca ? "bca" : "buzzbooster";
  const templates = q.data?.intent_templates ?? [];
  const missingTemplates = templates.filter(template => !draft.intents.some(intent => intent.backend_function === template.backend_function));
  const patch = (p: Partial<AssistantSettings>) => setDraft({ ...draft, ...p });
  const tabs: { k: Tab; l: string }[] = [{ k: "intents", l: `Intentions (${draft.intents.length})` }, { k: "messages", l: "Messages" }, { k: "retrieval", l: "Recherche" }];

  return (
    <section className={card} id="assistant-settings" data-testid="section-assistant-settings">
      {header}
      <div className="mb-4 flex gap-1 rounded-[14px] bg-[#f4f5ff] p-1">
        {tabs.map((t) => <button key={t.k} type="button" onClick={() => setTab(t.k)} className={`flex-1 rounded-[11px] px-3 py-2 text-[12px] font-semibold transition ${tab === t.k ? "bg-white text-[#3641f5] shadow-sm" : "text-[#6c748d] hover:text-[#3641f5]"}`} data-testid={`tab-settings-${t.k}`}>{t.l}</button>)}
      </div>

      {tab === "retrieval" && (
        <div className="space-y-5">
          <div>
            <label className={label} htmlFor="confidence">Seuil de confiance : <span className="font-mono text-[#3641f5]" data-testid="text-confidence">{draft.confidence_threshold.toFixed(2)}</span></label>
            <input id="confidence" type="range" min={0.35} max={1} step={0.01} value={draft.confidence_threshold} onChange={(e) => patch({ confidence_threshold: Number(e.target.value) })} className="mt-2 w-full accent-[#3641f5]" data-testid="input-confidence" />
            <p className={hint}>Score minimal de correspondance (mots-clés, BM25, trigrammes, synonymes) pour répondre avec une référence. En dessous, le message « aucune réponse » est affiché et la question est enregistrée pour traitement.</p>
          </div>
          <div><div className={label}>Synonymes</div><SynonymsEditor value={draft.synonyms} onChange={(synonyms) => patch({ synonyms })} /></div>
        </div>
      )}
      {tab === "messages" && <MessagesEditor value={draft} onChange={patch} />}
      {tab === "intents" && (
        <div>
          {catalogPlatform && <div className="mb-4 rounded-xl bg-[#f6f7ff] p-3" data-testid={`section-${catalogKey}-financial-templates`}>
            <div className={label}>Parcours financiers {catalogPlatform} — consultation uniquement</div>
            <p className={`${hint} mb-3`}>{bca ? "Dépôts, retraits, transferts, conversions, parrainage, formations, Digital Store, BCA Ads et ajustements. Les gains d’activité restent désactivés tant que leur service réel n’est pas confirmé." : "Dépôts Mobile Money et crypto, bonus de dépôt, commandes de boost, remboursements totaux ou partiels, code et commissions de parrainage, bonus du filleul, soldes, mouvements et ajustements administrateur. Aucun parcours d’activation de compte ni de retrait n’est ajouté."} Chaque fonction doit être raccordée au backend {catalogPlatform}. Vos règles existantes ne sont pas écrasées.</p>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={`financial-template-${projectId}`} className="sr-only">Modèle financier {catalogPlatform} à ajouter</label>
              <select id={`financial-template-${projectId}`} className="max-w-full rounded-lg border border-[#e3e6f8] bg-white p-2 text-[12px]" value={templateId} onChange={event => setTemplateId(event.target.value)} data-testid={`select-${catalogKey}-intent-template`}>
                <option value="">Choisir un parcours manquant</option>
                {missingTemplates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
              <button type="button" className={ghost} disabled={draft.intents.length>=100 || !missingTemplates.some(template=>template.id===templateId)} onClick={() => {
                patch({intents:appendIntentTemplates(draft.intents,missingTemplates.filter(template=>template.id===templateId))});setTemplateId("");
              }} data-testid={`button-add-${catalogKey}-template`}>Ajouter ce parcours</button>
              <button type="button" className={ghost} disabled={draft.intents.length+missingTemplates.length>100 || !missingTemplates.length} onClick={() => {
                patch({intents:appendIntentTemplates(draft.intents,missingTemplates)});setTemplateId("");
              }} data-testid={`button-add-all-${catalogKey}-templates`}>Ajouter les parcours {catalogPlatform} manquants ({missingTemplates.length})</button>
            </div>
            <details className="mt-3 text-[12px]" data-testid={`coverage-${catalogKey}-intents`}>
              <summary className="cursor-pointer font-semibold text-[#48506a]">Vérifier les {templates.length} parcours : {templates.length-missingTemplates.length} configurés, {missingTemplates.length} manquants</summary>
              <ul className="mt-2 space-y-2">
                {templates.map(template => {
                  const matches=draft.intents.filter(intent=>intent.backend_function===template.backend_function);
                  return <li key={template.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-white p-2">
                    <span>{template.name} <code className="text-[10px] text-[#6c748d]">({template.backend_function})</code></span>
                    <span>{!matches.length ? "Manquant" : matches.some(intent=>intent.enabled) ? "Configuré · actif" : "Configuré · désactivé"}</span>
                  </li>;
                })}
              </ul>
              <p className={`${hint} mt-2`}>Ce bilan concerne les règles Sabito, pas la disponibilité ni la validité des services backend. Les modifications prennent effet après enregistrement.</p>
            </details>
            {draft.intents.length+missingTemplates.length>100 && <p role="alert" className={`${hint} mt-2`}>L’ajout de tous les parcours dépasserait la limite de 100 intentions. Ajoutez les modèles individuellement ou retirez des règles inutilisées.</p>}
            <p className={`${hint} mt-2`}>Cliquez sur « Enregistrer » pour appliquer vos ajouts. Pour remplacer une règle personnalisée, modifiez-la directement plutôt que créer un doublon.</p>
          </div>}
          <p className={`${hint} mb-3`}>Une intention répond d'abord à la question, puis demande confirmation. Après un « oui », elle collecte les champs nécessaires et appelle une fonction en lecture seule du serveur de la plateforme. Activation, suppression et modifications sont appliquées à l'enregistrement.</p>
          <div className="mb-4 rounded-xl bg-[#f6f7ff] p-3">
            <div className={label}>Synonymes propres à cette plateforme</div>
            <p className={`${hint} mb-2`}>Exemple : dépôt, recharge, versement. Ils sont reconnus dans les déclencheurs, même au milieu d'une phrase. Préférez « dépôt non reçu » à un mot trop général comme « compte ».</p>
            <SynonymsEditor value={draft.synonyms} onChange={(synonyms) => patch({ synonyms })} />
          </div>
          {!catalogPlatform && <><button type="button" className={`${ghost} mb-3`} disabled={draft.intents.length >= 100}
            onClick={() => patch({ intents: [...draft.intents, depositIntent(draft.intents)] })}
            data-testid="button-add-deposit-intent">Ajouter le modèle « Dépôt non reçu »</button>
          {!buzzBooster && <button type="button" className={`${ghost} mb-3 ml-2`} disabled={draft.intents.length >= 100}
            onClick={() => patch({ intents: [...draft.intents, withdrawalIntent(draft.intents)] })}
            data-testid="button-add-withdrawal-intent">Ajouter le modèle « Retrait »</button>}
          <button type="button" className={`${ghost} mb-3 ml-2`} disabled={draft.intents.length >= 100}
            onClick={() => patch({ intents: [...draft.intents, orderIntent(draft.intents)] })}
            data-testid="button-add-order-intent">Ajouter le modèle « Commande de boost »</button>
          <button type="button" className={`${ghost} mb-3 ml-2`} disabled={draft.intents.length >= 100}
            onClick={() => patch({ intents: [...draft.intents, referralRewardIntent(draft.intents)] })}
            data-testid="button-add-referral-reward-intent">Ajouter le modèle « Commission de parrainage »</button></>}
          <p className={`${hint} mb-3`}>Le modèle ajoute une nouvelle règle sans modifier vos règles existantes. Si une ancienne règle utilise les mêmes déclencheurs, désactivez-la pour éviter une ambiguïté. Le numéro doit toujours être recoupé avec l'identité du membre par votre backend.</p>
          {draft.intents.length === 0 && <p className="rounded-xl bg-[#f6f7ff] p-4 text-[12px] text-[#6c748d]">Aucune intention. Les questions de compte recevront le message « aucune réponse ».</p>}
          <div className="space-y-2">
            {draft.intents.map((it, i) => (
              <IntentEditor key={i} intent={it} all={draft.intents} knownFunctions={templates.length ? templates.map(template=>template.backend_function) : undefined}
                onChange={(v) => patch({ intents: draft.intents.map((x, j) => (j === i ? v : x)) })}
                onDelete={() => patch({ intents: draft.intents.filter((_, j) => j !== i) })} />
            ))}
          </div>
          <button type="button" className={`${ghost} mt-3`} disabled={draft.intents.length >= 100} onClick={() => patch({ intents: [...draft.intents, blankIntent(draft.intents)] })} data-testid="button-add-intent"><Plus size={14} />Nouvelle intention</button>
        </div>
      )}

      {conflict && (
        <div role="alert" className="mt-5 rounded-xl border border-[#f2e2b8] bg-[#fffaf0] p-4 text-[12px] text-[#7a5a12]" data-testid="alert-settings-conflict">
          <div className="flex items-center gap-2 font-semibold"><TriangleAlert size={15} />La configuration a changé entre-temps</div>
          <p className="mt-1">Une autre modification (configuration ou base de connaissances) a été enregistrée. Rien n'a été écrasé. Rechargez pour repartir de la version actuelle : votre brouillon sera remplacé.</p>
          <button type="button" className={`${ghost} mt-2`} onClick={() => void reload()} disabled={q.isFetching} data-testid="button-reload-settings"><RefreshCw size={13} className={q.isFetching ? "animate-spin" : ""} />Recharger la version actuelle</button>
        </div>
      )}
      {save.error && !conflict && <div role="alert" className="mt-4 rounded-xl border border-[#f3d2d2] bg-[#fff6f6] p-3 text-[12px] text-[#9b2c2c]" data-testid="text-settings-error">{errMsg(save.error)}</div>}
      {errors.length > 0 && dirty && <ul className="mt-4 max-h-32 list-disc overflow-y-auto rounded-xl bg-[#fff6f6] py-2 pl-7 pr-3 text-[11px] text-[#9b2c2c]" data-testid="text-settings-errors">{errors.slice(0, 12).map((e) => <li key={e}>{e}</li>)}{errors.length > 12 && <li>… et {errors.length - 12} autre(s)</li>}</ul>}

      {warnings.length > 0 && <ul className="mt-4 list-disc rounded-xl bg-[#fffaf0] py-2 pl-7 pr-3 text-[11px] text-[#7a5a12]" data-testid="text-settings-warnings">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      <div className="sticky bottom-3 mt-5 flex flex-wrap items-center justify-end gap-2 rounded-[14px] bg-white/90 py-1 backdrop-blur">
        <span className="mr-auto text-[11px] text-[#8b92a8]" data-testid="text-settings-state">{saved ? "Enregistré." : dirty ? "Modifications non enregistrées" : "À jour"}</span>
        <button type="button" className={ghost} disabled={!dirty || save.isPending} onClick={() => { setDraft(JSON.parse(baseline.current)); save.reset(); }} data-testid="button-discard-settings">Annuler les modifications</button>
        <button type="button" className={btn} disabled={!dirty || errors.length > 0 || save.isPending || conflict} onClick={() => save.mutate(draft)} data-testid="button-save-settings"><Save size={14} />{save.isPending ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
    </section>
  );
}
