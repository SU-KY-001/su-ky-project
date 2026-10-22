import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { AiCheck } from "@repo/shared";
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

function render(value: AiCheck): string {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<AiIssueList check={value} items={[]} onOpen={() => undefined} />));
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
