import { useEffect, useMemo, useState } from "react";

/** Animate only live replies, not history. Always render the complete stored answer eventually. */
export function useTypewriter(content: string, animate = false) {
  const characters = useMemo(() => Array.from(content), [content]);
  const [visible, setVisible] = useState(() => animate ? 0 : characters.length);
  const [reducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const enabled = animate && !reducedMotion;
  useEffect(() => {
    if (!enabled || visible >= characters.length) return;
    const step = Math.max(1, Math.ceil(characters.length / 400));
    const timer = window.setInterval(() => {
      setVisible(count => {
        const next = Math.min(characters.length, count + step);
        if (next >= characters.length) window.clearInterval(timer);
        return next;
      });
    }, 20);
    return () => window.clearInterval(timer);
  }, [enabled, characters.length, visible >= characters.length]);
  const typing = enabled && visible < characters.length;
  return { text: typing ? characters.slice(0, visible).join("") : content, typing };
}
