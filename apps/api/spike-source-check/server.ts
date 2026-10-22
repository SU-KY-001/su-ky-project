// SPIKE (not production): AI source check with a Pi session that may only query a local SQLite page store.
// Run from apps/api:  bun --env-file=../../.env spike-source-check/server.ts
import { Database } from "bun:sqlite";
import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { quoteInPage } from "../src/modules/ai-assist/sources/quote-check";
import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import { runStructuredAgent } from "../src/modules/ai-engine/structured-agent-runner";

const PORT = Number(process.env.SPIKE_PORT ?? 8799);
const DB_PATH = process.env.SPIKE_SOURCE_DB ?? "C:/Users/ADMIN/sk-extract/dvsktt-js.db";
const SOURCE_ID = process.env.SPIKE_SOURCE_ID ?? "toan-thu";
const SOURCE_TITLE = "Đại Việt sử ký toàn thư";
const MAX_TOOL_CALLS = Number(process.env.SPIKE_MAX_TOOL_CALLS ?? 14);
const RUN_TIMEOUT_MS = Number(process.env.SPIKE_RUN_TIMEOUT_MS ?? 150_000);
const SEARCH_LIMIT = 5;
const SNIPPET_TOKENS = 28;
const MAX_PAGES_PER_READ = 3;
const MAX_BLOCKS = 12;
const MAX_BLOCK_CHARS = 1500;
const DEFAULT_PROMPT_VERSION = "v3";
const RUN_RETRIES = Number(process.env.SPIKE_RUN_RETRIES ?? 2);
const RETRY_BASE_DELAY_MS = Number(process.env.SPIKE_RETRY_DELAY_MS ?? 4000);

const db = new Database(DB_PATH, { readonly: true });
const pageTextStmt = db.query<{ text: string }, [string, number]>("select text from source_pages where source_id = ? and page = ?");
const pageText = { get: (page: number) => pageTextStmt.get(SOURCE_ID, page) };
const pageCount = db.query<{ n: number }, [string]>("select count(*) n from source_pages where source_id = ?").get(SOURCE_ID)!.n;

const norm = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();

/** Free text -> safe FTS5 query: each word quoted, so the model can never inject FTS syntax. */
function ftsQuery(raw: string, joiner: "AND" | "OR"): string {
  const words = raw.normalize("NFC").split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 12);
  return words.map((w) => `"${w}"`).join(` ${joiner} `);
}

interface ToolLog { tool: string; args: unknown; pages: number[]; }

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }], details: undefined };
}

function buildTools(log: ToolLog[], readPages: Set<number>): ToolDefinition[] {
  let calls = 0;
  const guard = () => (++calls > MAX_TOOL_CALLS ? "Tool budget exhausted. Stop and answer with what you have." : null);

  const search = {
    name: "search_source",
    label: "Search source",
    description: `Full-text search in the source book "${SOURCE_TITLE}" (${pageCount} pages). Diacritics are ignored when matching. Returns up to ${SEARCH_LIMIT} pages with a short excerpt each. Use distinctive names, years, places. Retry with other wording (reign names, old place names) if nothing found.`,
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Words to look for, e.g. 'Ngô Quyền Bạch Đằng Nam Hán'" } },
      required: ["query"],
      additionalProperties: false,
    },
    async execute(_id: string, params: { query: string }) {
      const over = guard();
      if (over) return textResult(over);
      const run = (joiner: "AND" | "OR") =>
        db
          .query<{ page: number; ex: string }, [number, string, string, number]>(
            `select sp.page page, snippet(source_pages_fts, 0, '[', ']', '…', ?) ex from source_pages_fts join source_pages sp on sp.id = source_pages_fts.rowid where source_pages_fts match ? and sp.source_id = ? order by rank limit ?`
          )
          .all(SNIPPET_TOKENS, ftsQuery(params.query, joiner), SOURCE_ID, SEARCH_LIMIT);
      let hits: { page: number; ex: string }[] = [];
      try {
        const q = ftsQuery(params.query, "AND");
        hits = q ? run("AND") : [];
        if (!hits.length && q) hits = run("OR");
      } catch {
        return textResult("Invalid query. Use plain words.");
      }
      log.push({ tool: "search_source", args: params, pages: hits.map((h) => h.page) });
      if (!hits.length) return textResult("No page matches.");
      return textResult(hits.map((h) => `p.${h.page}: ${norm(h.ex)}`).join("\n"));
    },
  };

  const read = {
    name: "read_pages",
    label: "Read pages",
    description: `Read the full text of source pages from..to (inclusive, max ${MAX_PAGES_PER_READ} pages per call). Page numbers are the ones returned by search_source. Quote only text you actually read here.`,
    parameters: {
      type: "object",
      properties: { from: { type: "integer", minimum: 1 }, to: { type: "integer", minimum: 1 } },
      required: ["from", "to"],
      additionalProperties: false,
    },
    async execute(_id: string, params: { from: number; to: number }) {
      const over = guard();
      if (over) return textResult(over);
      const from = Math.max(1, Math.floor(params.from));
      const to = Math.min(pageCount, from + MAX_PAGES_PER_READ - 1, Math.floor(params.to));
      if (to < from) return textResult(`Page range invalid (source has ${pageCount} pages).`);
      const out: string[] = [];
      for (let p = from; p <= to; p++) {
        readPages.add(p);
        out.push(`--- p.${p} ---\n${pageText.get(p)?.text ?? ""}`);
      }
      log.push({ tool: "read_pages", args: params, pages: Array.from({ length: to - from + 1 }, (_, i) => from + i) });
      return textResult(out.join("\n"));
    },
  };

  return [search, read] as unknown as ToolDefinition[];
}

const BASIS = ["CONTRADICTED", "NOT_FOUND"] as const;
const ReportSchema = z.object({
  items: z.array(
    z.object({
      blockRef: z.string(),
      kind: z.literal("FACT_DOUBT"),
      severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
      basis: z.enum(BASIS),
      message: z.string().max(400),
      suggestion: z.string().nullable(),
      evidence: z.array(z.object({ page: z.number().int(), quote: z.string().max(400) })).max(3),
    })
  ),
});

// Prompts live in prompts/vN.txt so rounds can be A/B-measured without restarting the server.
const PROMPT_DIR = join(import.meta.dir, "prompts");

interface BlockIn { ref: string; text: string; }

function parseBody(body: unknown): { blocks: BlockIn[]; note: string; promptVersion: string } | string {
  const parsed = z
    .object({
      blocks: z.array(z.object({ ref: z.string().min(1).max(32), text: z.string().trim().min(1).max(MAX_BLOCK_CHARS) })).min(1).max(MAX_BLOCKS),
      note: z.string().max(500).optional(),
      promptVersion: z.string().regex(/^v\d+$/).default(DEFAULT_PROMPT_VERSION),
    })
    .safeParse(body);
  if (!parsed.success) return "Invalid body";
  return existsSync(join(PROMPT_DIR, `${parsed.data.promptVersion}.txt`)) ? { blocks: parsed.data.blocks, note: parsed.data.note ?? "", promptVersion: parsed.data.promptVersion } : "Unknown promptVersion";
}

async function check(blocks: BlockIn[], note: string, promptVersion: string) {
  const systemPrompt = readFileSync(join(PROMPT_DIR, `${promptVersion}.txt`), "utf8");
  const log: ToolLog[] = [];
  const readPages = new Set<number>();
  const startedAt = Date.now();
  const userPrompt = `<blocks>\n${blocks.map((b) => `<block ref="${b.ref}">${b.text}</block>`).join("\n")}\n</blocks>${note ? `\n<note>${note}</note>` : ""}\nSource: ${SOURCE_TITLE}. Check the blocks now.`;
  let attempts = 0;
  let report: z.infer<typeof ReportSchema>;
  // Provider hiccups (rate limit) surface as empty output -> "invalid JSON"; retry with backoff until phase 0 classifies them.
  for (;;) {
    attempts++;
    try {
      report = await Promise.race([
        runStructuredAgent({ systemPrompt, userPrompt, schema: ReportSchema, customTools: buildTools(log, readPages), label: "spike:source-check" }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("RUN_TIMEOUT")), RUN_TIMEOUT_MS)),
      ]);
      break;
    } catch (err) {
      if (attempts > RUN_RETRIES || (err instanceof Error && err.message === "RUN_TIMEOUT")) throw err;
      await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * attempts));
    }
  }

  const refs = new Set(blocks.map((b) => b.ref));
  const items = report.items.flatMap((it) => {
    if (!refs.has(it.blockRef)) return [];
    // Code-side proof: a quote counts only if it appears verbatim on a page the agent actually read.
    const evidence = it.evidence.filter((e) => readPages.has(e.page) && quoteInPage(e.quote, pageText.get(e.page)?.text ?? ""));
    const droppedEvidence = it.evidence.length - evidence.length;
    const basis = it.basis === "CONTRADICTED" && !evidence.length ? "NOT_FOUND" : it.basis;
    // The model's claim of a contradiction is unproven when its quote is not verbatim on a page it read.
    const cited = [...new Set(it.evidence.map((e) => e.page))].join(", ");
    const message = it.basis !== basis ? `AI nghi ngờ đoạn này khác với nguồn nhưng không dẫn được câu nguồn nguyên văn, nên hệ thống chưa xác nhận${cited ? ` (AI nhắc tr. ${cited})` : ""}. AI nghi ngờ, chưa xác minh.` : it.message;
    const droppedQuotes = it.evidence.filter((e) => !evidence.includes(e)).map((e) => ({ ...e, pageRead: readPages.has(e.page) }));
    return [{ ...it, message, basis, evidence, droppedEvidence, droppedQuotes, suggestion: basis === "CONTRADICTED" ? it.suggestion : null }];
  });
  return { promptVersion, attempts, items, trace: { toolCalls: log.length, pagesRead: [...readPages].sort((a, b) => a - b), calls: log, durationMs: Date.now() - startedAt } };
}

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, OPTIONS" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, "content-type": "application/json" } });

Bun.serve({
  port: PORT,
  idleTimeout: 255,
  async fetch(req) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (new URL(req.url).pathname !== "/check" || req.method !== "POST") return json({ error: "NOT_FOUND" }, 404);
    const body = parseBody(await req.json().catch(() => null));
    if (typeof body === "string") return json({ error: "BAD_REQUEST", message: body }, 400);
    try {
      return json(await check(body.blocks, body.note, body.promptVersion));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[spike] check failed:", message);
      return json({ error: message === "RUN_TIMEOUT" ? "RUN_TIMEOUT" : "AGENT_FAILED", message }, message === "RUN_TIMEOUT" ? 504 : 502);
    }
  },
});
console.log(`[spike] source-check on :${PORT}, db=${DB_PATH}, pages=${pageCount}`);
