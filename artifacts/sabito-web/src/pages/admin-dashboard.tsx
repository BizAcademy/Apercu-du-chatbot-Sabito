import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  addPlatformKnowledge, createSabitoProject, getSabitoCoreStatus, listPlatformKnowledge, listSabitoProjects,
  removePlatformKnowledge, rotateSabitoCredentials, updatePlatformKnowledge,
  type Platform, type PlatformCredentials, type PlatformDocument,
} from "@workspace/api-client-react";
import { BookOpen, Copy, Settings2, KeyRound, LogOut, MessageCircle, Plus, RefreshCw, Trash2, Pencil, X, TriangleAlert } from "lucide-react";
import { errMsg, useAdmin } from "@/lib/admin";
import { AdminLogin } from "@/pages/admin-login";
import { WidgetIntegration } from "@/components/WidgetIntegration";
import { UnansweredQuestions } from "@/components/UnansweredQuestions";
import { SupportTickets } from "@/components/SupportTickets";
import { BackendConnection } from "@/components/BackendConnection";
import { AssistantSettingsPanel } from "@/components/assistant/AssistantSettingsPanel";

const card = "rounded-[22px] border border-[#e8eaff] bg-white p-6 shadow-[0_6px_24px_rgba(48,59,153,.045)]";
const input = "w-full rounded-[12px] border border-[#dfe2ef] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#9da5ff]";
const btn = "inline-flex items-center gap-2 rounded-[12px] bg-[#3641f5] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#2934dc] disabled:bg-[#c8cbea]";
const ghost = "inline-flex items-center gap-2 rounded-[12px] border border-[#e3e6f8] px-3 py-2 text-[12px] font-medium text-[#48506a] transition hover:border-[#abb1ff] hover:text-[#3641f5] disabled:opacity-50";

export function AdminDashboard() {
  const { adminKey } = useAdmin();
  const status = useQuery({ queryKey: ["sabito-status"], queryFn: () => getSabitoCoreStatus(), staleTime: 30_000, retry: 1 });
  if (!adminKey || !status.data?.configured)
    return <AdminLogin status={status.data} statusError={status.error ? errMsg(status.error) : undefined} retry={() => void status.refetch()} />;
  return <Console />;
}

function Console() {
  const { logout, headers } = useAdmin();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ name: string; c: PlatformCredentials } | null>(null);
  const projects = useQuery({ queryKey: ["sabito-admin", "projects"], queryFn: () => listSabitoProjects(headers()), refetchInterval: 30_000, staleTime: 15_000 });
  const list = projects.data?.data ?? [];
  const current = list.find((p) => p.id === selected) ?? list[0];

  return (
    <main className="min-h-[100dvh] bg-[#f1f3ff] font-['Outfit',sans-serif] text-[#11162b]">
      <header className="bg-[#171d53] text-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-[#7881ff] to-[#4855f6] font-extrabold">S</div>
            <div><div className="text-[17px] font-bold">sabito</div><div className="text-[10px] tracking-[1.5px] text-[#aeb5e8]">CONSOLE D'ADMINISTRATION</div></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/15 px-3 py-1 text-[10px] text-[#c0c6eb] sm:inline">Aperçu de développement</span>
            <button onClick={() => { setCreds(null); logout(); }} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-[#c2c8e7] hover:bg-white/10 hover:text-white" data-testid="button-logout"><LogOut size={15} />Déconnexion</button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1280px] gap-5 px-5 py-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <section className={card}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-bold">Plateformes</h2>
              <button className="text-[#737b94] hover:text-[#3641f5]" onClick={() => void projects.refetch()} aria-label="Actualiser" data-testid="button-refresh-projects"><RefreshCw size={15} className={projects.isFetching ? "animate-spin" : ""} /></button>
            </div>
            {projects.isLoading && <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-[#f1f3ff]" />)}</div>}
            {projects.error && <ErrorBox msg={errMsg(projects.error)} retry={() => void projects.refetch()} />}
            {!projects.isLoading && !projects.error && list.length === 0 && <p className="rounded-xl bg-[#f6f7ff] p-4 text-[12px] text-[#6c748d]">Aucune plateforme. Crée la première ci-dessous.</p>}
            <div className="space-y-1.5">
              {list.map((p) => (
                <button key={p.id} onClick={() => setSelected(p.id)} className={`w-full rounded-[13px] px-3 py-3 text-left transition ${current?.id === p.id ? "bg-[#eef0ff]" : "hover:bg-[#f6f7ff]"}`} data-testid={`button-project-${p.id}`}>
                  <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{p.name}</span><StatusPill s={p.status} /></div>
                  <div className="mt-0.5 font-mono text-[11px] text-[#8b92a8]">{p.slug}</div>
                </button>
              ))}
            </div>
          </section>
          <CreateProject onCreated={(p, c) => { setSelected(p.id); setCreds({ name: p.name, c }); void qc.invalidateQueries({ queryKey: ["sabito-admin", "projects"] }); }} />
        </aside>
        <div className="min-w-0 space-y-5">
          {current ? <ProjectPanel key={current.id} p={current} onRotated={(c) => setCreds({ name: current.name, c })} /> : !projects.isLoading && <div className={card}><p className="text-[13px] text-[#6c748d]">Sélectionne ou crée une plateforme pour gérer ses identifiants, sa base de connaissances et la tester.</p></div>}
        </div>
      </div>
      {creds && <CredentialsModal name={creds.name} c={creds.c} close={() => setCreds(null)} />}
    </main>
  );
}

function StatusPill({ s }: { s: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.8px] ${s === "active" ? "bg-[#f1fbf5] text-[#178954]" : "bg-[#f3f4f8] text-[#77809a]"}`}>{s === "active" ? "Active" : "Désactivée"}</span>;
}
function ErrorBox({ msg, retry }: { msg: string; retry?: () => void }) {
  return <div role="alert" className="mb-3 rounded-xl border border-[#f3d2d2] bg-[#fff6f6] p-3 text-[12px] text-[#9b2c2c]">{msg}{retry && <button className="ml-2 font-semibold underline" onClick={retry}>Réessayer</button>}</div>;
}

function CreateProject({ onCreated }: { onCreated: (p: Platform, c: PlatformCredentials) => void }) {
  const { headers } = useAdmin();
  const [f, setF] = useState({ slug: "", name: "", assistant_name: "Sabito", system_prompt: "" });
  const m = useMutation({ mutationFn: () => createSabitoProject(f, headers()), onSuccess: (r) => { onCreated(r.data.project, r.data.credentials); setF({ slug: "", name: "", assistant_name: "Sabito", system_prompt: "" }); } });
  const valid = /^[a-z0-9-]{2,80}$/.test(f.slug) && f.name.trim().length >= 2 && f.assistant_name.trim().length >= 2 && f.system_prompt.trim().length >= 20;
  const submit = (e: FormEvent) => { e.preventDefault(); if (valid) m.mutate(); };
  return (
    <section className={card}>
      <h2 className="mb-4 flex items-center gap-2 text-[15px] font-bold"><Plus size={16} />Nouvelle plateforme</h2>
      <form onSubmit={submit} className="space-y-2.5">
        <input className={input} placeholder="Identifiant (ex. bca)" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} data-testid="input-slug" />
        <input className={input} placeholder="Nom de la plateforme" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="input-name" />
        <input className={input} placeholder="Nom de l'assistant" value={f.assistant_name} onChange={(e) => setF({ ...f, assistant_name: e.target.value })} data-testid="input-assistant" />
        <textarea className={`${input} min-h-[90px]`} placeholder="Instructions système (20 caractères minimum)" value={f.system_prompt} onChange={(e) => setF({ ...f, system_prompt: e.target.value })} data-testid="input-system-prompt" />
        <p className="text-[11px] text-[#8b92a8]">Identifiant : minuscules, chiffres et tirets.</p>
        {m.error && <ErrorBox msg={errMsg(m.error)} />}
        <button disabled={!valid || m.isPending} className={btn} data-testid="button-create-project">{m.isPending ? "Création…" : "Créer la plateforme"}</button>
      </form>
    </section>
  );
}

function ProjectPanel({ p, onRotated }: { p: Platform; onRotated: (c: PlatformCredentials) => void }) {
  const { headers } = useAdmin();
  const [confirm, setConfirm] = useState(false);
  const rotate = useMutation({ mutationFn: () => rotateSabitoCredentials(p.id, headers()), onSuccess: (r) => { setConfirm(false); onRotated(r.data); } });
  const origin = window.location.origin;
  const snippet = `# Variables serveur de la plateforme (jamais dans le navigateur)
SABITO_URL=${origin}
SABITO_CLIENT_ID=<identifiant client>
SABITO_CLIENT_SECRET=<secret client>

# 1. Côté serveur : obtenir un jeton pour l'utilisateur
POST \${SABITO_URL}/v1/auth/token
Authorization: Basic base64(SABITO_CLIENT_ID:SABITO_CLIENT_SECRET)

# 2. Côté navigateur : transmettre uniquement access_token
io(SABITO_URL, { path: "/socket.io", auth: { token: access_token } })`;
  return (
    <>
      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><h1 className="text-[22px] font-semibold tracking-[-.5px]" data-testid="text-project-name">{p.name}</h1><StatusPill s={p.status} /></div>
            <p className="mt-1 text-[12px] text-[#6c748d]">Assistant : <b>{p.assistantName}</b> · <span className="font-mono">{p.slug}</span> · <span className="font-mono">{p.id}</span></p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/projects/${p.id}/chat`} className={btn} data-testid="link-test-chat"><MessageCircle size={15} />Tester le chat</Link>
            <a href="#assistant-settings" className={ghost} data-testid="link-assistant-settings"><Settings2 size={14} />Configurer l'assistant</a>
            <button className={ghost} onClick={() => setConfirm(true)} data-testid="button-rotate"><KeyRound size={14} />Régénérer les identifiants</button>
          </div>
        </div>
        {confirm && (
          <div className="mt-5 rounded-xl border border-[#f2e2b8] bg-[#fffaf0] p-4 text-[13px] text-[#7a5a12]">
            <div className="flex items-center gap-2 font-semibold"><TriangleAlert size={16} />Confirmer la régénération</div>
            <p className="mt-1">Les identifiants actuels et tous les jetons déjà émis seront révoqués immédiatement. Les intégrations existantes cesseront de fonctionner jusqu'à la mise à jour des variables.</p>
            {rotate.error && <ErrorBox msg={errMsg(rotate.error)} />}
            <div className="mt-3 flex gap-2">
              <button className="rounded-[12px] bg-[#b4441f] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60" disabled={rotate.isPending} onClick={() => rotate.mutate()} data-testid="button-confirm-rotate">{rotate.isPending ? "Régénération…" : "Révoquer et régénérer"}</button>
              <button className={ghost} onClick={() => setConfirm(false)}>Annuler</button>
            </div>
          </div>
        )}
      </section>
      <AssistantSettingsPanel projectId={p.id} />
      <SupportTickets projectId={p.id} />
      <UnansweredQuestions projectId={p.id} />
      <Knowledge projectId={p.id} />
      <WidgetIntegration project={p} />
      <BackendConnection projectId={p.id} />
      <section className={card}>
        <h2 className="text-[15px] font-bold">Jetons utilisateur pour le chat (intégration serveur)</h2>
        <p className="mt-1 text-[12px] leading-5 text-[#6c748d]">Cette étape n'est pas nécessaire pour le widget visiteur ci-dessus. Elle permet d'ouvrir le chat au nom d'un membre identifié, condition pour que Sabito consulte ses données via le serveur de la plateforme. Le secret client reste sur le serveur de la plateforme, jamais dans le script public. L'adresse ci-dessous est celle du dashboard actuellement ouvert.</p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-[#171d53] p-4 font-mono text-[11.5px] leading-6 text-[#dfe3ff]" data-testid="text-integration">{snippet}</pre>
      </section>
    </>
  );
}

function Knowledge({ projectId }: { projectId: string }) {
  const { headers } = useAdmin();
  const qc = useQueryClient();
  const key = ["sabito-admin", "knowledge", projectId];
  const q = useQuery({ queryKey: key, queryFn: () => listPlatformKnowledge(projectId, headers()), refetchInterval: 30_000, staleTime: 15_000 });
  const [edit, setEdit] = useState<PlatformDocument | "new" | null>(null);
  const del = useMutation({ mutationFn: (id: string) => removePlatformKnowledge(projectId, id, headers()), onSuccess: () => qc.invalidateQueries({ queryKey: key }) });
  const docs = q.data?.data ?? [];
  return (
    <section className={card}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-bold"><BookOpen size={16} />Références validées</h2>
        <button className={ghost} onClick={() => setEdit("new")} data-testid="button-add-doc"><Plus size={14} />Ajouter</button>
      </div>
      {q.isLoading && <div className="h-20 animate-pulse rounded-xl bg-[#f1f3ff]" />}
      {q.error && <ErrorBox msg={errMsg(q.error)} retry={() => void q.refetch()} />}
      {del.error && <ErrorBox msg={errMsg(del.error)} />}
      {!q.isLoading && !q.error && docs.length === 0 && <p className="rounded-xl bg-[#f6f7ff] p-4 text-[12px] text-[#6c748d]">Aucune référence. Sans documentation validée, Sabito indique qu'il ne connaît pas la réponse.</p>}
      <div className="divide-y divide-[#eef0fa]">
        {docs.map((d) => (
          <div key={d.id} className="flex items-start gap-3 py-3" data-testid={`row-doc-${d.id}`}>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">{d.title}{(d.variantes_de_question?.length ?? 0) > 0 && <span className="rounded-full bg-[#eef0ff] px-2 py-0.5 text-[10px] font-semibold text-[#3641f5]" title={d.variantes_de_question!.join("\n")} data-testid={`text-doc-variants-${d.id}`}>{d.variantes_de_question!.length} formulation{d.variantes_de_question!.length > 1 ? "s" : ""}</span>}</div>{(d.variantes_de_question?.length ?? 0) > 0 && <p className="mt-0.5 truncate text-[11px] italic text-[#8b92a8]">« {d.variantes_de_question![0]} »{d.variantes_de_question!.length > 1 ? ` +${d.variantes_de_question!.length - 1}` : ""}</p>}<p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[12px] text-[#6c748d]">{d.content}</p></div>
            <button className="p-1.5 text-[#737b94] hover:text-[#3641f5]" onClick={() => setEdit(d)} aria-label="Modifier" data-testid={`button-edit-doc-${d.id}`}><Pencil size={14} /></button>
            <button className="p-1.5 text-[#737b94] hover:text-[#b4441f]" disabled={del.isPending} onClick={() => { if (window.confirm(`Supprimer « ${d.title} » ?`)) del.mutate(d.id); }} aria-label="Supprimer" data-testid={`button-delete-doc-${d.id}`}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      {edit && <DocEditor projectId={projectId} doc={edit === "new" ? undefined : edit} close={() => setEdit(null)} />}
    </section>
  );
}

export function DocEditor({ projectId, doc, initial, close }: { projectId: string; doc?: PlatformDocument; initial?: { title: string; content: string }; close: () => void }) {
  const { headers } = useAdmin();
  const qc = useQueryClient();
  const [title, setTitle] = useState(doc?.title ?? initial?.title ?? "");
  const [content, setContent] = useState(doc?.content ?? initial?.content ?? "");
  const [variantsText, setVariantsText] = useState((doc?.variantes_de_question ?? []).join("\n"));
  const variants = variantsText.split("\n").map((v) => v.trim()).filter((v) => v.length > 0);
  const badVariant = variants.find((v) => v.length < 2 || v.length > 500);
  const tooMany = variants.length > 30;
  const contentTooLongForVariants = variants.length > 0 && content.length > 20000;
  const m = useMutation({
    mutationFn: () => {
      const body = { title, content, variantes_de_question: variants };
      return doc ? updatePlatformKnowledge(projectId, doc.id, body, headers()) : addPlatformKnowledge(projectId, body, headers());
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["sabito-admin", "knowledge", projectId] }); close(); },
  });
  const valid = title.trim().length >= 2 && title.length <= 255 && content.trim().length >= 20 && !badVariant && !tooMany && !contentTooLongForVariants;
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#11162b]/40 p-4">
      <form onSubmit={(e) => { e.preventDefault(); if (valid && !m.isPending) m.mutate(); }} className="max-h-[92dvh] w-full max-w-[600px] overflow-y-auto rounded-[22px] bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-[16px] font-bold">{doc ? "Modifier la référence" : "Nouvelle référence"}</h3><button type="button" onClick={close} aria-label="Fermer"><X size={17} /></button></div>
        <input className={input} placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-doc-title" />
        <div className="mt-3 flex items-center justify-between">
          <label className="text-[12px] font-semibold text-[#4a5270]" htmlFor="doc-variants">Formulations de la question <span className="font-normal text-[#8b92a8]">(optionnel, une par ligne)</span></label>
          {variants.length > 0 && <button type="button" className="text-[11px] font-medium text-[#737b94] hover:text-[#b4441f]" onClick={() => setVariantsText("")} data-testid="button-clear-variants">Tout effacer</button>}
        </div>
        <textarea id="doc-variants" className={`${input} mt-1 min-h-[96px]`} placeholder={"Comment accéder à mes formations ?\nOù voir mes cours ?"} value={variantsText} onChange={(e) => setVariantsText(e.target.value)} data-testid="input-doc-variants" />
        <p className={`mt-1 text-[11px] ${badVariant || tooMany ? "text-[#b4441f]" : "text-[#8b92a8]"}`} data-testid="text-variants-count">
          {variants.length} / 30 formulations{tooMany ? " · 30 maximum" : ""}{badVariant ? ` · « ${badVariant.slice(0, 40)}${badVariant.length > 40 ? "…" : ""} » doit faire entre 2 et 500 caractères` : ""}
        </p>
        <p className="mt-0.5 text-[11px] leading-4 text-[#8b92a8]">Les formulations approuvées sont reconnues à l'identique. Sabito rapproche aussi les questions proches par recherche classique : mots-clés, BM25, trigrammes et groupes de synonymes définis dans la configuration. Aucune inférence ni IA : ajoutez les tournures réellement utilisées.</p>
        <textarea className={`${input} mt-3 min-h-[200px]`} placeholder="Contenu validé (20 caractères minimum)" value={content} onChange={(e) => setContent(e.target.value)} data-testid="input-doc-content" />
        <p className={`mt-1 text-[11px] ${contentTooLongForVariants ? "text-[#b4441f]" : "text-[#8b92a8]"}`} data-testid="text-doc-length">
          {content.trim().length} caractères{variants.length > 0 ? " / 20 000 max avec des formulations" : ""}{contentTooLongForVariants ? " · une référence avec formulations est une réponse directe : raccourcissez-la ou retirez les formulations (les longues documentations restent possibles sans formulations)." : ""}
        </p>
        {m.error && <ErrorBox msg={errMsg(m.error)} />}
        <div className="mt-3 flex justify-end gap-2"><button type="button" className={ghost} onClick={close}>Annuler</button><button disabled={!valid || m.isPending} className={btn} data-testid="button-save-doc">{m.isPending ? "Enregistrement…" : "Enregistrer"}</button></div>
      </form>
    </div>
  );
}

function CredentialsModal({ name, c, close }: { name: string; c: PlatformCredentials; close: () => void }) {
  const copy = (v: string) => void navigator.clipboard?.writeText(v).catch(() => undefined);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#11162b]/50 p-4">
      <div className="w-full max-w-[520px] rounded-[22px] bg-white p-6 shadow-xl" data-testid="modal-credentials">
        <h3 className="text-[16px] font-bold">Identifiants de {name}</h3>
        <p className="mt-1 rounded-xl bg-[#fffaf0] p-3 text-[12px] text-[#7a5a12]">Ils ne seront affichés qu'une seule fois. Copie-les maintenant dans les variables serveur de la plateforme.</p>
        {([["SABITO_CLIENT_ID", c.clientId], ["SABITO_CLIENT_SECRET", c.clientSecret]] as const).map(([k, v]) => (
          <div key={k} className="mt-3">
            <div className="text-[11px] font-semibold text-[#4a5270]">{k}</div>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#f6f7ff] px-3 py-2"><code className="flex-1 break-all text-[12px]">{v}</code><button onClick={() => copy(v)} aria-label="Copier" className="text-[#3641f5]"><Copy size={14} /></button></div>
          </div>
        ))}
        <div className="mt-5 flex justify-end"><button className={btn} onClick={close} data-testid="button-close-credentials">J'ai copié les identifiants</button></div>
      </div>
    </div>
  );
}
