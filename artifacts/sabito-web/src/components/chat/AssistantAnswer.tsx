import { useEffect, useRef, useState } from "react";
import { AnswerExtras } from "./AnswerExtras";
import { MessageText } from "./MessageText";
import type { ChatMsg } from "./types";
import { useTypewriter } from "./use-typewriter";

type AnswerProps = {
  m: ChatMsg; className: string; placeholder: string; disabled: boolean;
  onPick: (question: string, followUpId?: string) => void; accent?: string; tone?: "admin" | "widget";
};

export function AssistantAnswer(props: AnswerProps) {
  const { m } = props;
  const [waiting, setWaiting] = useState(Boolean(m.animate && !m.failed));
  useEffect(() => {
    if (!m.animate || m.failed) { setWaiting(false); return; }
    if (m.pending) return;
    const timer = window.setTimeout(() => setWaiting(false), 2000);
    return () => window.clearTimeout(timer);
  }, [m.animate, m.pending, m.failed]);
  if ((waiting || m.pending) && !m.failed) {
    return <div role="status" className="w-fit rounded-[18px] rounded-bl-[5px] bg-[#f0f0f0] px-4 py-2.5 text-[13px] text-[#454545]">Typing...</div>;
  }
  return <AnswerBody {...props} />;
}

function AnswerBody({ m, className, placeholder, ...extras }: AnswerProps) {
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
