import { afterEach, expect, it, mock } from "bun:test";
import { selectDashboardAction } from "@/test/dashboardActions";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { ReleaseWorkspaceToolbar } from "./ReleaseWorkspaceToolbar";
import { ReleaseScheduleTable } from "./ReleaseScheduleTable";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

function render(node: React.ReactNode) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(node));
  return host;
}

function schedule(status: ReleaseScheduleRecord["status"]): ReleaseScheduleRecord {
  return {
    id: `schedule-${status}`,
    title: `Lịch ${status}`,
    status,
    scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
    productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
    assignments: [
      { moderatorId: "mod-1", moderator: { name: "Nguyễn Minh Anh" } },
      { moderatorId: "mod-2", moderator: { name: "Trần Hoàng Nam" } },
    ],
  } as unknown as ReleaseScheduleRecord;
}

it("renders a controlled workspace toolbar with approved labels", async () => {
  const onViewChange = mock(() => undefined);
  const onSearchChange = mock(() => undefined);
  const onCreate = mock(() => undefined);
  const host = render(
    <ReleaseWorkspaceToolbar
      view="kanban"
      search=""
      moderatorId=""
      status=""
      from=""
      to=""
      moderators={[{ id: "mod-1", name: "Nguyễn Minh Anh", email: "a@example.org" }]}
      onViewChange={onViewChange}
      onSearchChange={onSearchChange}
      onModeratorChange={() => undefined}
      onStatusChange={() => undefined}
      onFromChange={() => undefined}
      onToChange={() => undefined}
      onCreate={onCreate}
    />,
  );

  expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe("Theo tiến độ");
  const tableTab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((node) => node.textContent?.trim() === "Danh sách")!;
  act(() => tableTab.click());
  expect(onViewChange).toHaveBeenCalledWith("table");
  const search = host.querySelector<HTMLInputElement>('input[placeholder="Tìm lịch phát hành"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, "Trường Sơn");
    search.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "Trường Sơn" }));
  });
  expect(onSearchChange).toHaveBeenCalledWith("Trường Sơn");
  expect(host.textContent).toContain("Người phụ trách");
  expect(host.textContent).toContain("Trạng thái");
  expect(host.textContent).toContain("Từ ngày");
  expect(host.textContent).toContain("Đến ngày");
  expect(host.querySelector('input[type="date"]')).toBeNull();
  expect(host.querySelector('button[aria-label="Chọn từ ngày"]')).not.toBeNull();
  expect(host.querySelector('button[aria-label="Chọn đến ngày"]')).not.toBeNull();
  await act(async () => {
    host.querySelector<HTMLButtonElement>('button[aria-label="Người phụ trách"]')?.click();
  });
  expect(document.body.querySelector('[data-slot="select-content"]')?.classList.contains("mod-select-content")).toBe(true);
  const create = [...host.querySelectorAll<HTMLButtonElement>("button")].find((node) => node.textContent?.includes("Tạo lịch phát hành"))!;
  act(() => create.click());
  expect(onCreate).toHaveBeenCalledTimes(1);
});

it("opens schedule details only from the action column and uses numbered pagination", async () => {
  const onOpenEdit = mock(() => undefined);
  const onPageChange = mock(() => undefined);
  const cancelled = schedule("CANCELLED");
  const host = render(
    <ReleaseScheduleTable
      items={[cancelled]}
      page={2}
      limit={10}
      total={25}
      onOpenEdit={onOpenEdit}
      onPageChange={onPageChange}
      toolbar={<div data-release-table-toolbar>Bộ lọc lịch phát hành</div>}
    />,
  );

  for (const heading of ["Lịch phát hành", "Người phụ trách", "Hạn sản xuất", "Thời gian phát hành", "Trạng thái"])
    expect(host.textContent).toContain(heading);
  expect(host.querySelectorAll('[data-card-badge-type="name"]')).toHaveLength(2);
  expect(host.querySelector('[data-card-badge-type="status"]')?.textContent).toBe("Đã hủy");
  expect(host.querySelector('[data-dashboard-table-card="true"]')).not.toBeNull();
  const table = host.querySelector<HTMLTableElement>("table")!;
  expect(table.closest(".mod-data-table")).not.toBeNull();
  expect(table.style.minWidth).toBe("1000px");
  expect(host.querySelector("thead th")?.classList.contains("py-4")).toBe(true);
  expect(host.querySelector("tbody td")?.classList.contains("py-3.5")).toBe(true);
  const toolbar = host.querySelector('[data-release-table-toolbar]')!;
  expect(toolbar.closest('[data-dashboard-table-card="true"]'))
    .toBe(host.querySelector('[data-dashboard-table-card="true"]'));
  act(() => host.querySelector("tbody tr")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  expect(onOpenEdit).not.toHaveBeenCalled();
  await selectDashboardAction(cancelled.title, "Xem chi tiết", host);
  expect(onOpenEdit).toHaveBeenCalledWith(cancelled);
  expect(host.querySelector('nav[aria-label="Phân trang"]')).not.toBeNull();
  expect(host.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe("2");
  const next = host.querySelector<HTMLButtonElement>('[aria-label="Trang sau"]')!;
  act(() => next.click());
  expect(onPageChange).toHaveBeenCalledWith(3);
});
