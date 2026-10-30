import type { CheckBlock, ReviewSource } from "../domain/review.types";

const escapeText = (s: string) => s.normalize("NFC").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, "&quot;");

function sourceLine(s: ReviewSource): string {
  const url = s.kind === "URL" && s.url ? ` url="${escapeAttr(s.url)}"` : "";
  return `<source label="${escapeAttr(s.label)}" kind="${s.kind}" title="${escapeAttr(s.title)}"${url}/>`;
}

/** User prompt for one batch: stable context first (sources), variable parts after (note, blocks). */
export function buildUserPrompt(input: { blocks: CheckBlock[]; note: string | null; sources: ReviewSource[] }): string {
  const parts: string[] = [];
  if (input.sources.length > 0) parts.push(`<sources>\n${input.sources.map(sourceLine).join("\n")}\n</sources>`);
  const note = input.note?.trim();
  if (note) parts.push(`<note>${escapeText(note)}</note>`);
  const blocks = input.blocks.map((b) => `<block ref="${escapeAttr(b.ref)}">${escapeText(b.text)}</block>`);
  parts.push(`<blocks>\n${blocks.join("\n")}\n</blocks>`);
  return parts.join("\n");
}
