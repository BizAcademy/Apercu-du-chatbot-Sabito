import { Fragment, useEffect, useState } from "react";
import { messageLinks } from "./message-links";
import { useTypewriter } from "./use-typewriter";

export function AnimatedMessageText({ content, animate }: { content: string; animate?: boolean }) {
  const [waiting, setWaiting] = useState(Boolean(animate));
  useEffect(() => {
    if (!animate) { setWaiting(false); return; }
    const timer = window.setTimeout(() => setWaiting(false), 2000);
    return () => window.clearTimeout(timer);
  }, [animate]);
  if (waiting) return <span role="status">Typing...</span>;
  return <RevealedMessageText content={content} animate={animate} />;
}

function RevealedMessageText({ content, animate }: { content: string; animate?: boolean }) {
  const { text, typing } = useTypewriter(content, animate);
  return <span aria-busy={typing}><MessageText content={text} linkify={!typing} /></span>;
}

export function MessageText({ content, linkify = true }: { content: string; linkify?: boolean }) {
  if (!linkify) return <>{content}</>;
  return <>{messageLinks(content).map((part, index) =>
    part.href
      ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer"
          className="break-words font-medium text-[#15803d] underline underline-offset-2 hover:text-[#166534] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{part.text}</a>
      : <Fragment key={index}>{part.text}</Fragment>
  )}</>;
}
