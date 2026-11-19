const NUMBER = /\d+/g;
/** A capitalised word that does not open a sentence: likely a name. A sentence-initial capital proves nothing. */
const MID_SENTENCE_CAPITAL = /(?<![.!?…\n]\s*)(?<=\S\s+)\p{Lu}[\p{L}]*/gu;

/**
 * Soft heuristic, NOT a check: numbers and mid-sentence capitalised words in the suggestion that the original block
 * does not contain. It misses negations, subject swaps and lowercase names, and never blocks "Áp dụng".
 */
export function novelHint(original: string, suggestion: string): string[] {
  const known = original.toLowerCase();
  const found = [...(suggestion.match(NUMBER) ?? []), ...(suggestion.match(MID_SENTENCE_CAPITAL) ?? [])];
  return [...new Set(found)].filter((token) => !known.includes(token.toLowerCase()));
}
