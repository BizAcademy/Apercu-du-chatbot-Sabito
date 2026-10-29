import { normalizeQuestion } from "./question-normalization";

// Only unambiguous conversational abbreviations; never expand account/transaction IDs.
const abbreviations: Record<string, string> = {
  cmt: "comment", comnt: "comment", comen: "comment", commen: "comment", coment: "comment",
  commant: "comment", comant: "comment", cmb: "combien", cb: "combien",
  combient: "combien", conbien: "combien",
  pk: "pourquoi", pq: "pourquoi", koi: "quoi", kel: "quel", kelle: "quelle",
  kels: "quels", kelles: "quelles", avc: "avec", bcp: "beaucoup",
  mtn: "maintenant", ajd: "aujourd hui", auj: "aujourd hui",
  stp: "s il te plait", svp: "s il vous plait", pr: "pour", ds: "dans",
  qq: "quelques", qqn: "quelqu un", qd: "quand", num: "numero",
  txn: "transaction", txns: "transactions", nn: "non",
  mdp: "mot de passe", pb: "probleme", prblm: "probleme",
};
export function expandQuestion(text: string) {
  return normalizeQuestion(text).split(" ").map(word => abbreviations[word] ?? word).join(" ");
}

const edits = new Map<string, number>();
/** Bounded Damerau-Levenshtein: insertion, deletion, substitution and adjacent swaps. */
export function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.startsWith("syn") || b.startsWith("syn") || /\d/.test(a + b) ||
    Math.min(a.length, b.length) < 4 || Math.max(a.length, b.length) > 64 ||
    Math.abs(a.length - b.length) > 2) return 0;
  const key = `${a}:${b}`;
  if (edits.has(key)) return edits.get(key)!;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let beforePrevious = previous;
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      let cost = Math.min(next[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        cost = Math.min(cost, beforePrevious[j - 2] + 1);
      next.push(cost);
    }
    beforePrevious = previous;
    previous = next;
  }
  const distance = previous[b.length], length = Math.max(a.length, b.length);
  const value = distance <= (length <= 5 ? 1 : 2) ? Math.max(0, 1 - distance / length) : 0;
  if (edits.size > 20000) edits.clear();
  edits.set(key, value);
  return value;
}

/** Numbers and negation are meaning, not spelling mistakes. */
export function protectedMismatch(a: string[], b: string[]) {
  const protectedTokens = (tokens: string[]) => [...new Set(tokens.filter(t =>
    (/\d/.test(t) && !/^syn\d+$/.test(t)) || ["pas", "non", "jamais", "sans", "aucun", "aucune"].includes(t)))].sort().join("|");
  return protectedTokens(a) !== protectedTokens(b);
}

/** Raise confidence only if every distinct word has its own close counterpart.
 * Known platform words cannot be "corrected" into another known word.
 */
export function spellingSimilarity(a: string[], b: string[], vocabulary?: Set<string>,
  similar: (a: string, b: string) => number = tokenSimilarity) {
  const left = [...new Set(a)], right = [...new Set(b)];
  if (!left.length || left.length !== right.length || left.length > 30 || protectedMismatch(a, b)) return 0;
  const unmatchedA = left.filter(t => !right.includes(t));
  const unmatchedB = right.filter(t => !left.includes(t));
  if (!unmatchedA.length) return 0.99;
  const matches = new Map<number, number>();
  const similarity = (word: string, other: string) =>
    vocabulary?.has(word) ? 0 : similar(word, other);
  function assign(index: number, visited: Set<number>): boolean {
    for (let j = 0; j < unmatchedB.length; j++) {
      if (visited.has(j) || similarity(unmatchedA[index], unmatchedB[j]) < 0.75) continue;
      visited.add(j);
      const previous = matches.get(j);
      if (previous === undefined || assign(previous, visited)) { matches.set(j, index); return true; }
    }
    return false;
  }
  for (let i = 0; i < unmatchedA.length; i++) if (!assign(i, new Set())) return 0;
  let total = left.length - unmatchedA.length;
  for (const [j, i] of matches) total += similarity(unmatchedA[i], unmatchedB[j]);
  return 0.90 + 0.09 * total / left.length;
}
