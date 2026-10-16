import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReleaseReassignmentTicket, ReleaseScheduleRecord } from "@repo/shared";
import { ModeratorTicketsView } from "./ModeratorTickets";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

function assignment(): ReleaseScheduleRecord {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Dấu chân Trường Sơn",
    episodeId: "00000000-0000-4000-8000-000000000002",
    episode: { title: "Ký ức đường mòn", contentRevision: 2 },
    productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
    scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
    assignments: [],
    reviews: [],
  } as unknown as ReleaseScheduleRecord;
}

function ticket(status: ReleaseReassignmentTicket["status"]): ReleaseReassignmentTicket {
  return {
    id: "00000000-0000-4000-8000-000000000003",
    scheduleId: assignment().id,
    requestedById: "mod-1",
    reason: "Lịch công tác đột xuất kéo dài qua hạn sản xuất.",
    status,
    replacementModeratorId: null,
    resolvedById: null,
    decisionReason: status === "REJECTED" ? "Chưa có nhân sự thay thế phù hợp." : null,
    resolvedAt: null,
    cancelledAt: null,
    createdAt: new Date("2026-10-16T08:00:00.000Z"),
    updatedAt: new Date("2026-10-16T08:00:00.000Z"),
    requestedBy: { id: "mod-1", name: "Nguyễn An", email: "an@example.org" },
    replacementModerator: null,
    schedule: assignment(),
  };
}

it("uses direct detail buttons and keeps pending-only actions inside the dialog", async () => {
  const edit = mock(() => undefined);
  const cancel = mock(() => true);
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => root?.render(
    <ModeratorTicketsView
      tickets={[ticket("PENDING"), { ...ticket("REJECTED"), id: "00000000-0000-4000-8000-000000000004" }]}
      assignments={[assignment()]}
      busy={false}
      onCreate={mock(() => Promise.resolve())}
      onEdit={edit}
      onCancel={cancel}
    />,
  ));

  expect(host.textContent).toContain("Dấu chân Trường Sơn");
  expect(host.textContent).toContain("Ký ức đường mòn");
  expect(host.textContent).toContain("Lịch công tác đột xuất");
  expect(host.textContent).toContain("Chưa có nhân sự thay thế phù hợp");
  expect(host.querySelectorAll('[data-slot="dashboard-row-actions"]')).toHaveLength(2);
  expect(
    [...host.querySelectorAll("button")].some(
      (button) => button.textContent?.trim() === "Thao tác",
    ),
  ).toBe(false);
  const detailButton = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Xem chi tiết Dấu chân Trường Sơn"]',
  );
  await act(async () => detailButton?.click());
  expect(document.body.textContent).toContain("Chi tiết ticket");
  expect(document.body.textContent).toContain("Chỉnh sửa");
  expect(document.body.textContent).toContain("Hủy ticket");
  expect(cancel).not.toHaveBeenCalled();
});

it("opens a create dialog with the assigned schedule and reason fields", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(
    <ModeratorTicketsView
      tickets={[]}
      assignments={[assignment()]}
      busy={false}
      onCreate={mock(() => Promise.resolve())}
      onEdit={mock(() => undefined)}
      onCancel={mock(() => true)}
    />,
  ));

  const createButton = [...host.querySelectorAll("button")].find((button) => button.textContent?.includes("Tạo ticket"))!;
  await act(async () => createButton.click());
  expect(document.body.textContent).toContain("Báo không thể tiếp tục nhiệm vụ");
  expect(document.body.querySelector('[aria-label="Nhiệm vụ cần chuyển giao"]')).not.toBeNull();
  expect(document.body.querySelector('textarea[aria-label="Lý do không thể thực hiện"]')).not.toBeNull();
});
