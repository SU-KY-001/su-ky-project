import type { Editor } from "@tiptap/core";
import type { Node as ProseNode } from "@tiptap/pm/model";
import { hashBlockText, REWRITE_MAX_BLOCKS, SCRIPT_MAX_CHARACTERS } from "@repo/shared";
import { sentenceEnd, sentenceStart } from "../rewrite/sentenceRange";
import { buildBlocks, type ScriptBlock } from "./blockRefs";

export interface Span {
  /** ProseMirror range of the block's inline content. */
  from: number;
  to: number;
  text: string;
}

/** Same block rule as `blockTexts` (non-blank textblocks in document order), with ProseMirror positions. */
export function textBlockSpans(doc: ProseNode): Span[] {
  const spans: Span[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const text = node.textBetween(0, node.content.size, "", "\n");
    if (text.trim()) spans.push({ from: pos + 1, to: pos + 1 + node.content.size, text });
    return false;
  });
  return spans;
}

const collect = (editor: Editor): Span[] => textBlockSpans(editor.state.doc);

const indexOfRef = (ref: string): number => Number(ref.slice(1));

export function editorBlocks(editor: Editor): ScriptBlock[] {
  return buildBlocks(collect(editor).map((span) => span.text));
}

/** Blocks touched by the selection, with their absolute refs; a caret inside a block counts as that block. */
export function selectionBlocks(editor: Editor): ScriptBlock[] {
  const { from, to } = editor.state.selection;
  const spans = collect(editor);
  return editorBlocks(editor).filter((_, index) => spans[index]!.from <= to && spans[index]!.to >= from);
}

export function focusBlock(editor: Editor, ref: string | null): void {
  const span = ref === null ? undefined : collect(editor)[indexOfRef(ref)];
  if (span) {
    editor.chain().setTextSelection({ from: span.from, to: span.to }).scrollIntoView().run();
    // Centre the block like the mock; ProseMirror's own scroll only brings it to the edge.
    const dom = editor.view.nodeDOM(span.from - 1);
    if (dom instanceof HTMLElement) dom.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

/** One Tiptap transaction (Ctrl+Z undoes it); refuses when the block no longer has the text the AI saw. */
export function replaceBlockText(editor: Editor, ref: string, expectedHash: string, text: string): "ok" | "conflict" {
  const span = collect(editor)[indexOfRef(ref)];
  if (!span || hashBlockText(span.text) !== expectedHash) return "conflict";
  const content = text.split("\n").flatMap((line, index) => [
    ...(index > 0 ? [{ type: "hardBreak" }] : []),
    ...(line ? [{ type: "text", text: line }] : []),
  ]);
  return editor.chain().insertContentAt({ from: span.from, to: span.to }, content).run() ? "ok" : "conflict";
}

const CONTEXT_MAX_CHARS = 600;

/** One block touched by a rewrite range: `start..end` is the fragment inside the block text. */
export interface RangeBlock {
  ref: string;
  /** Hash of the WHOLE block when the range was taken; replace refuses when it no longer matches. */
  hash: string;
  prevHash: string;
  start: number;
  end: number;
  fragment: string;
}

export interface SelectionRange {
  blocks: RangeBlock[];
  /** Characters the moderator actually selected, before expansion to whole sentences. */
  selectedChars: number;
  truncated: boolean;
  contextBefore: string;
  contextAfter: string;
  /** ProseMirror positions of the expanded range, used to re-select it visibly. */
  from: number;
  to: number;
}

/** Selection expanded to whole sentences, at most REWRITE_MAX_BLOCKS blocks; null for a caret or no text. */
export function selectionRange(editor: Editor): SelectionRange | null {
  const { from, to, empty } = editor.state.selection;
  if (empty) return null;
  const spans = collect(editor);
  const blocks = editorBlocks(editor);
  let first = spans.findIndex((span) => span.from <= to && span.to >= from);
  if (first < 0) return null;
  let last = spans.length - 1;
  while (last > first && spans[last]!.from > to) last -= 1;
  if (last > first && to <= spans[last]!.from) last -= 1;
  if (last > first && from >= spans[first]!.to) first += 1;
  const truncated = last - first + 1 > REWRITE_MAX_BLOCKS;
  if (truncated) last = first + REWRITE_MAX_BLOCKS - 1;

  const picked = spans.slice(first, last + 1).map((span, offset) => {
    const index = first + offset;
    const isFirst = index === first;
    const isLast = index === last;
    const start = isFirst ? sentenceStart(span.text, Math.max(from - span.from, 0)) : 0;
    const end = isLast && !truncated ? sentenceEnd(span.text, Math.min(to - span.from, span.text.length)) : span.text.length;
    return { ref: blocks[index]!.ref, hash: blocks[index]!.hash, prevHash: blocks[index]!.prev, start, end, fragment: span.text.slice(start, end) };
  });
  const firstSpan = spans[first]!;
  const lastSpan = spans[last]!;
  const selectedChars = editor.state.doc.textBetween(from, to, "\n", "\n").length;
  const before = [...spans.slice(0, first).map((span) => span.text), firstSpan.text.slice(0, picked[0]!.start)].filter(Boolean).join("\n");
  const after = [lastSpan.text.slice(picked[picked.length - 1]!.end), ...spans.slice(last + 1).map((span) => span.text)].filter(Boolean).join("\n");
  return {
    blocks: picked,
    selectedChars,
    truncated,
    contextBefore: before.slice(-CONTEXT_MAX_CHARS),
    contextAfter: after.slice(0, CONTEXT_MAX_CHARS),
    from: firstSpan.from + picked[0]!.start,
    to: lastSpan.from + picked[picked.length - 1]!.end,
  };
}

export function selectRange(editor: Editor, range: Pick<SelectionRange, "from" | "to">): void {
  editor.chain().setTextSelection({ from: range.from, to: range.to }).run();
}

/** Same slot and same whole-block hash for every block of the range, and the block before the first one unchanged. */
function rangeIntact(spans: Span[], blocks: RangeBlock[]): boolean {
  const current = buildBlocks(spans.map((span) => span.text));
  const firstIndex = Number(blocks[0]!.ref.slice(1));
  return blocks.every((block) => current[Number(block.ref.slice(1))]?.hash === block.hash) &&
    (firstIndex === 0 ? true : current[firstIndex - 1]?.hash === blocks[0]!.prevHash);
}

const inlineNodes = (text: string) =>
  text.split("\n").flatMap((line, index) => [
    ...(index > 0 ? [{ type: "hardBreak" }] : []),
    ...(line ? [{ type: "text", text: line }] : []),
  ]);

const paragraphNode = (text: string) => ({ type: "paragraph", content: inlineNodes(text) });

/** Characters of the script as the paste handler counts them. */
const documentLength = (editor: Editor): number => editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n", "\n").length;

export type EditResult = { ok: true } | { ok: false; reason: "CONFLICT" | "TOO_LONG" };

/** Replace the range: whole blocks become paragraphs, a partial range is replaced inline. One transaction (Ctrl+Z). */
export function replaceRange(editor: Editor, range: SelectionRange, paragraphs: string[]): EditResult {
  const spans = collect(editor);
  if (!rangeIntact(spans, range.blocks)) return { ok: false, reason: "CONFLICT" };
  const firstSpan = spans[Number(range.blocks[0]!.ref.slice(1))]!;
  const lastSpan = spans[Number(range.blocks[range.blocks.length - 1]!.ref.slice(1))]!;
  const from = firstSpan.from + range.blocks[0]!.start;
  const to = lastSpan.from + range.blocks[range.blocks.length - 1]!.end;
  const removed = editor.state.doc.textBetween(from, to, "\n", "\n").length;
  const added = paragraphs.join(" ").length;
  if (documentLength(editor) - removed + added > SCRIPT_MAX_CHARACTERS) return { ok: false, reason: "TOO_LONG" };
  const wholeBlocks = range.blocks[0]!.start === 0 && range.blocks[range.blocks.length - 1]!.end === lastSpan.text.length;
  if (wholeBlocks) {
    const applied = editor.chain().insertContentAt({ from: firstSpan.from - 1, to: lastSpan.to + 1 }, paragraphs.map(paragraphNode)).run();
    return applied ? { ok: true } : { ok: false, reason: "CONFLICT" };
  }
  // Partial range: AI text goes in as plain text (never parsed as HTML); prefix and suffix stay, each extra paragraph splits the block.
  const { tr, schema } = editor.state;
  tr.delete(from, to);
  let position = from;
  paragraphs.forEach((paragraph, index) => {
    if (index > 0) {
      tr.split(position, 1, [{ type: schema.nodes.paragraph! }]);
      position += 2;
    }
    const text = paragraph.replace(/\s*\n\s*/g, " ");
    tr.insertText(text, position);
    position += text.length;
  });
  editor.view.dispatch(tr);
  return { ok: true };
}

/** New paragraphs right after the last block of the range; the original text is untouched. */
export function insertAfterRange(editor: Editor, range: SelectionRange, paragraphs: string[]): EditResult {
  const spans = collect(editor);
  const last = range.blocks[range.blocks.length - 1]!;
  const span = spans[Number(last.ref.slice(1))];
  if (!span || buildBlocks(spans.map((entry) => entry.text))[Number(last.ref.slice(1))]!.hash !== last.hash) return { ok: false, reason: "CONFLICT" };
  if (documentLength(editor) + paragraphs.join("\n").length > SCRIPT_MAX_CHARACTERS) return { ok: false, reason: "TOO_LONG" };
  const at = editor.state.doc.resolve(span.to).after();
  return editor.chain().insertContentAt(at, paragraphs.map(paragraphNode)).run() ? { ok: true } : { ok: false, reason: "CONFLICT" };
}

export interface DraftInsertItem {
  heading?: string;
  paragraphs: string[];
}

export function isEditorEmpty(editor: Editor): boolean {
  return collect(editor).length === 0;
}

/** One transaction: optional h3 per item, then its paragraphs. Refuses (no partial insert) when over the character cap. */
export function insertDraft(editor: Editor, items: DraftInsertItem[], at: "end" | "cursor"): EditResult {
  const nodes = items.flatMap((item) => [
    ...(item.heading ? [{ type: "heading", attrs: { level: 3 }, content: inlineNodes(item.heading) }] : []),
    ...item.paragraphs.map(paragraphNode),
  ]);
  const addedChars = items.reduce((sum, item) => sum + (item.heading?.length ?? 0) + item.paragraphs.join("\n").length + 1, 0);
  if (documentLength(editor) + addedChars > SCRIPT_MAX_CHARACTERS) return { ok: false, reason: "TOO_LONG" };
  const size = editor.state.doc.content.size;
  if (isEditorEmpty(editor)) return editor.chain().insertContentAt({ from: 0, to: size }, nodes).run() ? { ok: true } : { ok: false, reason: "CONFLICT" };
  const position = at === "end" ? size : editor.state.doc.resolve(editor.state.selection.from).after(1);
  return editor.chain().insertContentAt(position, nodes).run() ? { ok: true } : { ok: false, reason: "CONFLICT" };
}
