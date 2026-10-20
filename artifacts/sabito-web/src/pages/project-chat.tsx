import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { io, type Socket } from "socket.io-client";
import { createPlatformTestToken, getPlatformMessages, listSabitoProjects } from "@workspace/api-client-react";
import { ArrowLeft, Plus, Send, Sparkles } from "lucide-react";
import { errMsg, useAdmin } from "@/lib/admin";
import { AdminDashboard, DocEditor } from "@/pages/admin-dashboard";
import { GreetingBubble } from "@/components/chat/AnswerExtras";
import { AssistantAnswer } from "@/components/chat/AssistantAnswer";
import { applyComplete, fromHistory, type ChatMsg, type CompleteEvent, type Greeting, type StartAck } from "@/components/chat/types";

type Msg = ChatMsg;
type Ack = { ok: boolean; data?: { conversationId: string; userMessageId: string; status: string; duplicate: boolean }; error?: { code?: string; message?: string } | string };
const convKey = (pid: string) => `sabito:conversation:${pid}`;

export function ProjectChat() {
  const { adminKey } = useAdmin();
  if (!adminKey) return <AdminDashboard />;
  return <ChatInner />;
}

function ChatInner() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const { headers, onLogout } = useAdmin();
  const projects = useQuery({ queryKey: ["sabito-admin", "projects"], queryFn: () => listSabitoProjects(headers()), staleTime: 15_000 });
  const project = projects.data?.data.find((p) => p.id === projectId);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(() => localStorage.getItem(convKey(projectId)));
  const [greeting, setGreeting] = useState<Greeting | null>(null);
  const convRef = useRef<string | null>(conversationId); convRef.current = conversationId;
  const startGen = useRef(0);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [correction, setCorrection] = useState<{ title: string; content: string; variants?: string[] } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<{ token: string; exp: number } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const headersRef = useRef(headers); headersRef.current = headers;
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages]);

  const fetchToken = useCallback(async () => {
    const r = await createPlatformTestToken(projectId, headersRef.current());
    tokenRef.current = { token: r.data.access_token, exp: Date.now() + r.data.expires_in * 1000 };
    return r.data;
  }, [projectId]);

  const hydrate = useCallback(async (cid: string) => {
    const t = tokenRef.current?.token; if (!t) return;
    try {
      const r = await getPlatformMessages(cid, { headers: { Authorization: `Bearer ${t}` } });
      if (convRef.current !== cid) return;
      setMessages(fromHistory(r.data));
    } catch (e) { setError(`Historique indisponible : ${errMsg(e)}`); }
  }, []);

  const startConversation = useCallback(() => {
    const s = socketRef.current; const gen = startGen.current;
    if (!s || convRef.current) return;
    s.timeout(15_000).emit("conversation:start", {}, (err: Error | null, ack?: StartAck) => {
      if (gen !== startGen.current || convRef.current) return;
      if (err || !ack?.ok || !ack.data) { setError("Impossible de démarrer la conversation."); return; }
      const d = ack.data;
      convRef.current = d.conversationId; convRef.current = d.conversationId; setConversationId(d.conversationId); localStorage.setItem(convKey(projectId), d.conversationId);
      setGreeting({ conversationId: d.conversationId, content: d.greeting });
    });
  }, [projectId]);
  const startRef = useRef(startConversation); startRef.current = startConversation;

  useEffect(() => {
    let disposed = false;
    let retryTimer: number | undefined;
    let renewing = false;
    const connect = async () => {
      try {
        const data = await fetchToken();
        if (disposed) return;
        // Plesk can reject WebSocket upgrades: connect over HTTPS polling first,
        // just like the embedded widget, and only upgrade when supported.
        const s = io(window.location.origin, { path: data.socket_path || "/socket.io", auth: (cb) => cb({ token: tokenRef.current?.token }), transports: ["polling", "websocket"] });
        socketRef.current = s;
        const schedule = () => {
          window.clearTimeout(timerRef.current);
          const ms = Math.max(5_000, (tokenRef.current?.exp ?? 0) - Date.now() - 60_000);
          timerRef.current = window.setTimeout(() => {
            void fetchToken().then(() => {
              if (disposed) return;
              s.disconnect();
              s.connect();
              schedule();
            }).catch((e) => { if (!disposed) setError(`Renouvellement du jeton impossible : ${errMsg(e)}`); });
          }, ms);
        };
        const renewConnection = () => {
          if (disposed || renewing || retryTimer !== undefined) return;
          retryTimer = window.setTimeout(() => {
            retryTimer = undefined;
            renewing = true;
            void fetchToken().then(() => {
              if (disposed) return;
              schedule();
              if (!s.connected) s.connect();
            }).catch((e) => { if (!disposed) setError(`Connexion refusée : ${errMsg(e)}`); })
              .finally(() => { renewing = false; });
          }, 2000);
        };
        schedule();
        s.on("connect", () => { setConnected(true); setError(""); });
        s.on("disconnect", (reason) => {
          setConnected(false);
          if (reason === "io server disconnect") renewConnection();
        });
        s.on("connect_error", () => {
          setConnected(false);
          setError("Connexion au serveur impossible. Nouvelle tentative automatique…");
          renewConnection();
        });
        s.on("session:ready", () => { const cid = convRef.current; if (cid) void hydrate(cid); else startRef.current(); });
        s.on("conversation:welcome", (e: { conversationId: string; content: string }) => {
          if (e.conversationId && e.conversationId === convRef.current) setGreeting({ conversationId: e.conversationId, content: e.content });
        });
        const stale = (cid?: string) => !!cid && !!convRef.current && cid !== convRef.current;
        s.on("message:started", (e: { conversationId: string; messageId: string }) => {
          if (stale(e.conversationId)) return;
          setMessages((m) => m.some((x) => x.id === e.messageId) ? m : [...m, { id: e.messageId, role: "assistant", content: "", pending: true, animate: true }]);
        });
        s.on("message:delta", (e: { conversationId?: string; messageId: string; delta: string }) => !stale(e.conversationId) && setMessages((m) => m.map((x) => x.id === e.messageId ? { ...x, content: x.content + e.delta } : x)));
        s.on("message:complete", (e: CompleteEvent) => { if (!stale(e.conversationId)) setMessages((m) => applyComplete(m, e)); });
        s.on("message:error", (e: { conversationId?: string; messageId: string; code: string }) => {
          if (stale(e.conversationId)) return;
          setMessages((m) => m.map((x) => x.id === e.messageId ? { ...x, pending: false, failed: e.code } : x));
          setError(`Réponse interrompue (${e.code}).`);
        });
      } catch (e) { if (!disposed) setError(`Jeton de test indisponible : ${errMsg(e)}`); }
    };
    void connect();
    const off = onLogout(() => { socketRef.current?.disconnect(); });
    return () => { disposed = true; off(); window.clearTimeout(timerRef.current); window.clearTimeout(retryTimer); socketRef.current?.disconnect(); socketRef.current = null; tokenRef.current = null; };
  }, [projectId, fetchToken, hydrate, onLogout]);

  const send = (e?: FormEvent, picked?: string, followUpId?: string) => {
    e?.preventDefault();
    const content = (picked ?? input).trim(); const s = socketRef.current;
    if (!content || !s || !connected || sending) return;
    const localId = `local-${crypto.randomUUID()}`;
    setMessages((m) => [...m, { id: localId, role: "user", content, pending: true }]);
    if (picked === undefined) setInput(""); setSending(true); setError("");
    const cid = convRef.current;
    s.timeout(15_000).emit("message:send", { ...(cid ? { conversationId: cid } : {}), idempotencyKey: crypto.randomUUID(), content, ...(followUpId !== undefined ? { follow_up_id: followUpId } : {}) }, (err: Error | null, ack?: Ack) => {
      setSending(false);
      if (err || !ack?.ok || !ack.data) {
        const msg = err ? "Délai dépassé, aucune confirmation du serveur." : typeof ack?.error === "string" ? ack.error : ack?.error?.message ?? ack?.error?.code ?? "Envoi refusé.";
        setMessages((m) => m.map((x) => x.id === localId ? { ...x, pending: false, failed: msg } : x));
        setError(msg); return;
      }
      const d = ack.data;
      convRef.current = d.conversationId; setConversationId(d.conversationId); localStorage.setItem(convKey(projectId), d.conversationId);
      setMessages((m) => m.map((x) => x.id === localId ? { ...x, id: d.userMessageId, pending: false } : x));
    });
  };

  const reset = () => {
    startGen.current++; localStorage.removeItem(convKey(projectId));
    convRef.current = null; setConversationId(null); setGreeting(null); setMessages([]); setError("");
    if (connected) startConversation();
  };
  const correct = (i: number) => {
    const q = messages.slice(0, i).reverse().find((m) => m.role === "user")?.content ?? "";
    const question = q.trim().slice(0, 500);
    setCorrection({ title: q.slice(0, 255), content: messages[i].content, variants: question.length >= 2 ? [question] : [] });
  };

  return (
    <main className="flex h-[100dvh] flex-col bg-[#f1f3ff] p-3 font-['Outfit',sans-serif] text-[#11162b] md:p-6">
      <div className="mx-auto flex min-h-0 w-full max-w-[960px] flex-1 flex-col overflow-hidden rounded-[26px] border border-[#e0e4fb] bg-white shadow-[0_24px_80px_rgba(48,59,153,0.12)]">
        <header className="flex items-center justify-between border-b border-[#ebedfa] px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="grid h-9 w-9 place-items-center rounded-xl text-[#646b84] hover:bg-[#f2f3ff]" aria-label="Retour" data-testid="link-back"><ArrowLeft size={18} /></Link>
            <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-[#4e5af8] to-[#3039d8] text-white"><Sparkles size={18} /></div>
            <div>
              <h1 className="text-[15px] font-bold">{project?.assistantName ?? "Sabito"} <span className="font-normal text-[#76809a]">· {project?.name ?? projectId}</span></h1>
              <div className="flex items-center gap-1.5 text-[11px] text-[#76809a]" data-testid="status-realtime"><span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-[#12b76a]" : "bg-[#d0a12b]"}`} />{connected ? "Temps réel connecté" : "Temps réel déconnecté"} · Chat de test</div>
            </div>
          </div>
          <button onClick={reset} disabled={sending} className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3e6f8] px-3 py-2 text-[12px] font-medium text-[#48506a] hover:text-[#3641f5]" data-testid="button-new-conversation"><Plus size={14} />Nouvelle conversation</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          {greeting && greeting.conversationId === conversationId && (
            <div className="mb-5 flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-[#4e5af8] to-[#3039d8] text-white"><Sparkles size={14} /></div>
              <GreetingBubble content={greeting.content} className="min-w-0 flex-1 text-[13px] leading-[1.75] text-[#3d4560]" />
            </div>
          )}
          {messages.length === 0 && !greeting && <div className="mx-auto max-w-lg rounded-[20px] border border-[#e8eaff] p-6 text-[13px] leading-6 text-[#6c748d]">Pose une question. Sabito répond uniquement à partir des références validées de cette plateforme. Corrige une réponse pour l'ajouter à la base de connaissances.</div>}
          {messages.map((m, i) => m.role === "user" ? (
            <div key={m.id} className="mb-5 flex flex-col items-end">
              <div className={`max-w-[78%] whitespace-pre-wrap rounded-[18px] rounded-br-[5px] px-4 py-3 text-[13px] text-white ${m.failed ? "bg-[#b4441f]" : "bg-[#3641f5]"} ${m.pending ? "opacity-70" : ""}`}>{m.content}</div>
              {m.pending && <span className="mt-1 text-[10px] text-[#8b92a8]">Envoi…</span>}
              {m.failed && <span className="mt-1 text-[10px] text-[#b4441f]">Non envoyé : {m.failed}</span>}
            </div>
          ) : (
            <div key={m.id} className="mb-5 flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-[#4e5af8] to-[#3039d8] text-white"><Sparkles size={14} /></div>
              <div className="min-w-0 flex-1">
                <AssistantAnswer m={m} className="whitespace-pre-wrap text-[13px] leading-[1.75] text-[#3d4560]" placeholder="Sabito prépare sa réponse…" disabled={!connected || sending} onPick={(q, fid) => send(undefined, q, fid)} />
                {m.failed && <p className="text-[11px] text-[#b4441f]">Erreur : {m.failed}</p>}
                {!m.pending && m.content && <button className="mt-2 text-[12px] text-[#3641f5]" onClick={() => correct(i)} data-testid={`button-correct-${m.id}`}>Corriger la réponse</button>}
              </div>
            </div>
          ))}
          {error && <div role="alert" className="rounded-xl border border-[#f3d2d2] bg-[#fff6f6] p-3 text-[12px] text-[#9b2c2c]" data-testid="text-chat-error">{error}</div>}
          <div ref={bottom} />
        </div>
        <form onSubmit={send} className="border-t border-[#eceefa] p-4">
          <div className="flex items-end gap-2 rounded-[16px] border border-[#dfe2ef] p-2 focus-within:border-[#9da5ff]">
            <textarea rows={1} maxLength={4000} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Pose ta question…" className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[13px] outline-none" data-testid="input-chat" />
            <button disabled={!input.trim() || !connected || sending} className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#3641f5] text-white disabled:bg-[#c8cbea]" aria-label="Envoyer" data-testid="button-send"><Send size={15} /></button>
          </div>
        </form>
      </div>
      {correction && <DocEditor projectId={projectId} initial={correction} close={() => setCorrection(null)} />}
    </main>
  );
}
