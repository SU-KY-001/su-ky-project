import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { ReleaseObservationView } from "./AdminDashboardPage";

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

it("uses a name badge for moderator workload", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(<ReleaseObservationView mode="coordination" schedules={schedules} />);
  });

  expect(host.querySelector('[data-card-badge-type="name"]')?.textContent).toBe("Nguyễn Minh Anh");
});

it("uses a status badge for the review queue", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(<ReleaseObservationView mode="reviews" schedules={schedules} />);
  });

  expect(host.querySelector('[data-card-badge-type="status"]')?.textContent).toBe("Chờ kiểm duyệt");
});
