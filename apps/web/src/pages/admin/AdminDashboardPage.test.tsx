import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { adminNavigation, ReleaseObservationView } from "./AdminDashboardPage";
import { selectDashboardAction } from "@/test/dashboardActions";

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
  const navigation = adminNavigation("overview", () => undefined);
  const labels = navigation.map(({ label }) => label);
  expect(labels.slice(0, 3)).toEqual(["Điều hành", "Tổng quan", "Chuyển giao"]);
  expect(navigation[0]?.groupStart).toBe(true);
  expect(labels).toContain("Lịch phát hành");
  expect(labels).toContain("Hàng chờ kiểm duyệt");
  expect(labels).not.toContain("Điều phối sản xuất");
});

it("shows every Premium workflow and opens the selected destination from the sidebar", () => {
  const select = mock();
  const groups = adminNavigation("premium-audit", select);
  const premium = groups.filter(({ id }) => id.startsWith("admin-premium-"));
  expect(premium.map(({ label }) => label)).toEqual([
    "Gói thành viên", "Đơn hàng", "Sổ giao dịch", "Thành viên Premium", "Quyền truy cập", "Nhật ký Premium",
  ]);
  expect(groups.find(({ id }) => id === "premium-heading")?.groupStart).toBe(true);
  expect(premium.filter(({ active }) => active).map(({ id }) => id)).toEqual(["admin-premium-audit"]);
  for (const entry of premium) entry.onSelect?.();
  expect(select.mock.calls).toEqual([
    ["premium-plans"], ["premium-orders"], ["premium-transactions"], ["premium-members"], ["premium-policies"], ["premium-audit"],
  ]);
});

it("renders the review queue as a complete dashboard table", async () => {
  const onView = mock(() => undefined);
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(
      <ReleaseObservationView
        schedules={schedules}
        page={1}
        limit={10}
        total={11}
        search=""
        moderatorId=""
        moderators={[{ id: "moderator-1", name: "Nguyễn Minh Anh", email: "mod@example.org" }]}
        onSearchChange={() => undefined}
        onModeratorChange={() => undefined}
        onPageChange={() => undefined}
        onView={onView}
      />,
    );
  });

  expect(host.querySelector('[data-card-badge-type="status"]')?.textContent).toBe("Chờ kiểm duyệt");
  expect(host.querySelector('[data-dashboard-table-card="true"]')).not.toBeNull();
  expect(host.querySelector("table")).not.toBeNull();
  expect(host.textContent).toContain("Người sản xuất");
  expect(host.textContent).not.toContain("Phiên bản");
  expect(host.querySelector('input[placeholder="Tìm podcast chờ duyệt"]')).not.toBeNull();
  expect(host.querySelector('nav[aria-label="Phân trang"]')).not.toBeNull();
  expect(host.textContent).toContain("Thao tác");
  await selectDashboardAction("Dấu chân Trường Sơn", "Xem chi tiết", host);
  expect(onView).toHaveBeenCalledWith(schedules[0]);
});
