import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { ReleaseHistory } from "./ReleaseHistory";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

function schedule(status: string): ReleaseScheduleRecord {
  return {
    id: `schedule-${status}`,
    title: "Dấu chân Trường Sơn",
    status,
    scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
    productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
    updatedAt: new Date("2026-10-20T13:00:00.000Z"),
    publishedAt: status === "RELEASED" ? new Date("2026-10-20T13:00:00.000Z") : null,
    cancelledAt: null,
    assignments: [
      { moderatorId: "moderator-1", moderator: { name: "Nguyễn Minh Anh" } },
      { moderatorId: "moderator-2", moderator: { name: "Trần Hoàng Nam" } },
    ],
  } as unknown as ReleaseScheduleRecord;
}

it("renders release history as a filterable paginated dashboard table", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(
      <ReleaseHistory
        schedules={[schedule("RELEASED")]}
        page={1}
        limit={10}
        total={12}
        search=""
        status=""
        from=""
        to=""
        onSearchChange={() => undefined}
        onStatusChange={() => undefined}
        onFromChange={() => undefined}
        onToChange={() => undefined}
        onPageChange={() => undefined}
      />,
    );
  });

  expect(host.querySelectorAll('[data-card-badge-type="name"]')).toHaveLength(2);
  expect(host.querySelector('[data-card-badge-type="status"]')?.textContent).toBe("Đã phát hành");
  expect(host.querySelector('[data-dashboard-table-card="true"]')).not.toBeNull();
  expect(host.querySelector("table")).not.toBeNull();
  expect(host.querySelector('input[placeholder="Tìm trong lịch sử phát hành"]')).not.toBeNull();
  expect(host.querySelector('nav[aria-label="Phân trang"]')).not.toBeNull();
});
