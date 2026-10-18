import type { ChatMsg } from "./types";

/** Suggestions (max 3) and authored closing message shown under every completed answer. */
export function AnswerExtras({ m, disabled, onPick, accent = "#3641f5", tone = "admin" }: { m: ChatMsg; disabled: boolean; onPick: (question: string, followUpId?: string) => void; accent?: string; tone?: "admin" | "widget" }) {
  if (m.pending || m.failed) return null;
  const list = (m.suggestions ?? []).filter((s) => s.question.trim()).slice(0, 3);
  const closing = m.closing_message?.trim();
  if (!list.length && !closing) return null;
  const border = tone === "widget" ? "#ddd8ca" : "#dfe2fb";
  return (
    <div className="mt-2.5" data-testid={`extras-${m.id}`}>
      {list.length > 0 && (
        <>
          {m.suggestions_label && <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.6px] text-[#8b8f9f]" data-testid={`text-suggestions-label-${m.id}`}>{m.suggestions_label}</p>}
          <div className="flex flex-col items-start gap-1.5">
            {list.map((s, i) => (
              <button key={`${s.document_id}-${i}`} type="button" disabled={disabled} onClick={() => onPick(s.question, s.follow_up_id)}
                className="max-w-full rounded-[12px] border bg-white/70 px-3 py-1.5 text-left text-[12.5px] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: border, color: accent }} data-testid={`button-suggestion-${m.id}-${i}`}>{s.question}</button>
            ))}
          </div>
        </>
      )}
      {closing && <p className="mt-2 whitespace-pre-wrap text-[12.5px] text-[#5d6072]" data-testid={`text-closing-${m.id}`}>{m.closing_message}</p>}
    </div>
  );
}

export function GreetingBubble({ content, className }: { content: string; className: string }) {
  return <div className={`whitespace-pre-wrap break-words ${className}`} data-testid="text-greeting">{content}</div>;
}
