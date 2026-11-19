import { expect, it } from "bun:test";
import { hashBlockText, type AiCheckItem } from "@repo/shared";
import { buildBlocks } from "./blockRefs";
import { blockHighlights, blockNumber, conflictNoticeText, issueLabel, savedAtLabel, severityLabel, stripDoubtTail, traceLine } from "./presentation";

const item = (patch: Partial<AiCheckItem> = {}): AiCheckItem => ({
  id: "00000000-0000-4000-8000-000000000001", checkId: "00000000-0000-4000-8000-000000000002", seq: 0,
  blockRef: "b0", blockHash: hashBlockText("A"), blockPrevHash: "", blockDup: 1,
  kind: "FACT_DOUBT", severity: "HIGH", basis: "CONTRADICTED", evidence: [], message: "m", suggestion: "S",
  status: "OPEN", appliedAt: null, createdAt: new Date(), updatedAt: new Date(), ...patch,
});

it("labels by kind first, then by basis", () => {
  expect(issueLabel({ kind: "FACT_DOUBT", basis: "CONTRADICTED" })).toEqual({ text: "Nghi sai", tone: "danger" });
  expect(issueLabel({ kind: "FACT_DOUBT", basis: "NOT_FOUND" })).toEqual({ text: "Chưa thấy trong nguồn", tone: "muted" });
  expect(issueLabel({ kind: "READABILITY", basis: "NOT_FOUND" })).toEqual({ text: "Đọc thành tiếng", tone: "info" });
});

it("names severity and numbers blocks from 1", () => {
  expect([severityLabel("HIGH"), severityLabel("MEDIUM"), severityLabel("LOW")]).toEqual(["Mức cao", "Mức vừa", "Mức thấp"]);
  expect(blockNumber("b0")).toBe(1);
  expect(blockNumber("b11")).toBe(12);
});

it("never reports a conflict for an applied item", () => {
  expect(conflictNoticeText(item(), "conflict")).toContain("Đoạn đã đổi, chạy lại");
  expect(conflictNoticeText(item({ appliedAt: new Date() }), "conflict")).toBeNull();
  expect(conflictNoticeText(item(), "b0")).toBeNull();
  expect(conflictNoticeText(item({ suggestion: null }), "conflict")).toBeNull();
});

it("cuts the model's own doubt disclaimer off the list text but keeps a message that is only that", () => {
  expect(stripDoubtTail("Sai mốc. AI nghi ngờ, chưa xác minh.")).toBe("Sai mốc.");
  expect(stripDoubtTail("AI nghi ngờ mốc này")).toBe("AI nghi ngờ mốc này");
});

it("builds the trace line with cited pages and duration", () => {
  const startedAt = new Date("2026-10-22T10:00:00Z");
  const finishedAt = new Date("2026-10-22T10:00:12.34Z");
  const withPages = traceLine({ toolCalls: 5, startedAt, finishedAt }, [
    { evidence: [{ sourceId: "s", page: 214, quote: "q" }, { sourceId: "s", page: 110, quote: "q" }] },
    { evidence: [{ sourceId: "s", page: 110, quote: "q" }] },
  ]);
  expect(withPages).toBe("AI đã tra nguồn 5 lần, dẫn tr. 110, 214, mất 12.3 giây.");
  expect(traceLine({ toolCalls: 0, startedAt, finishedAt }, [])).toBe("AI đã tra nguồn 0 lần, không dẫn trang nào, mất 12.3 giây.");
});

it("formats the saved time as hh:mm", () => {
  expect(savedAtLabel(new Date(2026, 9, 22, 9, 5))).toMatch(/^Đã lưu 0?9:05$/);
});

it("highlights orange for pending, green for applied, blue for the open one", () => {
  const blocks = buildBlocks(["A", "B", "C"]);
  const pending = item({ id: "00000000-0000-4000-8000-000000000011" });
  const other = item({ id: "00000000-0000-4000-8000-000000000012", blockRef: "b1", blockHash: hashBlockText("B"), blockPrevHash: hashBlockText("A") });
  expect(blockHighlights([pending, other], blocks, null)).toEqual([{ ref: "b0", kind: "flag" }, { ref: "b1", kind: "flag" }]);
  expect(blockHighlights([pending, other], blocks, other.id)).toEqual([{ ref: "b0", kind: "flag" }, { ref: "b1", kind: "current" }]);
});

it("keeps an applied block green by slot even though its hash no longer matches", () => {
  const blocks = buildBlocks(["A đã sửa", "B"]);
  const applied = item({ appliedAt: new Date() });
  expect(blockHighlights([applied], blocks, null)).toEqual([{ ref: "b0", kind: "applied" }]);
  expect(blockHighlights([item()], blocks, null)).toEqual([]);
});
