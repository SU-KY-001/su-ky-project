import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AdminReleaseDashboardView } from "./AdminReleaseDashboard";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

it("presents release operations with approved business terminology", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <AdminReleaseDashboardView
        metrics={{ upcoming: 8, ready: 3, atRisk: 2, needsAttention: 1 }}
        schedules={[
          {
            id: "schedule-1",
            title: "Dấu chân Trường Sơn",
            status: "READY_TO_PUBLISH",
            scheduledAt: "2026-10-20T13:00:00.000Z",
            productionDeadline: "2026-10-19T13:00:00.000Z",
            assignments: [{ moderatorId: "moderator-1", moderator: { name: "Nguyễn Minh Anh" } }],
          },
        ]}
      />,
    );
  });
  expect(host.textContent).toContain("Theo dõi phát hành");
  expect(host.querySelector('[data-admin-overview="true"]')).not.toBeNull();
  expect(host.textContent).toContain("Nhịp vận hành");
  expect(host.textContent).toContain("Lối tắt điều hành");
  expect(host.textContent).toContain("Sắp phát hành");
  expect(host.textContent).toContain("Sẵn sàng phát hành");
  expect(host.textContent).toContain("Có nguy cơ trễ");
  expect(host.textContent).toContain("Cần xử lý");
  expect(host.textContent).not.toContain("Audit log");
  expect(host.querySelector('[data-card-badge-type="name"]')?.textContent).toBe("Nguyễn Minh Anh");
  expect(host.querySelector('[data-card-badge-type="status"]')?.textContent).toBe("Sẵn sàng phát hành");
  expect(host.querySelector('[data-dashboard-table-card="true"]')).not.toBeNull();
  expect(host.querySelector('[data-slot="table"]')).not.toBeNull();
  expect(host.querySelector(".mod-data-table")).not.toBeNull();
});
