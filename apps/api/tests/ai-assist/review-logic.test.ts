import { describe, expect, it } from "bun:test";
import type { CheckBlock, ReviewSource } from "../../src/modules/ai-assist/ai-assist.types";
import { batchBlocks } from "../../src/modules/ai-assist/input/batcher";
import type { ScriptReviewOutput } from "../../src/modules/ai-assist/schemas/script-review.schema";
import { validateItems } from "../../src/modules/ai-assist/validators/items";

const PAGE_TEXT = "Mùa thu năm 1010, vua Lý Thái Tổ dời đô từ Hoa Lư ra thành Đại La.";
const BLOCK_TEXT = "Năm 1100, vua Lý Thái Tổ dời đô từ Hoa Lư ra thành Đại La.";

const block = (ref: string, text = BLOCK_TEXT): CheckBlock => ({ ref, text, hash: `h-${ref}`, prev: `p-${ref}`, dup: 1 });
const pdf = (label: string, sourceId: string): ReviewSource => ({ sourceId, version: 1, label, title: label, kind: "PDF", url: null });
const web = (label: string, sourceId: string): ReviewSource => ({ sourceId, version: 1, label, title: label, kind: "URL", url: `https://example.org/${sourceId}` });

type RawItem = ScriptReviewOutput["items"][number];
const raw = (over: Partial<RawItem> = {}): RawItem => ({
  blockRef: "b0",
  kind: "FACT_DOUBT",
  severity: "HIGH",
  basis: "CONTRADICTED",
  message: "Nguồn ghi năm khác với kịch bản.",
  suggestion: "Năm 1010, vua Lý Thái Tổ dời đô từ Hoa Lư ra thành Đại La.",
  evidence: [{ source: "S1", page: 2, quote: PAGE_TEXT }],
  ...over,
});

/** `opened` maps "sourceId:page" (or just "sourceId" for URL sources) to the text the agent really opened. */
function run(items: RawItem[], opened: Record<string, string>, sources: ReviewSource[] = [pdf("S1", "src-1")], batch = [block("b0")]) {
  return validateItems({
    output: { items },
    batch,
    labelToSource: new Map(sources.map((s) => [s.label, s])),
    openedText: (sourceId, page) => opened[`${sourceId}:${page}`] ?? opened[sourceId],
  });
}

describe("validateItems", () => {
  it("keeps CONTRADICTED with a quote that is verbatim on the opened page, and copies the client's hashes", () => {
    const [item] = run([raw()], { "src-1:2": PAGE_TEXT });
    expect(item).toMatchObject({ basis: "CONTRADICTED", severity: "HIGH", blockHash: "h-b0", blockPrevHash: "p-b0", blockDup: 1 });
    expect(item!.evidence).toEqual([{ sourceId: "src-1", page: 2, quote: PAGE_TEXT }]);
    expect(item!.suggestion).toContain("1010");
  });

  it("downgrades to NOT_FOUND (LOW, no suggestion, no evidence) when the quote is not on the opened page", () => {
    const [item] = run([raw({ evidence: [{ source: "S1", page: 2, quote: "Câu này không có trong nguồn đã mở." }] })], { "src-1:2": PAGE_TEXT });
    expect(item).toMatchObject({ basis: "NOT_FOUND", severity: "LOW", suggestion: null, evidence: [] });
    expect(item!.message).toContain("AI nghi ngờ");
  });

  it("does not accept a page the agent never opened, even if the quote exists on that page", () => {
    const [item] = run([raw({ evidence: [{ source: "S1", page: 3, quote: PAGE_TEXT }] })], { "src-1:2": PAGE_TEXT });
    expect(item).toMatchObject({ basis: "NOT_FOUND", evidence: [] });
  });

  it("checks the pair (source, page): S1 page 1 opened does not validate a quote claimed from S2 page 1", () => {
    const sources = [pdf("S1", "src-1"), pdf("S2", "src-2")];
    const [item] = run([raw({ evidence: [{ source: "S2", page: 1, quote: PAGE_TEXT }] })], { "src-1:1": PAGE_TEXT }, sources);
    expect(item).toMatchObject({ basis: "NOT_FOUND", evidence: [] });
    const [kept] = run([raw({ evidence: [{ source: "S1", page: 1, quote: PAGE_TEXT }] })], { "src-1:1": PAGE_TEXT }, sources);
    expect(kept!.evidence).toEqual([{ sourceId: "src-1", page: 1, quote: PAGE_TEXT }]);
  });

  it("stores URL evidence on page 1 whatever page the model claims, and needs the fetched text", () => {
    const sources = [web("S1", "src-u")];
    const [kept] = run([raw({ evidence: [{ source: "S1", page: 7, quote: PAGE_TEXT }] })], { "src-u": PAGE_TEXT }, sources);
    expect(kept!.evidence).toEqual([{ sourceId: "src-u", page: 1, quote: PAGE_TEXT }]);
    const [dropped] = run([raw({ evidence: [{ source: "S1", page: 1, quote: PAGE_TEXT }] })], {}, sources);
    expect(dropped).toMatchObject({ basis: "NOT_FOUND" });
  });

  it("drops the suggestion (not the item) when it is unchanged, markdown, too short/long, or invents a number", () => {
    const opened = { "src-1:2": PAGE_TEXT };
    for (const suggestion of [BLOCK_TEXT, "- Năm 1010, vua dời đô.", "Năm 1010.", `${BLOCK_TEXT} ${BLOCK_TEXT} ${BLOCK_TEXT}`, "Năm 1010, vua Lý Thái Tổ dời đô từ Hoa Lư ra thành Đại La năm 938."]) {
      const [item] = run([raw({ suggestion })], opened);
      expect(item).toMatchObject({ basis: "CONTRADICTED", suggestion: null });
    }
  });

  it("drops items that claim certainty ('đã kiểm tra'), name an unknown block, or have no message", () => {
    const opened = { "src-1:2": PAGE_TEXT };
    expect(run([raw({ message: "Tôi đã kiểm tra và thấy sai." })], opened)).toEqual([]);
    expect(run([raw({ blockRef: "b99" })], opened)).toEqual([]);
    expect(run([raw({ message: "   " })], opened)).toEqual([]);
  });

  it("keeps one item per block: a confirmed one beats an unconfirmed one even when the latter is more severe", () => {
    const items = [raw({ severity: "HIGH", evidence: [{ source: "S1", page: 2, quote: "bịa" }] }), raw({ severity: "LOW" })];
    const result = run(items, { "src-1:2": PAGE_TEXT });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ basis: "CONTRADICTED", severity: "LOW" });
  });

  it("returns items in batch order and ignores model-supplied hashes", () => {
    const batch = [block("b0"), block("b1")];
    const result = run([raw({ blockRef: "b1" }), raw({ blockRef: "b0" })], { "src-1:2": PAGE_TEXT }, [pdf("S1", "src-1")], batch);
    expect(result.map((i) => i.blockRef)).toEqual(["b0", "b1"]);
  });

  it("truncates an over-long message at a word boundary", () => {
    const [item] = run([raw({ message: `${"từ ".repeat(300)}hết` })], { "src-1:2": PAGE_TEXT });
    expect(item!.message.length).toBeLessThanOrEqual(400);
    expect(item!.message.endsWith("từ")).toBe(true);
  });
});

describe("batchBlocks", () => {
  const blocks = (lengths: number[]) => lengths.map((n, i) => block(`b${i}`, "x".repeat(n)));
  const refs = (batches: CheckBlock[][]) => batches.map((b) => b.map((x) => x.ref));

  it("cuts a batch at maxBlocks and keeps order", () => {
    expect(refs(batchBlocks(blocks([1, 1, 1, 1, 1]), { maxBlocks: 2, maxChars: 100 }))).toEqual([["b0", "b1"], ["b2", "b3"], ["b4"]]);
  });

  it("cuts a batch when the next block would pass maxChars", () => {
    expect(refs(batchBlocks(blocks([40, 40, 40]), { maxBlocks: 10, maxChars: 100 }))).toEqual([["b0", "b1"], ["b2"]]);
  });

  it("gives an oversized block its own batch instead of dropping it, and returns no batch for no blocks", () => {
    expect(refs(batchBlocks(blocks([10, 500, 10]), { maxBlocks: 10, maxChars: 100 }))).toEqual([["b0"], ["b1"], ["b2"]]);
    expect(batchBlocks([], { maxBlocks: 2, maxChars: 100 })).toEqual([]);
  });
});
