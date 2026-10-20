export type MessagePart = { text: string; href?: string };

/** Linkify web addresses only; never interpret message content as HTML. */
export function messageLinks(content: string): MessagePart[] {
  const parts: MessagePart[] = [];
  const pattern = /(?:https?:\/\/|www\.)[^\s<>"'`]+/giu;
  let cursor = 0;
  for (const match of content.matchAll(pattern)) {
    const start = match.index!;
    // Avoid recognizing a URL embedded in another scheme or identifier.
    if (start > 0 && /[\p{L}\p{N}_/@:]/u.test(content[start - 1])) continue;
    let text = match[0].replace(/[.,;:!?…]+$/u, "");
    // Keep balanced parentheses in URLs, but not surrounding prose punctuation.
    for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
      while (text.endsWith(close) && text.split(close).length > text.split(open).length) {
        text = text.slice(0, -1);
      }
    }
    text = text.replace(/[.,;:!?…]+$/u, "");
    let url: URL;
    try {
      url = new URL(/^www\./i.test(text) ? `https://${text}` : text);
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) continue;
    } catch { continue; }
    if (start > cursor) parts.push({ text: content.slice(cursor, start) });
    parts.push({ text, href: url.href });
    cursor = start + text.length;
  }
  if (cursor < content.length) parts.push({ text: content.slice(cursor) });
  return parts;
}
