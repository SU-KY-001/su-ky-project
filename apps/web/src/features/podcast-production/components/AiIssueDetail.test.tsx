import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { AiCheckItem } from "@repo/shared";
import { AiIssueDetail } from "./AiIssueDetail";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

const item = (patch: Partial<AiCheckItem> = {}): AiCheckItem =>
  ({
    id: "00000000-0000-4000-8000-000000000001",
    checkId: "00000000-0000-4000-8000-000000000002",
    seq: 0,
    blockRef: "b0",
    blockHash: "hash",
    blockPrevHash: "",
    blockDup: 1,
    kind: "FACT_DOUBT",
    severity: "HIGH",
    basis: "CONTRADICTED",
    evidence: [],
    message: "Cần đối chiếu lại mốc thời gian.",
    suggestion: "Mốc thời gian mới",
    status: "OPEN",
    appliedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...patch,
  }) as AiCheckItem;

function render(
  value: AiCheckItem,
  currentText: string | null,
  notice: { kind: "conflict" | "error"; text: string } | null = null,
) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      <AiIssueDetail
        item={value}
        currentText={currentText}
        sourceTitle={() => "Nguồn thử"}
        notice={notice}
        busy={false}
        onApply={mock(() => undefined)}
        onRerunSelection={mock(() => undefined)}
        onBack={mock(() => undefined)}
        onFinish={mock(() => undefined)}
      />,
    ),
  );
  return host;
}

it("shows a conflict warning and disables apply when the suggested block moved or changed", () => {
  const host = render(item(), null, {
    kind: "conflict",
    text: "Đoạn đã đổi, chạy lại. Chữ của bạn không bị ghi đè.",
  });
  expect(host.textContent).toContain("Đoạn đã đổi, chạy lại");
  expect(host.textContent).toContain("Chữ của bạn không bị ghi đè");
  expect(host.querySelector<HTMLButtonElement>("button")?.disabled).toBe(true);
});

it("renders the apply action only when the current block is still available", () => {
  const host = render(item(), "Mốc thời gian cũ");
  const apply = [...host.querySelectorAll("button")].find((button) => button.textContent?.includes("Áp dụng đề xuất"));
  expect(apply?.disabled).toBe(false);
});
