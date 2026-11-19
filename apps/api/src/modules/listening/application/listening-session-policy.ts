export function mergeSessionBitmap(stored: Uint8Array, requested: Uint8Array, durationMs: number, budgetMs: number): { bitmap: Uint8Array; playedMs: number; qualified: boolean } {
  const seconds = Math.ceil(durationMs / 1000);
  const bitmap = new Uint8Array(Math.ceil(seconds / 8));
  let playedMs = 0;
  for (let bit = 0; bit < seconds; bit++) {
    const mask = 1 << (bit % 8);
    if ((stored[bit >> 3]! & mask) !== 0) {
      bitmap[bit >> 3] |= mask;
      playedMs += Math.min(1000, durationMs - bit * 1000);
    }
  }
  for (let bit = 0; bit < seconds; bit++) {
    const mask = 1 << (bit % 8);
    const length = Math.min(1000, durationMs - bit * 1000);
    if ((requested[bit >> 3]! & mask) !== 0 && (bitmap[bit >> 3]! & mask) === 0 && playedMs + length <= budgetMs) {
      bitmap[bit >> 3] |= mask;
      playedMs += length;
    }
  }
  return { bitmap, playedMs, qualified: playedMs >= Math.min(30000, Math.ceil(durationMs * 0.8)) };
}

export function sessionRetentionCutoff(now: Date): Date {
  const cutoff = new Date(now);
  const day = cutoff.getUTCDate();
  cutoff.setUTCDate(1);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 13);
  const lastDay = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate();
  cutoff.setUTCDate(Math.min(day, lastDay));
  return cutoff;
}
