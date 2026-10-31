/** Pure text helpers shared by the compose validators (spec-prompts-review.md A4 + spec-prompts-compose.md 4.4). */

// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CONTROL_CHARS = /[\u0000-\u0009\u000B-\u001F\u007F]/g;
const MISSING_SOURCE_MARK = /\[\s*CẦN NGUỒN\s*\]/gi;
const BRACKET_DIRECTION = /\[[^\]\n]*\]/g;

/** Model output is XML-escaped data: undo exactly the three escapes. `&amp;` last so `&amp;lt;` stays `&lt;`. */
export const unescapeXml = (s: string): string => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** NFC, unescape, CRLF to LF, drop control characters (keeps newlines), trim trailing spaces per line. */
export function sanitizeText(s: string): string {
  return unescapeXml(s.normalize("NFC"))
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Words as `mapNarration` counts them: whitespace-separated tokens. */
export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Comparison key: NFC, lower case, punctuation and whitespace collapsed. */
export function normalizeKey(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Digit runs of a text, unique, in order of appearance. */
export function digitRuns(text: string): string[] {
  return [...new Set(text.match(/\d+/g) ?? [])];
}

/** Digit runs in `text` that appear nowhere in `reference` (soft warning for the UI, never blocks). */
export function novelNumbers(text: string, reference: string): string[] {
  const known = new Set(digitRuns(reference));
  return digitRuns(text).filter((run) => !known.has(run));
}

/** Cuts at a word boundary within `max` characters; no ellipsis (titles and list items). */
export function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const space = head.lastIndexOf(" ");
  return (space > max / 2 ? head.slice(0, space) : head).trimEnd();
}

/** Markers at the start of a line that the model must not emit; the text after them is kept. */
const LINE_MARKER = /^(?:(?:#{1,6}|>|[-*•+]|\d{1,3}[.)])\s+)+/;

function stripInlineMarkdown(line: string): string {
  return line
    .replace(/\*\*|__/g, "")
    .replace(/(?<![\w*])\*([^*\n]+)\*(?![\w*])/g, "$1")
    .replace(/(?<![\w_])_([^_\n]+)_(?![\w_])/g, "$1")
    .replace(/`+/g, "");
}

/** One-line text (title, goal, point): markers, markdown and `[CẦN NGUỒN]` removed, whitespace collapsed. */
export function cleanInline(raw: string): string {
  return stripInlineMarkdown(sanitizeText(raw).replace(MISSING_SOURCE_MARK, "").replace(BRACKET_DIRECTION, ""))
    .split("\n")
    .map((l) => l.replace(LINE_MARKER, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface CleanedProse {
  paragraphs: string[];
  /** True when anything beyond whitespace normalisation had to be removed or merged. */
  cleaned: boolean;
}

/** Spoken prose: fences, headings, list markers, bold, `[CẦN NGUỒN]` and `[…]` directions removed; paragraphs on blank lines. */
export function cleanProse(raw: string): CleanedProse {
  const baseline = sanitizeText(raw);
  const lines = baseline
    .replace(MISSING_SOURCE_MARK, "")
    .replace(BRACKET_DIRECTION, "")
    .split("\n")
    .filter((l) => !/^\s*`{3,}/.test(l))
    .map((l) => stripInlineMarkdown(l.trim().replace(LINE_MARKER, "")).replace(/[ \t]{2,}/g, " ").trim());
  const paragraphs = lines
    .join("\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter((p) => p.length > 0);
  return { paragraphs, cleaned: paragraphs.join("\n\n") !== baseline };
}
