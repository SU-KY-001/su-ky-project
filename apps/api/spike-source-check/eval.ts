/**
 * Measure a prompt version against the ground-truth scripts through the running spike server.
 *   bun spike-source-check/eval.ts v3 [repeats]                         live run, writes result-<ver>-<timestamp>.json
 *   bun spike-source-check/eval.ts v3 3 --rescore [result-file.json]    re-score a stored run (no model calls)
 */
import { Database } from "bun:sqlite";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { quoteInPage } from "../src/modules/ai-assist/sources/quote-check";
import { SCRIPTS, type Case } from "./eval-cases";

const URL = process.env.SPIKE_URL ?? "http://localhost:8799/check";
const DB_PATH = process.env.SPIKE_SOURCE_DB ?? "C:/Users/ADMIN/sk-extract/dvsktt-js.db";
const SOURCE_ID = process.env.SPIKE_SOURCE_ID ?? "toan-thu";
const PARALLEL = Number(process.env.EVAL_PARALLEL ?? 3);
const PACE_MS = Number(process.env.EVAL_PACE_MS ?? 3000);
const REQUEST_TIMEOUT_MS = 240_000;
const DEMOTED_PREFIX = "AI nghi ngờ đoạn này khác với nguồn nhưng";

interface Quote { page: number; quote: string; pageRead?: boolean; }
interface Item { blockRef: string; basis: string; message: string; evidence: Quote[]; droppedQuotes: Quote[]; }
interface Reply { items?: Item[]; attempts?: number; trace?: { toolCalls: number; durationMs: number }; error?: string; message?: string; }
interface Run { name: string; rep: number; reply: Reply; }

const db = new Database(DB_PATH, { readonly: true });
const pageStmt = db.query<{ text: string }, [string, number]>("select text from source_pages where source_id = ? and page = ?");
const pageText = (page: number) => pageStmt.get(SOURCE_ID, page)?.text ?? "";

/** Re-verify every stored quote with the CURRENT rule so old runs are scored like new ones. */
function reverify(reply: Reply): void {
  for (const it of reply.items ?? []) {
    const all = [...it.evidence, ...it.droppedQuotes];
    const ok = (q: Quote) => q.pageRead !== false && quoteInPage(q.quote, pageText(q.page));
    const wasContradiction = it.basis === "CONTRADICTED" || it.message.startsWith(DEMOTED_PREFIX);
    it.evidence = all.filter(ok).map(({ page, quote }) => ({ page, quote }));
    it.droppedQuotes = all.filter((q) => !ok(q)).map((q) => ({ ...q, pageRead: q.pageRead ?? true }));
    if (wasContradiction) it.basis = it.evidence.length ? "CONTRADICTED" : "NOT_FOUND";
  }
}

async function call(blocks: Case[], promptVersion: string): Promise<Reply> {
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ blocks: blocks.map((b) => ({ ref: b.ref, text: b.text })), promptVersion }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as Reply;
  } catch (err) {
    return { error: "CONNECTION", message: err instanceof Error ? err.message.slice(0, 80) : String(err) };
  }
}

async function liveRuns(ver: string, reps: number): Promise<Run[]> {
  const queue = Array.from({ length: reps }, (_, rep) => Object.keys(SCRIPTS).map((name) => ({ name, rep }))).flat();
  const runs: Run[] = [];
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      runs.push({ ...job, reply: await call(SCRIPTS[job.name]!, ver) });
      await Bun.sleep(PACE_MS);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return runs.sort((a, b) => a.name.localeCompare(b.name) || a.rep - b.rep);
}

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "n/a");
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

function score(ver: string, runs: Run[]): void {
  let tp = 0, soft = 0, miss = 0, clean = 0, fp = 0, softFalse = 0, quotes = 0, dropped = 0, fails = 0;
  const calls: number[] = [], secs: number[] = [], attempts: number[] = [];
  const verdicts: Record<string, string[]> = {};
  for (const { name, rep, reply } of runs) {
    if (!reply.items || !reply.trace) { fails++; console.log(`  FAIL ${name}#${rep}: ${reply.error} ${(reply.message ?? "").slice(0, 80)}`); continue; }
    calls.push(reply.trace.toolCalls); secs.push(reply.trace.durationMs / 1000); attempts.push(reply.attempts ?? 1);
    const byRef = new Map(reply.items.map((i) => [i.blockRef, i]));
    for (const it of reply.items) { quotes += it.evidence.length + it.droppedQuotes.length; dropped += it.droppedQuotes.length; }
    for (const { ref, truth } of SCRIPTS[name]!) {
      const it = byRef.get(ref);
      let key = "";
      if (truth === "BAD") {
        if (it?.basis === "CONTRADICTED" && it.evidence.length) { tp++; key = "TP"; } else if (it) { soft++; key = "SOFT"; } else { miss++; key = "MISS"; }
      } else if (truth === "OK") {
        if (!it) { clean++; key = "CLEAN"; } else if (it.basis === "CONTRADICTED") { fp++; key = "FP"; } else { softFalse++; key = "f"; }
      }
      if (key) (verdicts[ref] ??= []).push(key);
    }
  }
  const bad = tp + soft + miss, ok = clean + fp + softFalse;
  console.log(`== ${ver}: ${runs.length} requests, ${fails} failed after retries; retried ${attempts.filter((a) => a > 1).length}`);
  console.log(`BAD blocks ${bad}: verified-catch ${tp} (${pct(tp, bad)}), soft-only ${soft}, missed ${miss}`);
  console.log(`OK  blocks ${ok}: clean ${clean} (${pct(clean, ok)}), false CONTRADICTED ${fp}, soft false ${softFalse}`);
  console.log(`quotes ${quotes}, dropped (not verbatim) ${dropped} (${pct(dropped, quotes)})`);
  if (calls.length) console.log(`tool calls mean ${mean(calls).toFixed(1)}, latency mean ${mean(secs).toFixed(1)}s max ${Math.max(...secs).toFixed(1)}s`);
  console.log("per block:", Object.fromEntries(Object.entries(verdicts).sort().map(([k, v]) => [k, v.join(" ")])));
}

const [ver, repsArg, flag, storedFile] = process.argv.slice(2);
if (!ver) throw new Error("usage: bun eval.ts <promptVersion> [repeats] [--rescore]");
const resultFile = storedFile ?? join(import.meta.dir, `result-${ver}.json`);
let runs: Run[];
if (flag === "--rescore") {
  if (!existsSync(resultFile)) throw new Error(`no stored run ${resultFile}`);
  runs = (JSON.parse(readFileSync(resultFile, "utf8")).runs as [string, number, Reply][]).map(([name, rep, reply]) => ({ name, rep, reply }));
} else {
  runs = await liveRuns(ver, Number(repsArg ?? 3));
}
for (const r of runs) reverify(r.reply);
score(ver, runs);
if (flag !== "--rescore") writeFileSync(join(import.meta.dir, `result-${ver}-${Date.now()}.json`), JSON.stringify({ ver, runs: runs.map((r) => [r.name, r.rep, r.reply]) }));
