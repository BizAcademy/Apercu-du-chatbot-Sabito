import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSabitoTest } from "@/hooks/use-sabito-test";
import { CorrectionDialog, KnowledgeDialog, type CorrectionDraft } from "@/components/sabito-knowledge";
import {
  ArrowUpRight,
  AudioLines,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  X,
} from "lucide-react";

const suggestions = [
  "Comment fonctionne le parrainage ?",
  "Créer ma boutique",
  "Protéger mon compte",
];

export function SabitoChat() {
  const { messages, setMessages, knowledge, busy, saving, ready, error, send, save, remove, refresh } = useSabitoTest();
  const [draft, setDraft] = useState<CorrectionDraft | null>(null);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeHistory, setActiveHistory] = useState("Bien démarrer sur BCA");

  const filteredHistory = useMemo(
    () =>
      (messages.length ? [{ title: messages.find(m => m.role === "user")?.content.slice(0, 35) ?? "Test BCA", time: "Session de test" }] : []).filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, messages],
  );

  const startNewChat = () => {
    if (busy) return;
    setMessages([]);
    setActiveHistory("Nouvelle conversation");
    setInput("");
  };

  const sendMessage = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    if (busy || !ready || trimmed.length > 4000) return;
    void send(trimmed);
    setInput("");
    setActiveHistory(trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed);
  };

  const selectSuggestion = (suggestion: string) => setInput(suggestion);

  const copyAnswer = async (content: string) => {
    try {
      await navigator.clipboard.writeText(
        content,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Sélectionne le texte de la réponse pour le copier.");
      window.setTimeout(() => setNotice(""), 2400);
    }
  };

  return (
    <main className="h-[100dvh] bg-[#f1f3ff] p-4 font-['Outfit',sans-serif] text-[#11162b] md:p-6">
      <div className="mx-auto flex h-full min-h-0 max-w-[1440px] overflow-hidden rounded-[28px] border border-[#e0e4fb] bg-white shadow-[0_24px_80px_rgba(48,59,153,0.12)]">
        <aside className="relative hidden w-[278px] shrink-0 flex-col overflow-hidden bg-[#171d53] text-white lg:flex">
          <div className="pointer-events-none absolute -right-24 -top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-14 -top-10 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3 px-6 pb-7 pt-7">
            <div className="relative grid h-11 w-11 place-items-center rounded-[15px] bg-gradient-to-br from-[#7881ff] to-[#4855f6] shadow-[0_8px_20px_rgba(70,95,255,.32)]">
              <span className="text-[19px] font-extrabold tracking-[-1.5px]">S</span>
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-[2.5px] border-[#171d53] bg-[#58d99a]" />
            </div>
            <div>
              <div className="text-[19px] font-bold tracking-[-.5px]">sabito</div>
              <div className="mt-[-2px] text-[10px] font-medium tracking-[1.5px] text-[#aeb5e8]">GUIDE BCA</div>
            </div>
          </div>

          <div className="relative px-4">
            <button
              onClick={startNewChat}
              className="group flex w-full items-center justify-center gap-2 rounded-[13px] bg-[#f2f3ff] px-4 py-3 text-[13px] font-semibold text-[#1c245f] transition hover:-translate-y-0.5 hover:bg-white"
            >
              <Plus size={16} strokeWidth={2.5} />
              Nouvelle conversation
            </button>
          </div>

          <div className="relative mt-8 px-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[1.6px] text-[#939bd0]">Récent</span>
              <button
                aria-label="Plus d’options pour l’historique"
                onClick={() => setNotice("Ton historique est enregistré sur cet appareil.")}
                className="rounded-md p-1 text-[#aab0d9] transition hover:bg-white/10 hover:text-white"
              >
                <MoreHorizontal size={17} />
              </button>
            </div>
            <label className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[.06] px-3 py-2.5 text-[#aeb5e8] focus-within:border-[#8b93ff]/70">
              <Search size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher"
                className="w-full bg-transparent text-[12px] text-white outline-none placeholder:text-[#969dc9]"
              />
            </label>
          </div>

          <div className="relative mt-3 space-y-1 px-3">
            {filteredHistory.map((item) => {
              const active = activeHistory === item.title;
              return (
                <button
                  key={item.title}
                  onClick={() => {
                    setActiveHistory(item.title);
                    setNotice(`Conversation « ${item.title} » sélectionnée.`);
                    window.setTimeout(() => setNotice(""), 2200);
                  }}
                  className={`flex w-full items-start gap-3 rounded-[11px] px-3 py-3 text-left transition ${
                    active
                      ? "bg-white/[.12] text-white"
                      : "text-[#b2b8dd] hover:bg-white/[.07] hover:text-white"
                  }`}
                >
                  <MessageCircle size={15} className="mt-0.5 shrink-0 opacity-70" />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium">{item.title}</span>
                    <span className="mt-1 block text-[10px] text-[#939bc9]">{item.time}</span>
                  </span>
                </button>
              );
            })}
            {filteredHistory.length === 0 && (
              <p className="px-3 py-5 text-[12px] text-[#aeb5e8]">Aucune conversation trouvée.</p>
            )}
          </div>

          <div className="relative mt-auto p-4">
            <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#222b70] p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#414fe3] text-[#dce0ff]">
                  <BookOpen size={14} />
                </span>
                <span className="text-[12px] font-semibold">Un guide, pas un bot</span>
              </div>
              <p className="text-[11px] leading-[1.6] text-[#c0c6eb]">
                Des réponses utiles pour avancer sereinement dans ton parcours BCA.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-medium text-[#a9f0cc]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#46d78d]" />
                  Test IA · Sans données de compte
              </div>
            </div>
            <button
              onClick={() => setNotice("Le centre d’aide BCA est prêt à vous accompagner.")}
              className="mt-3 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-[12px] text-[#c2c8e7] transition hover:bg-white/[.07] hover:text-white"
            >
              <CircleHelp size={16} />
              Centre d’aide
              <ArrowUpRight size={13} className="ml-auto opacity-60" />
            </button>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fcfcff]">
          <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#ebedfa] bg-white px-5 md:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setNotice("Menu de navigation")}
                aria-label="Ouvrir le menu"
                className="grid h-9 w-9 place-items-center rounded-xl text-[#646b84] transition hover:bg-[#f2f3ff] lg:hidden"
              >
                <Menu size={19} />
              </button>
              <div className="relative grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-[#4e5af8] to-[#3039d8] text-white shadow-[0_5px_12px_rgba(54,65,245,.2)]">
                <Sparkles size={19} />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#12b76a]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[15px] font-bold tracking-[-.2px]">Sabito</h1>
                  <span className="rounded-full border border-[#e2e5ff] bg-[#f4f5ff] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.8px] text-[#4651d9]">Guide BCA</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#76809a]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />
                  {ready ? "Espace de test BCA · Références validées" : "Connexion au serveur…"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-[#d9f1e4] bg-[#f1fbf5] px-3 py-2 text-[10px] font-semibold text-[#178954] sm:flex">
                <BadgeCheck size={14} />
                Test & corrections
              </div>
              <button
                onClick={() => { void refresh(); setKnowledgeOpen(true); }}
                aria-label="Corrections validées"
                className="grid h-9 w-9 place-items-center rounded-xl text-[#737b94] transition hover:bg-[#f2f3ff] hover:text-[#3641f5]"
              >
                <BookOpen size={19} /><span className="sr-only">Corrections validées</span>
              </button>
            </div>
          </header>

          <div className="relative min-h-0 flex-1 overflow-y-auto">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(81,93,255,0.055),transparent_68%)]" />
            <div className="relative mx-auto max-w-[820px] px-5 pb-8 pt-8 md:px-10 md:pt-9">
              <div className="mb-8 flex items-center justify-center gap-3 text-[10px] font-medium text-[#939ab0]">
                <span className="h-px w-10 bg-[#e6e8f4]" />
                ESPACE DE TEST · BCA
                <span className="h-px w-10 bg-[#e6e8f4]" />
              </div>

              {messages.length === 0 ? (
                <div className="mb-8 rounded-[22px] border border-[#e8eaff] bg-white p-7 shadow-[0_6px_24px_rgba(48,59,153,.045)]">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#eef0ff] text-[#4651e8]">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="text-[23px] font-semibold tracking-[-.65px]">Bonjour, je suis Sabito.</h2>
                  <p className="mt-2 max-w-lg text-[13px] leading-6 text-[#6c748d]">
                    Pose une question pour tester Sabito, puis corrige sa réponse pour enrichir les références BCA. Sans documentation validée, Sabito signalera les informations qui lui manquent.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => selectSuggestion(suggestion)}
                        className="rounded-full border border-[#e3e6f8] bg-white px-3.5 py-2 text-[11px] font-medium text-[#48506a] transition hover:border-[#abb1ff] hover:bg-[#f5f6ff] hover:text-[#3641f5]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) =>
                    message.role === "user" ? (
                      <div key={`${index}-${message.content}`} className="mb-6 flex justify-end">
                        <div className="max-w-[76%] rounded-[18px] rounded-br-[5px] bg-[#3641f5] px-5 py-3.5 text-[13px] leading-[1.65] text-white shadow-[0_7px_16px_rgba(54,65,245,.14)]">
                          {message.content}
                        </div>
                      </div>
                    ) : (
                      <div key={`${index}-${message.content}`} className="mb-6 flex items-start gap-3.5">
                        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-[#4e5af8] to-[#3039d8] text-white">
                          <Sparkles size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-[12px] font-bold text-[#171c37]">Sabito</span>
                            <span className="text-[10px] text-[#a1a7b9]">{message.source === "correction" ? "Référence validée" : "Réponse IA à vérifier"}</span>
                          </div>
                          <p className="max-w-[690px] whitespace-pre-wrap text-[13px] leading-[1.8] text-[#555e78]">{message.content}</p>
                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#3641f5]">
                            <button onClick={() => void copyAnswer(message.content)}>{copied ? "Copié" : "Copier la réponse"}</button>
                            <button disabled={saving || busy || !ready} onClick={() => setDraft({ question: messages.slice(0, index).reverse().find(m => m.role === "user")?.content ?? "", answer: message.content, messageIndex: index })}>Corriger la réponse</button>
                          </div>
                        </div>
                      </div>
                    ),
                  )}

                </>
              )}
              {busy && <p role="status" className="py-3 text-sm text-[#3641f5]">Sabito prépare sa réponse…</p>}
              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
                <button className="ml-3 underline" disabled={busy} onClick={() => ready && messages.at(-1)?.role === "user" ? void send(messages.at(-1)!.content, true) : void refresh()}>Réessayer</button>
              </div>}
              <div ref={bottom} />
            </div>
          </div>

          <div className="shrink-0 border-t border-[#eceefa] bg-white px-5 pb-5 pt-4 md:px-10">
            <div className="mx-auto max-w-[820px]">
              {messages.length > 0 && (
                <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-0.5">
                  <span className="shrink-0 text-[10px] font-medium text-[#9aa0b1]">À explorer</span>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => selectSuggestion(suggestion)}
                      className="shrink-0 rounded-full border border-[#e8eaf4] bg-[#fcfcff] px-3 py-1.5 text-[10px] font-medium text-[#68708a] transition hover:border-[#bec3ff] hover:bg-[#f5f6ff] hover:text-[#3641f5]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={sendMessage} className="rounded-[17px] border border-[#dfe2ef] bg-white p-2 shadow-[0_6px_25px_rgba(44,53,118,.07)] transition focus-within:border-[#9da5ff] focus-within:shadow-[0_7px_28px_rgba(54,65,245,.12)]">
                <textarea
                  maxLength={1000}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                  placeholder="Pose ta question à Sabito…"
                  className="max-h-24 min-h-[42px] w-full resize-none bg-transparent px-3 py-2.5 text-[13px] leading-5 text-[#252b43] outline-none placeholder:text-[#a1a7b7]"
                />
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setNotice("Ajout de pièce jointe indisponible dans cette démo.")} aria-label="Joindre un fichier" className="grid h-8 w-8 place-items-center rounded-[10px] text-[#9299ac] transition hover:bg-[#f3f4fa] hover:text-[#3641f5]">
                      <Plus size={17} />
                    </button>
                    <span className="hidden text-[10px] text-[#a3a9b8] sm:block">Sabito peut faire des erreurs. Vérifie les informations importantes.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNotice("La saisie vocale n’est pas encore disponible.");
                        window.setTimeout(() => setNotice(""), 1800);
                      }}
                      aria-label="Saisie vocale"
                      className={`grid h-8 w-8 place-items-center rounded-[10px] transition ${voiceActive ? "bg-[#edf0ff] text-[#3641f5]" : "text-[#9299ac] hover:bg-[#f3f4fa] hover:text-[#3641f5]"}`}
                    >
                      <AudioLines size={16} />
                    </button>
                    <button
                      type="submit"
                      aria-label="Envoyer le message"
                      disabled={!input.trim() || busy || !ready}
                      className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#3641f5] text-white shadow-[0_4px_10px_rgba(54,65,245,.2)] transition hover:-translate-y-0.5 hover:bg-[#2934dc] disabled:cursor-not-allowed disabled:bg-[#c8cbea] disabled:shadow-none"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              </form>
              {notice && (
                <div className="fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#20264f] px-4 py-2.5 text-[11px] font-medium text-white shadow-lg">
                  <Check size={14} className="text-[#6be0a2]" />
                  {notice}
                  <button onClick={() => setNotice("")} aria-label="Fermer" className="ml-1 text-white/60 hover:text-white"><X size={13} /></button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      {draft && <CorrectionDialog key={`${draft.messageIndex ?? "reference"}-${draft.question}`} draft={draft} close={() => setDraft(null)} save={save} saving={saving} error={error} />}
      <KnowledgeDialog open={knowledgeOpen} close={() => setKnowledgeOpen(false)} entries={knowledge} edit={entry => { setKnowledgeOpen(false); setDraft({ question: entry.question, answer: entry.answer }); }} remove={remove} saving={saving} error={error} />
    </main>
  );
}
