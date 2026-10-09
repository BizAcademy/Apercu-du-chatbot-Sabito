import { useEffect, useRef, useState } from "react";
import { askSabito, listSabitoKnowledge, saveSabitoKnowledge, deleteSabitoKnowledge, type KnowledgeEntry } from "@workspace/api-client-react";

export type TestMessage = { role: "user" | "assistant"; content: string; source?: string };
const options = { headers: { "X-Sabito-Preview": "1" }, credentials: "same-origin" as const };
const storageKey = "sabito-bca-test-conversation";
const errorText = (error: unknown) => {
  const data = (error as { data?: { error?: string } })?.data;
  return data?.error ?? "La requête a échoué. Vérifie la connexion puis réessaie.";
};

export function useSabitoTest() {
  const [messages, setMessages] = useState<TestMessage[]>(() => {
    try {
      const data: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(data) && data.every(v => v && ["user", "assistant"].includes(v.role) && typeof v.content === "string")) return data;
    } catch { /* A corrupt or unavailable browser store must not stop the chat. */ }
    return [];
  });
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const requestLock = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages)); }
    catch { setError("Le navigateur ne peut pas conserver la conversation. Les corrections restent enregistrées sur le serveur."); }
  }, [messages]);

  const refresh = async () => {
    try {
      setKnowledge(await listSabitoKnowledge(options));
      setReady(true);
      setError("");
    } catch (error) { setReady(false); setError(errorText(error)); }
  };
  useEffect(() => { void refresh(); }, []);

  const send = async (question: string, retry = false) => {
    if (requestLock.current || !ready || !question.trim()) return false;
    requestLock.current = true;
    setBusy(true); setError("");
    const turns = retry ? messages : [...messages, { role: "user" as const, content: question.trim() }];
    setMessages(turns);
    try {
      const response = await askSabito({ messages: turns.slice(-20).map(({ role, content }) => ({ role, content: content.slice(0, 4000) })) }, options);
      setMessages([...turns, { role: "assistant", content: response.answer, source: response.source }]);
      return true;
    } catch (error) { setError(errorText(error)); return false; }
    finally { requestLock.current = false; setBusy(false); }
  };

  const save = async (question: string, answer: string, messageIndex?: number) => {
    setSaving(true); setError("");
    try {
      const entry = await saveSabitoKnowledge({ question, answer }, options);
      setKnowledge(current => [entry, ...current.filter(v => v.id !== entry.id)]);
      if (messageIndex !== undefined) {
        setMessages(current => current.map((message, i) => i === messageIndex ? { ...message, content: entry.answer, source: "correction" } : message));
      }
      return true;
    } catch (error) { setError(errorText(error)); return false; }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    setSaving(true); setError("");
    try {
      await deleteSabitoKnowledge(id, options);
      setKnowledge(current => current.filter(v => v.id !== id));
      return true;
    } catch (error) { setError(errorText(error)); return false; }
    finally { setSaving(false); }
  };
  return { messages, setMessages, knowledge, busy, saving, ready, error, send, save, remove, refresh };
}
