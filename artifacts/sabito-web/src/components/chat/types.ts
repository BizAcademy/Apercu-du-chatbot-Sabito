export type Suggestion = { document_id: string; question: string; follow_up_id?: string };
export type ChatMsg = {
  id: string; role: "user" | "assistant"; content: string; pending?: boolean; failed?: string;
  suggestions?: Suggestion[]; suggestions_label?: string; closing_message?: string;
};
export type Greeting = { conversationId: string; content: string };
export type StartAck = { ok: boolean; data?: { conversationId: string; greeting: string }; error?: { code?: string; message?: string } | string };
export type CompleteEvent = { conversationId: string; messageId: string; content: string; suggestions?: Suggestion[]; suggestions_label?: string; closing_message?: string };

type HistoryRow = { id: string; role: "user" | "assistant"; content: string; status: string; suggestions?: Suggestion[] | null; suggestions_label?: string | null; closing_message?: string | null };
export function fromHistory(rows: HistoryRow[]): ChatMsg[] {
  return rows.map((m) => ({
    id: m.id, role: m.role, content: m.content,
    pending: m.status === "accepted" || m.status === "streaming",
    failed: m.status === "failed" ? "Ce message a échoué." : undefined,
    suggestions: m.suggestions ?? undefined, suggestions_label: m.suggestions_label ?? undefined, closing_message: m.closing_message ?? undefined,
  }));
}
export function applyComplete(m: ChatMsg[], e: CompleteEvent): ChatMsg[] {
  const patch = { content: e.content, pending: false, suggestions: e.suggestions, suggestions_label: e.suggestions_label, closing_message: e.closing_message };
  return m.some((x) => x.id === e.messageId) ? m.map((x) => (x.id === e.messageId ? { ...x, ...patch } : x)) : [...m, { id: e.messageId, role: "assistant", ...patch }];
}
