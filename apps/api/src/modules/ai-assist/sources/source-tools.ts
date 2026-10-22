import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { ReviewSource, SourcePageStore, SourceToolkit, ToolResultEvent } from "../ai-assist.types";

export const SEARCH_LIMIT = 5;
export const MAX_PAGES_PER_READ = 3;
const FETCH_TOOL = "fetch_content";
const STORED_CONTENT_TOOL = "get_search_content";
const BUDGET_EXHAUSTED = "Tool budget exhausted. Stop and answer with what you have.";

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }], details: undefined };
}

function field(source: unknown, key: string): unknown {
  return source && typeof source === "object" ? Reflect.get(source, key) : undefined;
}

/** Same document, different spelling (fragment, trailing slash, host case) must match; an unparsable URL only matches itself. */
function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return raw.trim();
  }
}

/** The single URL a web tool result belongs to, or null when it cannot be attributed (multi-URL fetch, answer mode, by-index lookups). */
function fetchedUrl(event: ToolResultEvent): string | null {
  const { args } = event;
  if (event.toolName === FETCH_TOOL) {
    if (field(args, "mode") === "answer") return null;
    const url = field(args, "url");
    if (typeof url === "string") return url;
    const urls = field(args, "urls");
    return Array.isArray(urls) && urls.length === 1 && typeof urls[0] === "string" ? urls[0] : null;
  }
  if (event.toolName === STORED_CONTENT_TOOL) {
    const url = field(args, "url");
    return typeof url === "string" ? url : null;
  }
  return null;
}

/**
 * Read-only tools over the session's PDF sources plus a record of what the agent really opened:
 * PDF pages (read_pages) and text of web fetches of each URL source's registered URL.
 * Only the (sourceId, version) pairs in `sources` are reachable; a model-supplied label outside them is rejected.
 */
export function buildSourceToolkit(input: { store: SourcePageStore; sources: ReviewSource[]; maxToolCalls: number }): SourceToolkit {
  const { store, maxToolCalls } = input;
  const pdfSources = input.sources.filter((s) => s.kind === "PDF");
  const byLabel = new Map(pdfSources.map((s) => [s.label.toUpperCase(), s]));
  const labelOf = new Map(pdfSources.map((s) => [s.sourceId, s.label]));
  const urlSources = input.sources.filter((s) => s.kind === "URL" && s.url);
  const sourceIdsByUrl = new Map<string, string[]>();
  for (const s of urlSources) {
    const key = normalizeUrl(s.url!);
    sourceIdsByUrl.set(key, [...(sourceIdsByUrl.get(key) ?? []), s.sourceId]);
  }

  const openedPages = new Map<string, string>();
  const fetchedBySource = new Map<string, string[]>();
  let toolCalls = 0;
  const overBudget = () => ++toolCalls > maxToolCalls;

  const search = {
    name: "search_source",
    label: "Search source",
    description: `Full-text search in the PDF sources (${pdfSources.map((s) => `${s.label} = ${s.title}`).join("; ")}). Diacritics are ignored when matching. Returns up to ${SEARCH_LIMIT} pages across all sources, each with a short excerpt and its source label. Use distinctive names, years, places. Retry with other wording (reign names, old place names) if nothing found.`,
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Words to look for, e.g. 'Ngô Quyền Bạch Đằng Nam Hán'" } },
      required: ["query"],
      additionalProperties: false,
    },
    async execute(_id: string, params: { query: string }) {
      if (overBudget()) return textResult(BUDGET_EXHAUSTED);
      const hits = await store.search(pdfSources.map((s) => ({ sourceId: s.sourceId, version: s.version })), String(params.query ?? ""), SEARCH_LIMIT);
      if (!hits.length) return textResult("No page matches.");
      return textResult(hits.map((h) => `[${labelOf.get(h.sourceId)}] p.${h.page}: ${h.excerpt}`).join("\n"));
    },
  };

  const read = {
    name: "read_pages",
    label: "Read pages",
    description: `Read the full text of source pages from..to (inclusive, max ${MAX_PAGES_PER_READ} pages per call) of one PDF source given by its label (S1, S2...). Page numbers are the ones returned by search_source. Quote only text you actually read here.`,
    parameters: {
      type: "object",
      properties: {
        source: { type: "string", description: "Source label, e.g. S1" },
        from: { type: "integer", minimum: 1 },
        to: { type: "integer", minimum: 1 },
      },
      required: ["source", "from", "to"],
      additionalProperties: false,
    },
    async execute(_id: string, params: { source: string; from: number; to: number }) {
      if (overBudget()) return textResult(BUDGET_EXHAUSTED);
      const source = byLabel.get(String(params.source ?? "").trim().toUpperCase());
      if (!source) return textResult(`Unknown source. Use one of: ${[...labelOf.values()].join(", ")}.`);
      const from = Math.floor(params.from);
      const to = Math.min(Math.floor(params.to), from + MAX_PAGES_PER_READ - 1);
      if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from) return textResult("Page range invalid.");
      const pages = await store.readPages(source.sourceId, source.version, from, to);
      if (!pages.length) return textResult(`${source.label} has no pages in ${from}-${to}.`);
      for (const p of pages) openedPages.set(`${source.sourceId}:${p.page}`, p.text);
      return textResult(pages.map((p) => `--- ${source.label} p.${p.page} ---\n${p.text}`).join("\n"));
    },
  };

  return {
    customTools: pdfSources.length ? ([search, read] as unknown as ToolDefinition[]) : [],

    onToolResult(event) {
      toolCalls += event.toolName === FETCH_TOOL || event.toolName === STORED_CONTENT_TOOL ? 1 : 0;
      if (event.isError || !event.text) return;
      const url = fetchedUrl(event);
      if (!url) return;
      for (const sourceId of sourceIdsByUrl.get(normalizeUrl(url)) ?? []) {
        fetchedBySource.set(sourceId, [...(fetchedBySource.get(sourceId) ?? []), event.text]);
      }
    },

    openedText(sourceId, page) {
      const fetched = fetchedBySource.get(sourceId);
      if (fetched) return fetched.join("\n");
      return openedPages.get(`${sourceId}:${page}`);
    },

    stats: () => ({ toolCalls }),
  };
}
