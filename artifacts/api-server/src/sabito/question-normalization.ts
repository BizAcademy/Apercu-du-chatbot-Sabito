/** One canonical form for authored questions, typed questions and saved selections.
 * Invisible formatting characters are not word boundaries; punctuation is.
 */
export function normalizeQuestion(text:string) {
  return text.normalize("NFKD").replace(/[\p{M}\p{Cf}]/gu,"").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
