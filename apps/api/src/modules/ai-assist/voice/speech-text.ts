import type { EditorDocument } from "@repo/shared";
import { extractScriptText } from "../../content/application/script-document";

const SENTENCE_END = /(?<=[.!?…])\s+/;

/** Spoken paragraphs of a script: headings are section titles for the editor, not narration, so they are skipped. */
export function speechParagraphs(document: EditorDocument | null, fallbackText: string | null): string[] {
  const blocks = document
    ? (document.content ?? []).filter((node) => node.type !== "heading").map((node) => extractScriptText({ ...document, content: [node] }))
    : (fallbackText ?? "").split(/\n\s*\n/);
  return blocks.map((block) => block.trim()).filter(Boolean);
}

/** Greedy packing of paragraphs into requests of at most `maxChars`; an over-long paragraph is split at sentence ends. */
export function chunkSpeech(paragraphs: string[], maxChars: number): string[] {
  const pieces = paragraphs.flatMap((paragraph) => (paragraph.length <= maxChars ? [paragraph] : splitSentences(paragraph, maxChars)));
  const chunks: string[] = [];
  for (const piece of pieces) {
    const last = chunks.at(-1);
    if (last !== undefined && last.length + 2 + piece.length <= maxChars) chunks[chunks.length - 1] = `${last}\n\n${piece}`;
    else chunks.push(piece);
  }
  return chunks;
}

function splitSentences(paragraph: string, maxChars: number): string[] {
  const out: string[] = [];
  let current = "";
  for (const sentence of paragraph.split(SENTENCE_END)) {
    if (current && current.length + 1 + sentence.length > maxChars) {
      out.push(current);
      current = sentence;
    } else current = current ? `${current} ${sentence}` : sentence;
  }
  if (current) out.push(current);
  // A single sentence longer than maxChars is sent whole: cutting mid-sentence would break the intonation.
  return out;
}
