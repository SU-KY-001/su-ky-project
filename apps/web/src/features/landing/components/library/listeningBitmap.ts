/** Merge ranges actually played by the media element, excluding skipped sections. */
export function mergePlayedRanges(bits: Uint8Array, ranges: TimeRanges, durationMs: number): number {
  const totalSeconds = Math.ceil(durationMs / 1000);
  for (let range = 0; range < ranges.length; range++) {
    const start = Math.max(0, Math.floor(ranges.start(range)));
    const end = Math.min(totalSeconds, Math.ceil(ranges.end(range)));
    for (let second = start; second < end; second++) bits[Math.floor(second / 8)] |= 1 << (second % 8);
  }
  let playedSeconds = 0;
  for (const byte of bits) {
    let remaining = byte;
    while (remaining) { remaining &= remaining - 1; playedSeconds++; }
  }
  return playedSeconds;
}
