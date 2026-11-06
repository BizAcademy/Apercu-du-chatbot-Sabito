/** Search question wording only, never answer bodies or private metadata. */
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("fr").replace(/œ/g, "oe").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function matchesReferenceQuestion(query: string, questions: string[]): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return words.length === 0 || questions.some(question => {
    const value = normalize(question);
    return words.every(word => value.includes(word));
  });
}
