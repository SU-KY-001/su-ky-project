import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReleaseModeratorWorkload, ReleaseScheduleRecord } from "@repo/shared";
import { ReleaseWorkspaceToolbar } from "./ReleaseWorkspaceToolbar";
import { ReleaseScheduleTable } from "./ReleaseScheduleTable";
import { ReleaseAttentionPanel } from "./ReleaseAttentionPanel";
import { ModeratorWorkloadFilter } from "./ModeratorWorkloadFilter";

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

it("renders a controlled workspace toolbar with approved labels", () => {
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

  expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe("Kanban");
  const tableTab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((node) => node.textContent?.trim() === "Bảng")!;
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
  const create = [...host.querySelectorAll<HTMLButtonElement>("button")].find((node) => node.textContent?.includes("Tạo lịch phát hành"))!;
  act(() => create.click());
  expect(onCreate).toHaveBeenCalledTimes(1);
});

it("renders the traditional table including cancelled schedules and pagination", () => {
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
    />,
  );

  for (const heading of ["Lịch phát hành", "Người phụ trách", "Hạn sản xuất", "Thời gian phát hành", "Trạng thái"])
    expect(host.textContent).toContain(heading);
  expect(host.querySelectorAll('[data-card-badge-type="name"]')).toHaveLength(2);
  expect(host.querySelector('[data-card-badge-type="status"]')?.textContent).toBe("Đã hủy");
  act(() => host.querySelector("tbody tr")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  expect(onOpenEdit).toHaveBeenCalledWith(cancelled);
  const next = host.querySelector<HTMLButtonElement>('[aria-label="Trang sau"]')!;
  act(() => next.click());
  expect(onPageChange).toHaveBeenCalledWith(3);
});

it("exposes recovery commands and compact workload counts", () => {
  const callbacks = {
    onEdit: mock(() => undefined),
    onCheckReadiness: mock(() => undefined),
    onPublishNow: mock(() => undefined),
    onRetry: mock(() => undefined),
    onCancel: mock(() => undefined),
  };
  const host = render(
    <>
      <ReleaseAttentionPanel
        items={[schedule("BLOCKED"), schedule("FAILED")]}
        pendingIds={new Set()}
        {...callbacks}
      />
      <ModeratorWorkloadFilter
        items={[
          { moderatorId: "mod-1", name: "Nguyễn Minh Anh", open: 4, nearDeadline: 2 },
        ] satisfies ReleaseModeratorWorkload[]}
        selectedId=""
        onChange={() => undefined}
      />
    </>,
  );

  expect(host.textContent).toContain("Cần xử lý");
  for (const action of ["Chỉnh sửa", "Đánh giá lại", "Thử lại", "Phát hành ngay", "Hủy lịch"])
    expect(host.textContent).toContain(action);
  expect(host.textContent).toContain("4 lịch đang mở");
  expect(host.textContent).toContain("2 gần hạn");
  expect(host.textContent).not.toContain("Điều phối sản xuất");
});
