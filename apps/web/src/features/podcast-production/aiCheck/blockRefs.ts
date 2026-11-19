import { hashBlockText, type AiCheckItem, type EditorDocument, type EditorNode } from "@repo/shared";

export interface ScriptBlock {
  /** `b{index}`: absolute index among the non-blank blocks of the whole document, also for a selection. */
  ref: string;
  text: string;
  hash: string;
  /** Hash of the block before this one ("" for the first). */
  prev: string;
  /** How many blocks of the whole document share this hash. */
  dup: number;
}

export type BlockLocator = Pick<AiCheckItem, "blockRef" | "blockHash" | "blockPrevHash" | "blockDup">;

const BLOCK_REF_PREFIX = "b";

function inlineText(node: EditorNode): string {
  if (node.type === "text") return node.text;
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(inlineText).join("");
}

/**
 * Block = every paragraph / heading, also inside lists and quotes. The editor handle walks ProseMirror with the same
 * rule (textblock with non-blank text), so an index means the same block on both sides.
 */
export function blockTexts(document: EditorDocument): string[] {
  const texts: string[] = [];
  const visit = (node: EditorNode): void => {
    if (node.type === "paragraph" || node.type === "heading") {
      const text = inlineText(node);
      if (text.trim()) texts.push(text);
    } else if (node.type !== "text" && node.type !== "hardBreak") {
      node.content?.forEach(visit);
    }
  };
  document.content?.forEach(visit);
  return texts;
}

export function buildBlocks(texts: string[]): ScriptBlock[] {
  const hashes = texts.map(hashBlockText);
  const counts = new Map<string, number>();
  for (const hash of hashes) counts.set(hash, (counts.get(hash) ?? 0) + 1);
  return texts.map((text, index) => ({
    ref: `${BLOCK_REF_PREFIX}${index}`,
    text,
    hash: hashes[index]!,
    prev: index === 0 ? "" : hashes[index - 1]!,
    dup: counts.get(hashes[index]!)!,
  }));
}

export const extractBlocks = (document: EditorDocument): ScriptBlock[] => buildBlocks(blockTexts(document));

/**
 * Spec B1 locate rule. A hash is a fingerprint, not an identity, so there is no "closest" guess:
 * (1) same slot, same hash and same previous hash; (2) moved only when the hash was unique then and is unique now;
 * (3) everything else is a conflict.
 */
export function locateBlock(blocks: ScriptBlock[], item: BlockLocator): string | "conflict" {
  const atSlot = blocks[Number(item.blockRef.slice(BLOCK_REF_PREFIX.length))];
  if (atSlot && atSlot.hash === item.blockHash && atSlot.prev === item.blockPrevHash) return atSlot.ref;
  if (item.blockDup !== 1) return "conflict";
  const matches = blocks.filter((block) => block.hash === item.blockHash);
  return matches.length === 1 ? matches[0]!.ref : "conflict";
}
