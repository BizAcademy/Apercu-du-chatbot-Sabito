import type { ChatMsg } from "./types";

/** Suggestions (max 3) and authored closing message shown under every completed answer. */
export function AnswerExtras({ m, disabled, onPick, accent = "#3641f5", tone = "admin" }: { m: ChatMsg; disabled: boolean; onPick: (question: string, followUpId?: string) => void; accent?: string; tone?: "admin" | "widget" }) {
  if (m.pending || m.failed) return null;
  const list = (m.suggestions ?? []).filter((s) => {
    const words=s.question.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
    return words.length>0 && !words.every(word=>["bonjour","bonsoir","salut","coucou","hello","hi","hey","bjr","slt"].includes(word));
  }).slice(0, 3);
  const closing = m.closing_message?.trim();
  if (!list.length && !closing) return null;
  const border = tone === "widget" ? "#ddd8ca" : "#dfe2fb";
  return (
    <div className="mt-2.5" data-testid={`extras-${m.id}`}>
      {list.length > 0 && (
        <>
          {m.suggestions_label && list.some(s=>!s.follow_up_id) && (
            <p className="mb-1.5 text-[12px] font-semibold text-[#727687]" data-testid={`text-suggestions-label-${m.id}`}>Voulez-vous dire :</p>
          )}
          <div className="flex flex-col items-start gap-1.5">
            {list.map((s, i) => (
              <button key={`${s.document_id}-${i}`} type="button" disabled={disabled} onClick={() => onPick(s.question, s.follow_up_id)}
                className="max-w-full rounded-[12px] border bg-white/70 px-3 py-1.5 text-left text-[12.5px] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: border, color: accent }} data-testid={`button-suggestion-${m.id}-${i}`}>{s.question}</button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-[#727687]">
            {list.length === 1 ? "Cliquez sur la question ou répondez par oui ou non." : "Choisissez une question, ou répondez non pour terminer."}
          </p>
        </>
      )}
      {closing && <p className="mt-2 whitespace-pre-wrap text-[12.5px] text-[#5d6072]" data-testid={`text-closing-${m.id}`}>{m.closing_message}</p>}
    </div>
  );
}

export function GreetingBubble({ content, className }: { content: string; className: string }) {
  return <div className={`whitespace-pre-wrap break-words ${className}`} data-testid="text-greeting">{content}</div>;
}
