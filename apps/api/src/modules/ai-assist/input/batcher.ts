import type { CheckBlock } from "../ai-assist.types";

/**
 * Groups adjacent blocks into sessions. A new batch starts when adding the next block would exceed
 * `maxBlocks` or `maxChars`; a block that alone exceeds `maxChars` still gets its own batch (never dropped).
 */
export function batchBlocks(blocks: CheckBlock[], opts: { maxBlocks: number; maxChars: number }): CheckBlock[][] {
  const batches: CheckBlock[][] = [];
  let current: CheckBlock[] = [];
  let chars = 0;
  for (const block of blocks) {
    const full = current.length >= opts.maxBlocks || chars + block.text.length > opts.maxChars;
    if (current.length > 0 && full) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(block);
    chars += block.text.length;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}
