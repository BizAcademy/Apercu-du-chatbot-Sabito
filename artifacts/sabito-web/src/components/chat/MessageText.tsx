import { Fragment } from "react";
import { messageLinks } from "./message-links";

export function MessageText({ content }: { content: string }) {
  return <>{messageLinks(content).map((part, index) =>
    part.href
      ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer"
          className="break-words font-medium underline underline-offset-2 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{part.text}</a>
      : <Fragment key={index}>{part.text}</Fragment>
  )}</>;
}
