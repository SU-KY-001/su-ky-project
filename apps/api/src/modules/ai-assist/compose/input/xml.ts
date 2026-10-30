import { MIN_SOURCE_SLICE_CHARS } from "../constants";

/** spec-prompts-review.md A1: NFC, then escape & < > (and " in attributes). */
export const escapeText = (s: string): string => s.normalize("NFC").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const escapeAttr = (s: string): string => escapeText(s).replace(/"/g, "&quot;");

type Attrs = Record<string, string | number | undefined>;

function renderAttrs(attrs: Attrs): string {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => ` ${k}="${escapeAttr(String(v))}"`)
    .join("");
}

/** `<name a="…">body</name>`; no body renders `<name a="…"/>`. Callers drop optional tags themselves. */
export function tag(name: string, attrs: Attrs, body?: string): string {
  const text = body?.trim();
  return text ? `<${name}${renderAttrs(attrs)}>${escapeText(text)}</${name}>` : `<${name}${renderAttrs(attrs)}/>`;
}

/** Body already escaped/structured by the caller (nested tags). */
export function wrap(name: string, attrs: Attrs, innerXml: string): string {
  return `<${name}${renderAttrs(attrs)}>\n${innerXml}\n</${name}>`;
}

/** Cuts at a word boundary and appends an ellipsis; text within the limit is returned trimmed and unchanged. */
export function clip(text: string, max: number): string {
  const t = text.normalize("NFC").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export interface SeriesContext {
  title: string;
  description: string | null;
}

export interface SourceExcerpt {
  title: string;
  author: string | null;
  year: number | null;
  locator: string;
  excerpt: string;
}

export interface SourcesBlock {
  /** Null when no source has a usable excerpt: the tag is dropped entirely. */
  xml: string | null;
  total: number;
  used: number;
  truncated: boolean;
  /** Raw excerpt text that went into the prompt (for the novel-number reference). */
  text: string;
}

/** Cuts at the last sentence end within the budget; falls back to a word boundary. */
function sliceAtSentence(text: string, budget: number): string {
  const head = text.slice(0, budget);
  const sentenceEnd = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "), head.lastIndexOf("\n"));
  if (sentenceEnd > budget / 2) return `${head.slice(0, sentenceEnd + 1).trimEnd()}…`;
  const space = head.lastIndexOf(" ");
  return `${(space > 0 ? head.slice(0, space) : head).trimEnd()}…`;
}

/** spec-prompts-review.md A3: series order, total excerpt characters capped by `maxChars`. */
export function buildSourcesBlock(all: SourceExcerpt[], maxChars: number): SourcesBlock {
  const usable = all.filter((s) => s.excerpt.trim().length > 0);
  const lines: string[] = [];
  const texts: string[] = [];
  let left = maxChars;
  let truncated = false;
  for (const [index, s] of usable.entries()) {
    const full = s.excerpt.trim();
    if (left < MIN_SOURCE_SLICE_CHARS && left < full.length) {
      truncated = true;
      break;
    }
    const excerpt = full.length <= left ? full : sliceAtSentence(full, left);
    truncated ||= excerpt !== full;
    left -= Math.min(full.length, left);
    texts.push(excerpt);
    lines.push(tag("source", { id: `S${index + 1}`, title: s.title, author: s.author ?? undefined, year: s.year ?? undefined, locator: s.locator }, excerpt));
  }
  return {
    xml: lines.length ? `<sources>\n${lines.join("\n")}\n</sources>` : null,
    total: usable.length,
    used: lines.length,
    truncated,
    text: texts.join("\n"),
  };
}

/** `<series>` and `<episode>` open every compose prompt (stable context first). */
export function contextTags(series: SeriesContext, episode: SeriesContext, limits: { series: number; episode: number }): string[] {
  return [
    tag("series", { title: series.title }, series.description ? clip(series.description, limits.series) : undefined),
    tag("episode", { title: episode.title }, episode.description ? clip(episode.description, limits.episode) : undefined),
  ];
}
