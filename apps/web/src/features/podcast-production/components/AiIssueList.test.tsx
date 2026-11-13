import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { AiCheck, AiCheckItem } from "@repo/shared";
import { AiIssueList } from "./AiIssueList";

let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

const check = (patch: Partial<AiCheck>): AiCheck => ({
  id: "00000000-0000-4000-8000-000000000001", episodeId: "00000000-0000-4000-8000-000000000002", kind: "SCRIPT_REVIEW", status: "SUCCEEDED",
  processedBlocks: 3, totalBlocks: 3, failedBlocks: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, errorCode: null,
  itemCounts: { open: 0, reviewed: 0 }, startedAt: new Date(), finishedAt: new Date(), ...patch,
});

function render(value: AiCheck, items: AiCheckItem[] = []): string {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<AiIssueList check={value} items={items} onOpen={() => undefined} onRerun={() => undefined} />));
  return container.textContent ?? "";
}

it("only says there are no warnings when the check fully succeeded, and never calls it verified", () => {
  const clean = render(check({}));
  expect(clean).toContain("AI không nêu cảnh báo nào");
  expect(clean).toContain("không có nghĩa kịch bản đã đúng");
  expect(clean).not.toMatch(/đã (kiểm tra|xác minh)/);
});

it("drops the no-warning line when blocks failed or the check failed", () => {
  const partial = render(check({ failedBlocks: 1 }));
  expect(partial).not.toContain("không nêu cảnh báo nào");
  expect(partial).toContain("1 đoạn AI không rà được");
  act(() => root?.unmount());
  const failed = render(check({ status: "FAILED", errorCode: "AI_PROVIDER_QUOTA" }));
  expect(failed).not.toContain("không nêu cảnh báo nào");
  expect(failed).toContain("Dịch vụ AI tạm không dùng được");
});

const row = (patch: Partial<AiCheckItem>): AiCheckItem => ({
  id: "00000000-0000-4000-8000-000000000010", checkId: "00000000-0000-4000-8000-000000000001", seq: 0, blockRef: "b1", blockHash: "h", blockPrevHash: "",
  blockDup: 1, kind: "FACT_DOUBT", severity: "MEDIUM", basis: "CONTRADICTED", evidence: [{ sourceId: "s", page: 110, quote: "q" }],
  message: "Sai mốc.", suggestion: null, status: "OPEN", appliedAt: null, createdAt: new Date(), updatedAt: new Date(), ...patch,
});

it("labels each row by kind and basis, with its block number and seen state", () => {
  const text = render(check({ toolCalls: 4 }), [
    row({ id: "00000000-0000-4000-8000-000000000011" }),
    row({ id: "00000000-0000-4000-8000-000000000012", basis: "NOT_FOUND", evidence: [], blockRef: "b2", status: "REVIEWED" }),
    row({ id: "00000000-0000-4000-8000-000000000013", kind: "READABILITY", evidence: [], blockRef: "b3", appliedAt: new Date() }),
  ]);
  expect(text).toContain("3 cảnh báo");
  expect(text).toContain("1 đã xem, 2 chưa xem");
  expect(text).toContain("Nghi sai");
  expect(text).toContain("Chưa thấy trong nguồn");
  expect(text).toContain("Đọc thành tiếng");
  expect(text).toContain("Đoạn 2");
  expect(text).toContain("đã áp dụng");
  expect(text).toContain("AI đã tra nguồn 4 lần, dẫn tr. 110");
});
