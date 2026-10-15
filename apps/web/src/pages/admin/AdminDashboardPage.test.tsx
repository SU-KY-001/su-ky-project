import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { adminNavigation, ReleaseObservationView } from "./AdminDashboardPage";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

const schedules = [{
  id: "schedule-1",
  title: "Dấu chân Trường Sơn",
  status: "SCHEDULED",
  productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
  scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
  assignments: [{ moderatorId: "moderator-1", moderator: { name: "Nguyễn Minh Anh" } }],
  reviews: [{ status: "IN_REVIEW", revision: 4 }],
}] as unknown as ReleaseScheduleRecord[];

it("keeps release schedules and review queue without a separate coordination item", () => {
  const labels = adminNavigation("overview", () => undefined).map(({ label }) => label);
  expect(labels).toContain("Lịch phát hành");
  expect(labels).toContain("Hàng chờ kiểm duyệt");
  expect(labels).not.toContain("Điều phối sản xuất");
});

it("uses a status badge for the review queue", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(<ReleaseObservationView schedules={schedules} />);
  });

  expect(host.querySelector('[data-card-badge-type="status"]')?.textContent).toBe("Chờ kiểm duyệt");
});
