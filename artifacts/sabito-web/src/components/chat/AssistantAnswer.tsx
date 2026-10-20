import { useEffect, useRef } from "react";
import { AnswerExtras } from "./AnswerExtras";
import { MessageText } from "./MessageText";
import type { ChatMsg } from "./types";
import { useTypewriter } from "./use-typewriter";

export function AssistantAnswer({ m, className, placeholder, ...extras }: {
  m: ChatMsg; className: string; placeholder: string; disabled: boolean;
  onPick: (question: string, followUpId?: string) => void; accent?: string; tone?: "admin" | "widget";
}) {
  const { text, typing } = useTypewriter(m.content, m.animate && !m.failed);
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!typing) return;
    let parent = element.current?.parentElement;
    while (parent) {
      if (parent.scrollHeight > parent.clientHeight && /auto|scroll/.test(getComputedStyle(parent).overflowY)) {
        if (parent.scrollHeight - parent.scrollTop - parent.clientHeight < 100) parent.scrollTop = parent.scrollHeight;
        break;
      }
      parent = parent.parentElement;
    }
  }, [text, typing]);
  return <>
    <div ref={element} className={className} aria-busy={typing || m.pending}>
      <MessageText content={m.content ? text : m.pending ? placeholder : ""} linkify={!typing} />
      {typing && <span aria-hidden="true" className="ml-0.5 inline-block h-[1em] w-0.5 animate-pulse bg-current align-middle motion-reduce:animate-none" />}
    </div>
    {!typing && <AnswerExtras m={m} {...extras} />}
  </>;
}
