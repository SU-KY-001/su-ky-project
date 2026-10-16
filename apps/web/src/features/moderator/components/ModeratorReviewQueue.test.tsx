import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ModeratorReviewQueueView } from "./ModeratorReviewQueue";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

it("supports approval and requires a note when requesting changes", async () => {
  const decide = mock(() => undefined);
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <ModeratorReviewQueueView
        schedules={[{
          id: "schedule-1",
          title: "Dấu chân Trường Sơn",
          productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
          scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
          episode: { id: "episode-1", title: "Tập 1", contentRevision: 4 },
          reviews: [{ status: "IN_REVIEW", revision: 4 }],
        }]}
        onDecide={decide}
      />,
    );
  });
  expect(host.textContent).toContain("Hàng chờ kiểm duyệt");
  expect(host.querySelector('[data-card-badge-type="status"]')?.textContent).toBe("Chờ kiểm duyệt");
  expect(host.querySelector('[data-slot="textarea"]')).not.toBeNull();
  const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set?.call(
      textarea,
      "Cần bổ sung nguồn dẫn",
    );
    textarea.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  const requestChanges = [...host.querySelectorAll("button")].find((item) => item.textContent?.includes("Yêu cầu chỉnh sửa"));
  await act(async () => requestChanges?.click());
  expect(decide).toHaveBeenCalledWith("schedule-1", {
    decision: "REQUEST_CHANGES",
    contentRevision: 4,
    reviewNote: "Cần bổ sung nguồn dẫn",
  });
});
