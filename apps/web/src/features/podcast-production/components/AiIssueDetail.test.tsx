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

const applyButton = (host: HTMLElement) => [...host.querySelectorAll("button")].find((button) => button.textContent?.includes("Áp dụng đề xuất"));

it("shows a conflict warning and disables apply when the suggested block moved or changed", () => {
  const host = render(item(), null, {
    kind: "conflict",
    text: "Đoạn đã đổi, chạy lại. Hệ thống không ghi đè chữ của bạn.",
  });
  expect(host.textContent).toContain("Đoạn đã đổi, chạy lại");
  expect(applyButton(host)?.disabled).toBe(true);
});

it("renders the apply action only when the current block is still available", () => {
  const host = render(item(), "Mốc thời gian cũ");
  expect(applyButton(host)?.disabled).toBe(false);
});

it("shows kind, severity and block number, with the suggestion before the sources", () => {
  const host = render(item({ blockRef: "b2", evidence: [{ sourceId: "s", page: 110, quote: "Câu gốc" }] }), "Mốc thời gian cũ");
  expect(host.textContent).toContain("Nghi sai");
  expect(host.textContent).toContain("Mức cao");
  expect(host.textContent).toContain("Đoạn 3");
  expect(host.textContent).toContain("Nguồn thử, tr. 110");
  const text = host.textContent ?? "";
  expect(text.indexOf("Đề xuất sửa")).toBeLessThan(text.indexOf("Nguồn đối chiếu"));
});

it("labels NOT_FOUND as not found in sources and explains it is not a verdict", () => {
  const host = render(item({ basis: "NOT_FOUND", suggestion: null }), null);
  expect(host.textContent).toContain("Chưa thấy trong nguồn");
  expect(host.textContent).toContain("Điều đó không có nghĩa là sai");
  expect(applyButton(host)).toBeUndefined();
});

it("after apply shows the green undo hint and hides the apply button", () => {
  const host = render(item({ appliedAt: new Date() }), null);
  expect(host.textContent).toContain("Đã áp dụng vào đoạn này. Bấm Ctrl+Z trong editor để hoàn tác.");
  expect(applyButton(host)).toBeUndefined();
});
