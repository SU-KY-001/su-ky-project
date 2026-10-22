import type { Editor } from "@tiptap/core";
import { hashBlockText } from "@repo/shared";
import { buildBlocks, type ScriptBlock } from "./blockRefs";

interface Span {
  /** ProseMirror range of the block's inline content. */
  from: number;
  to: number;
  text: string;
}

/** Same block rule as `blockTexts` (non-blank textblocks in document order), with ProseMirror positions. */
function collect(editor: Editor): Span[] {
  const spans: Span[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const text = node.textBetween(0, node.content.size, "", "\n");
    if (text.trim()) spans.push({ from: pos + 1, to: pos + 1 + node.content.size, text });
    return false;
  });
  return spans;
}

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
  if (span) editor.chain().setTextSelection({ from: span.from, to: span.to }).scrollIntoView().run();
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
