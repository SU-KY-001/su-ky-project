const MS_PER_MINUTE = 60_000;

/** Same rule as the server (`mapNarration`): whitespace-separated words, one Vietnamese syllable each. */
export function scriptWordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function estimatedDurationMs(text: string, wordsPerMinute: number): number {
  return Math.round((scriptWordCount(text) / wordsPerMinute) * MS_PER_MINUTE);
}

/** At least one minute for any non-empty script, so the label never reads "0 phút". */
export function estimatedReadMinutes(text: string, wordsPerMinute: number): number {
  return scriptWordCount(text) ? Math.max(1, Math.round(estimatedDurationMs(text, wordsPerMinute) / MS_PER_MINUTE)) : 0;
}
