import { AI_CHECK_MAX_EVIDENCE } from "@repo/shared";
import type { CheckBlock, EvidenceItem, ReviewSource, SourceToolkit, ValidatedItem } from "../ai-assist.types";
import type { ScriptReviewOutput } from "../schemas/script-review.schema";
import { quoteInPage } from "../sources/quote-check";

export const MAX_MESSAGE_CHARS = 400;
export const SUGGESTION_MIN_RATIO = 0.4;
export const SUGGESTION_MAX_RATIO = 1.6;
/** A URL source is one whole document: stored evidence always points at page 1. */
export const URL_EVIDENCE_PAGE = 1;
const UNSOURCED_SUFFIX = "AI nghi ngờ, chưa xác minh.";

// `\b` is ASCII-only in JS and never matches before "đ", so word edges are spelled with Unicode lookarounds.
const FORBIDDEN_WORDING = /(?<![\p{L}\p{N}])đã (được )?(kiểm tra|xác minh|xác thực)(?![\p{L}\p{N}])/iu;
const MARKDOWN_LINE = /^\s*(#|-|\*|```)/m;
const NEEDS_SOURCE_MARK = "[CẦN NGUỒN]";
const CONTROL_CHARS = /[\u0000-\u0009\u000b-\u001f\u007f]/g;
const SEVERITY_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;

type RawItem = ScriptReviewOutput["items"][number];

/** NFC, unescape the three XML characters we escaped on the way in, drop control chars, trim. */
const clean = (s: string) =>
  s
    .normalize("NFC")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(CONTROL_CHARS, "")
    .trim();

const squash = (s: string) => clean(s).replace(/\s+/g, " ");

function truncateAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > 0 ? cut.slice(0, space) : cut).trimEnd();
}

function checkSuggestion(raw: string, block: string, trusted: string[]): string | null {
  const suggestion = clean(raw);
  if (!suggestion || suggestion.includes(NEEDS_SOURCE_MARK) || MARKDOWN_LINE.test(suggestion)) return null;
  if (squash(suggestion) === squash(block)) return null;
  const ratio = suggestion.length / Math.max(block.length, 1);
  if (ratio < SUGGESTION_MIN_RATIO || ratio > SUGGESTION_MAX_RATIO) return null;
  const known = new Set((`${block} ${trusted.join(" ")}`.match(/\d+/g)) ?? []);
  const invented = (suggestion.match(/\d+/g) ?? []).some((n) => !known.has(n));
  return invented ? null : suggestion;
}

interface Candidate {
  item: ValidatedItem;
  confirmed: boolean;
}

/** spec-source-agent section 6 + spec-prompts-review B5. Pure: the only truth guarantee is "the quote is on text the agent opened". */
export function validateItems(input: {
  output: ScriptReviewOutput;
  batch: CheckBlock[];
  labelToSource: Map<string, ReviewSource>;
  openedText: SourceToolkit["openedText"];
}): ValidatedItem[] {
  const blocks = new Map(input.batch.map((b) => [b.ref, b]));
  const byBlock = new Map<string, Candidate[]>();

  for (const raw of input.output.items) {
    const block = blocks.get(clean(raw.blockRef));
    if (!block) continue;
    let message = clean(raw.message);
    if (!message || FORBIDDEN_WORDING.test(message)) continue;
    message = truncateAtWord(message, MAX_MESSAGE_CHARS);

    const evidence = verifiedEvidence(raw, input);
    let basis = raw.basis;
    let severity = raw.severity;
    const confirmed = basis === "CONTRADICTED" && evidence.length > 0;
    if (basis === "CONTRADICTED" && !confirmed) {
      basis = "NOT_FOUND";
      message = downgradeMessage(raw, input.labelToSource);
    }
    if (basis === "NOT_FOUND") severity = "LOW";

    const suggestion = confirmed ? checkSuggestion(raw.suggestion, block.text, evidence.map((e) => e.quote)) : null;
    const item: ValidatedItem = {
      blockRef: block.ref,
      blockHash: block.hash,
      blockPrevHash: block.prev,
      blockDup: block.dup,
      kind: "FACT_DOUBT",
      severity,
      basis,
      message,
      suggestion,
      evidence: confirmed ? evidence : [],
    };
    byBlock.set(block.ref, [...(byBlock.get(block.ref) ?? []), { item, confirmed }]);
  }

  return input.batch.flatMap((b) => bestPerBlock(byBlock.get(b.ref) ?? []));
}

/** Dedupe by (blockRef, kind): kind is always FACT_DOUBT, so exactly one survivor per block (the per-block cap is therefore 1). Confirmed first, then severity, then model order. */
function bestPerBlock(candidates: Candidate[]): ValidatedItem[] {
  const [best] = [...candidates].sort(
    (a, b) => Number(b.confirmed) - Number(a.confirmed) || SEVERITY_RANK[b.item.severity] - SEVERITY_RANK[a.item.severity],
  );
  return best ? [best.item] : [];
}

function verifiedEvidence(
  raw: RawItem,
  input: { labelToSource: Map<string, ReviewSource>; openedText: SourceToolkit["openedText"] },
): EvidenceItem[] {
  const kept: EvidenceItem[] = [];
  for (const e of raw.evidence) {
    const source = input.labelToSource.get(clean(e.source));
    if (!source) continue;
    const page = source.kind === "URL" ? URL_EVIDENCE_PAGE : e.page;
    const text = input.openedText(source.sourceId, page);
    const quote = clean(e.quote);
    if (text === undefined || !quoteInPage(quote, text)) continue;
    kept.push({ sourceId: source.sourceId, page, quote });
    if (kept.length === AI_CHECK_MAX_EVIDENCE) break;
  }
  return kept;
}

function downgradeMessage(raw: RawItem, labels: Map<string, ReviewSource>): string {
  const pdf = raw.evidence.find((e) => labels.get(clean(e.source))?.kind === "PDF");
  const cited = pdf ? ` (AI nhắc tr. ${pdf.page})` : "";
  return `AI nghi ngờ đoạn này khác nguồn nhưng không dẫn được câu nguồn nguyên văn, nên hệ thống chưa xác nhận${cited}. ${UNSOURCED_SUFFIX}`;
}
