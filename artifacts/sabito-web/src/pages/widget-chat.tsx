import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import { getPlatformMessages } from "@workspace/api-client-react";
import { RotateCw, Send, X } from "lucide-react";
import { AnswerExtras, GreetingBubble } from "@/components/chat/AnswerExtras";
import { applyComplete, fromHistory, type ChatMsg, type CompleteEvent, type Greeting, type StartAck } from "@/components/chat/types";

type Msg = ChatMsg;
type Ack = { ok: boolean; data?: { conversationId: string; userMessageId: string; status: string; duplicate: boolean }; error?: { code?: string; message?: string } | string };
type Session = { access_token: string; expires_in: number; socket_path: string; external_user_id: string };
type Phase = "loading" | "ready" | "error" | "logged_out";

const REFRESH_MS = 50_000;
const LOAD_TIMEOUT_MS = 15_000;
const RENEW_MIN_MS = 5_000;
const RENEW_MAX_MS = 60_000;
const SOCKET_PATH = "/socket.io";

function validSession(s: Session | undefined): s is Session {
  return !!s && typeof s.access_token === "string" && s.access_token.length > 0
    && typeof s.external_user_id === "string" && s.external_user_id.length > 0
    && typeof s.expires_in === "number" && Number.isFinite(s.expires_in) && s.expires_in >= 1 && s.expires_in <= 900;
}

function parseParams() {
  const q = new URLSearchParams(window.location.search);
  let parentOrigin: string | null = null;
  try {
    const u = new URL(q.get("parentOrigin") ?? "");
    if ((u.protocol === "https:" || u.protocol === "http:") && u.origin === q.get("parentOrigin")) parentOrigin = u.origin;
  } catch { /* invalid */ }
  const channel = q.get("channel") ?? "";
  const color = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(q.get("color") ?? "") ? q.get("color")! : "#2f3bd6";
  return { parentOrigin, channel: /^[a-f0-9]{32}$/.test(channel) ? channel : "", title: (q.get("title") ?? "Sabito").slice(0, 60), color, product: (q.get("product") ?? "").slice(0, 64) };
}

export function WidgetChat() {
  const cfg = useMemo(parseParams, []);
  const embedded = window.parent !== window;
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [greeting, setGreeting] = useState<Greeting | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const userRef = useRef<string | null>(null);
  const convRef = useRef<string | null>(null);
  const genRef = useRef(0); // bumps on logout/identity change; stale events ignored
  const loggedOutRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const phaseRef = useRef<Phase>("loading"); phaseRef.current = phase;
  const renewRef = useRef({ last: 0, delay: RENEW_MIN_MS, timer: 0 as number | undefined });
  const expiryTimer = useRef<number | undefined>(undefined);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages]);

  const post = useCallback((msg: Record<string, unknown>) => {
    if (!cfg.parentOrigin || !embedded) return;
    window.parent.postMessage({ ...msg, channel: cfg.channel }, cfg.parentOrigin);
  }, [cfg, embedded]);

  const requestSession = useCallback(() => { if (!loggedOutRef.current) post({ type: "sabito:session-request" }); }, [post]);

  const teardown = useCallback(() => {
    genRef.current++;
    window.clearTimeout(expiryTimer.current);
    window.clearTimeout(renewRef.current.timer); renewRef.current.timer = undefined;
    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();
    socketRef.current = null;
    tokenRef.current = null;
    userRef.current = null;
    convRef.current = null;
    setMessages([]); setGreeting(null); setConnected(false); setSending(false); setInput("");
  }, []);

  const renewSoon = useCallback(() => {
    const r = renewRef.current;
    if (r.timer !== undefined || loggedOutRef.current) return;
    const wait = Math.max(0, r.last + r.delay - Date.now());
    r.timer = window.setTimeout(() => {
      r.timer = undefined; r.last = Date.now();
      r.delay = Math.min(RENEW_MAX_MS, r.delay * 2);
      requestSession();
    }, wait);
  }, [requestSession]);

  const connect = useCallback((sess: Session) => {
    const gen = genRef.current;
    // Establish over HTTPS first: Plesk/Passenger may reject WebSocket upgrades.
    // Socket.IO can then upgrade if supported, without making it a requirement.
    const s = io(window.location.origin, { path: SOCKET_PATH, auth: (cb) => cb({ token: tokenRef.current }), transports: ["polling", "websocket"] });
    socketRef.current = s;
    const live = () => gen === genRef.current && socketRef.current === s;
    s.on("connect", () => { if (live()) { setConnected(true); setError(""); renewRef.current.delay = RENEW_MIN_MS; } });
    s.on("disconnect", (reason) => { if (!live()) return; setConnected(false); if (reason === "io server disconnect") renewSoon(); });
    s.on("connect_error", () => { if (!live()) return; setConnected(false); setError("Connexion au serveur impossible, nouvelle tentative…"); renewSoon(); });
    const stale = (cid?: string) => !!cid && !!convRef.current && cid !== convRef.current;
    s.on("session:ready", async () => {
      const cid = convRef.current, t = tokenRef.current;
      if (!live() || !t) return;
      if (!cid) {
        s.timeout(15_000).emit("conversation:start", {}, (err: Error | null, ack?: StartAck) => {
          if (!live() || convRef.current) return;
          if (err || !ack?.ok || !ack.data) { setError("Impossible de démarrer la conversation."); return; }
          convRef.current = ack.data.conversationId;
          setGreeting({ conversationId: ack.data.conversationId, content: ack.data.greeting });
        });
        return;
      }
      try {
        const r = await getPlatformMessages(cid, { headers: { Authorization: `Bearer ${t}` } });
        if (!live()) return;
        if (convRef.current !== cid) return;
        setMessages(fromHistory(r.data));
      } catch { if (live()) setError("Historique de la conversation indisponible."); }
    });
    s.on("conversation:welcome", (e: { conversationId: string; content: string }) => {
      if (live() && e.conversationId && e.conversationId === convRef.current) setGreeting({ conversationId: e.conversationId, content: e.content });
    });
    s.on("message:started", (e: { conversationId?: string; messageId: string }) => { if (live() && !stale(e.conversationId)) setMessages((m) => m.some((x) => x.id === e.messageId) ? m : [...m, { id: e.messageId, role: "assistant", content: "", pending: true }]); });
    s.on("message:delta", (e: { conversationId?: string; messageId: string; delta: string }) => { if (live() && !stale(e.conversationId)) setMessages((m) => m.map((x) => x.id === e.messageId ? { ...x, content: x.content + e.delta } : x)); });
    s.on("message:complete", (e: CompleteEvent) => { if (live() && !stale(e.conversationId)) setMessages((m) => applyComplete(m, e)); });
    s.on("message:error", (e: { conversationId?: string; messageId: string; code: string }) => {
      if (!live() || stale(e.conversationId)) return;
      setMessages((m) => m.map((x) => x.id === e.messageId ? { ...x, pending: false, failed: e.code } : x));
      setError(`Réponse interrompue (${e.code}).`);
    });
  }, [renewSoon]);

  const onSession = useCallback((sess: Session) => {
    if (loggedOutRef.current || !validSession(sess)) return;
    if (userRef.current && userRef.current !== sess.external_user_id) teardown(); // identity replaced
    const fresh = !socketRef.current;
    tokenRef.current = sess.access_token;
    userRef.current = sess.external_user_id;
    setPhase("ready"); setError("");
    window.clearTimeout(expiryTimer.current);
    expiryTimer.current = window.setTimeout(requestSession, Math.max(1_000, Math.min(REFRESH_MS, sess.expires_in * 800)));
    if (fresh) connect(sess);
    else if (!socketRef.current!.connected) socketRef.current!.connect();
  }, [connect, teardown, requestSession]);

  // Parent handshake: exact origin + source + channel.
  useEffect(() => {
    if (!embedded || !cfg.parentOrigin || !cfg.channel) { setPhase("error"); setError("Ce chat doit être intégré via le script Sabito officiel."); return; }
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== cfg.parentOrigin || e.source !== window.parent) return;
      const d = e.data as { type?: string; channel?: string; session?: Session; code?: string; message?: string } | null;
      if (!d || typeof d !== "object" || d.channel !== cfg.channel) return;
      switch (d.type) {
        case "sabito:session": {
          const s = d.session;
          if (validSession(s)) onSession(s);
          else { teardown(); setPhase("error"); setError("Session invalide reçue."); }
          break;
        }
        case "sabito:error":
          if (d.code === "unauthenticated" || d.code === "logged_out") { teardown(); setPhase("logged_out"); }
          else { teardown(); setPhase("error"); setError(d.message || "Session indisponible."); } // fail closed
          break;
        case "sabito:logout": loggedOutRef.current = true; teardown(); setPhase("logged_out"); setError(""); break;
        case "sabito:login": loggedOutRef.current = false; setPhase("loading"); requestSession(); break;
        case "sabito:focus": window.setTimeout(() => inputRef.current?.focus(), 50); break;
      }
    };
    window.addEventListener("message", onMsg);
    requestSession();
    const loadTimer = window.setTimeout(() => {
      if (phaseRef.current === "loading") { setPhase("error"); setError("Le chargement de la session a expiré."); }
    }, LOAD_TIMEOUT_MS);
    const iv = window.setInterval(requestSession, REFRESH_MS);
    const vis = () => { if (document.visibilityState === "visible") requestSession(); };
    document.addEventListener("visibilitychange", vis);
    return () => { window.clearTimeout(loadTimer); window.removeEventListener("message", onMsg); window.clearInterval(iv); document.removeEventListener("visibilitychange", vis); teardown(); };
  }, [cfg, embedded, onSession, requestSession, teardown]);

  const retry = () => {
    setError(""); setPhase("loading"); renewRef.current.delay = RENEW_MIN_MS; requestSession();
    window.setTimeout(() => { if (phaseRef.current === "loading") { setPhase("error"); setError("Le chargement de la session a expiré."); } }, LOAD_TIMEOUT_MS);
  };

  const send = (e?: FormEvent, picked?: string, followUpId?: string) => {
    e?.preventDefault();
    const content = (picked ?? input).trim(); const s = socketRef.current; const gen = genRef.current;
    if (!content || !s || !connected || sending || phaseRef.current !== "ready") return;
    const localId = `local-${crypto.randomUUID()}`;
    setMessages((m) => [...m, { id: localId, role: "user", content, pending: true }]);
    if (picked === undefined) setInput(""); setSending(true); setError("");
    s.timeout(15_000).emit("message:send", { ...(convRef.current ? { conversationId: convRef.current } : {}), idempotencyKey: crypto.randomUUID(), content, ...(followUpId !== undefined ? { follow_up_id: followUpId } : {}) }, (err: Error | null, ack?: Ack) => {
      if (gen !== genRef.current) return;
      setSending(false);
      if (err || !ack?.ok || !ack.data) {
        const msg = err ? "Délai dépassé, aucune confirmation du serveur." : typeof ack?.error === "string" ? ack.error : ack?.error?.message ?? ack?.error?.code ?? "Envoi refusé.";
        setMessages((m) => m.map((x) => x.id === localId ? { ...x, pending: false, failed: msg } : x));
        setError(msg); return;
      }
      convRef.current = ack.data.conversationId;
      const uid = ack.data.userMessageId;
      setMessages((m) => m.map((x) => x.id === localId ? { ...x, id: uid, pending: false } : x));
    });
  };

  const accent = cfg.color;
  return (
    <main className="flex h-[100dvh] flex-col bg-[#f6f4ee] font-['Outfit',sans-serif] text-[#1a1d2e]" style={{ ["--acc" as string]: accent }}>
      <header className="flex items-center justify-between gap-3 px-4 py-3 text-[#fbfaf6]" style={{ background: accent }}>
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">{cfg.title}</h1>
          <p className="flex items-center gap-1.5 text-[11px] opacity-85" aria-live="polite">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-[#7ee2a8]" : "bg-[#f2b84b]"}`} />
            {phase === "logged_out" ? "Déconnecté" : connected ? "En ligne" : phase === "loading" ? "Connexion…" : "Hors ligne"}
            {cfg.product && <span className="opacity-80">· {cfg.product}</span>}
          </p>
        </div>
        <button type="button" onClick={() => post({ type: "sabito:close" })} aria-label="Fermer le chat" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2b84b]" data-testid="button-widget-close"><X size={18} /></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5" aria-live="polite" aria-busy={phase === "loading"}>
        {phase === "loading" && (
          <div className="space-y-3" aria-label="Chargement">
            {[70, 45, 60].map((w, i) => <div key={i} className="h-10 animate-pulse rounded-2xl bg-[#e7e3d8]" style={{ width: `${w}%`, marginLeft: i % 2 ? "auto" : 0 }} />)}
          </div>
        )}
        {phase === "logged_out" && (
          <div className="mt-10 rounded-[20px] border border-[#e4dfd1] bg-[#fbfaf6] p-6 text-center text-[13px] leading-6 text-[#5d6072]">
            <p className="font-semibold text-[#1a1d2e]">Vous êtes déconnecté.</p>
            <p>Connectez-vous à votre espace pour discuter avec l'assistant.</p>
          </div>
        )}
        {phase === "error" && (
          <div role="alert" className="mt-10 rounded-[20px] border border-[#ecd0c4] bg-[#fdf5f1] p-6 text-center text-[13px] text-[#8a3417]">
            <p>{error || "Une erreur est survenue."}</p>
            {embedded && cfg.parentOrigin && <button onClick={retry} className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium text-[#fbfaf6]" style={{ background: accent }} data-testid="button-widget-retry"><RotateCw size={13} />Réessayer</button>}
          </div>
        )}
        {phase === "ready" && greeting && greeting.conversationId === convRef.current && (
          <div className="mb-4 max-w-[90%]">
            <GreetingBubble content={greeting.content} className="rounded-[18px] rounded-bl-[5px] border border-[#e4dfd1] bg-[#fbfaf6] px-4 py-2.5 text-[13px] leading-[1.7] text-[#2c2f40]" />
          </div>
        )}
        {phase === "ready" && messages.length === 0 && !greeting && (
          <div className="rounded-[20px] border border-[#e4dfd1] bg-[#fbfaf6] p-5 text-[13px] leading-6 text-[#5d6072]">Bonjour. Posez votre question, l'assistant répond à partir des informations validées.</div>
        )}
        {phase === "ready" && messages.map((m) => m.role === "user" ? (
          <div key={m.id} className="mb-4 flex flex-col items-end">
            <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] rounded-br-[5px] px-4 py-2.5 text-[13px] text-[#fbfaf6] ${m.pending ? "opacity-70" : ""}`} style={{ background: m.failed ? "#a3401c" : accent }}>{m.content}</div>
            {m.failed && <span className="mt-1 text-[10px] text-[#a3401c]">Non envoyé : {m.failed}</span>}
          </div>
        ) : (
          <div key={m.id} className="mb-4 max-w-[90%]">
            <div className="whitespace-pre-wrap break-words rounded-[18px] rounded-bl-[5px] border border-[#e4dfd1] bg-[#fbfaf6] px-4 py-2.5 text-[13px] leading-[1.7] text-[#2c2f40]">{m.content || (m.pending ? "Rédaction de la réponse…" : "")}</div>
            {m.failed && <p className="mt-1 text-[11px] text-[#a3401c]">Erreur : {m.failed}</p>}
            <AnswerExtras m={m} tone="widget" accent={accent} disabled={!connected || sending || phase !== "ready"} onPick={(q, fid) => send(undefined, q, fid)} />
          </div>
        ))}
        {phase === "ready" && error && (
          <div role="alert" className="flex items-center justify-between gap-2 rounded-xl border border-[#ecd0c4] bg-[#fdf5f1] p-3 text-[12px] text-[#8a3417]">
            <span>{error}</span><button onClick={retry} className="shrink-0 underline">Réessayer</button>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="border-t border-[#e4dfd1] bg-[#fbfaf6] p-3">
        <label htmlFor="widget-input" className="sr-only">Votre message</label>
        <div className="flex items-end gap-2 rounded-[16px] border border-[#ddd8ca] bg-white/60 p-1.5 focus-within:border-[color:var(--acc)]">
          <textarea id="widget-input" ref={inputRef} rows={1} maxLength={4000} value={input} disabled={phase !== "ready"}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={phase === "ready" ? "Écrivez votre message…" : "Chat indisponible"}
            className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[14px] outline-none disabled:opacity-60" data-testid="input-widget-chat" />
          <button type="submit" disabled={!input.trim() || !connected || sending || phase !== "ready"} aria-label="Envoyer le message" className="grid h-10 w-10 place-items-center rounded-[12px] text-[#fbfaf6] disabled:opacity-40" style={{ background: accent }} data-testid="button-widget-send"><Send size={15} /></button>
        </div>
      </form>
    </main>
  );
}

export default WidgetChat;
