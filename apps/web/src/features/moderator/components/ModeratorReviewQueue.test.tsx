import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ModeratorReviewQueueView } from "./ModeratorReviewQueue";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

it("opens the review surface with the waiting revision and offers no decision without content", async () => {
  const onReview = mock(() => undefined);
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
        onReview={onReview}
      />,
    );
  });
  expect(host.textContent).toContain("Hàng chờ kiểm duyệt");
  expect(host.querySelector('[data-card-badge-type="status"]')?.textContent).toBe("Chờ kiểm duyệt");
  const buttons = [...host.querySelectorAll("button")].map((item) => item.textContent ?? "");
  expect(buttons.some((text) => text.includes("Duyệt nội dung") || text.includes("Yêu cầu chỉnh sửa"))).toBe(false);
  await act(async () => [...host.querySelectorAll("button")].find((item) => item.textContent?.includes("Xem và kiểm duyệt"))?.click());
  expect(onReview).toHaveBeenCalledWith({ scheduleId: "schedule-1", title: "Dấu chân Trường Sơn", revision: 4 });
});
