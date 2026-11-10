import type { QuizImportBlock } from "./types";
export function normalized(value: string): string { return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi"); }
export function unaccent(value: string): string { return normalized(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d"); }
export function cleanLine(value: string): string { return value.normalize("NFC").replace(/^\uFEFF/, "").trim().replace(/^#{1,6}\s+/, "").replace(/^(?:[•●▪◦]|[-*]\s)\s*/, "").replace(/\*\*/g, ""); }
export function expandBlocks(blocks: QuizImportBlock[]): QuizImportBlock[] {
  return blocks.flatMap(block => block.text.replace(/\r\n?/g, "\n").split("\n").map((text, offset) => ({ ...block, text: cleanLine(text), line: block.line === null ? null : block.line + offset })));
}
