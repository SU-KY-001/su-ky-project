import { selectDashboardAction } from "@/test/dashboardActions";
import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReleaseReassignmentTicket } from "@repo/shared";
import { AdminNotificationsView } from "./AdminNotifications";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

const moderators = [
  { id: "mod-1", name: "Nguyễn Minh Anh", email: "minhanh@example.org" },
  { id: "mod-2", name: "Trần Hoàng Nam", email: "nam@example.org" },
];

function ticket(status: ReleaseReassignmentTicket["status"] = "PENDING") {
  return {
    id: "00000000-0000-4000-8000-000000000010",
    scheduleId: "00000000-0000-4000-8000-000000000020",
    requestedById: "mod-1",
    reason: "Có lịch công tác đột xuất nên không thể hoàn thành đúng hạn.",
    status,
    replacementModeratorId: null,
    resolvedById: null,
    decisionReason: null,
    resolvedAt: null,
    cancelledAt: null,
    createdAt: new Date("2026-10-15T08:00:00.000Z"),
    updatedAt: new Date("2026-10-15T08:00:00.000Z"),
    requestedBy: moderators[0],
    replacementModerator: null,
    schedule: {
      id: "00000000-0000-4000-8000-000000000020",
      title: "Dấu chân Trường Sơn",
      productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
      scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
      episode: { id: "episode-1", title: "Bản nháp tập 3", contentRevision: 3 },
      assignments: [{ moderatorId: "mod-1", removedAt: null, moderator: moderators[0] }],
    },
  } as unknown as ReleaseReassignmentTicket;
}

function renderView(props: Partial<React.ComponentProps<typeof AdminNotificationsView>> = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const defaults: React.ComponentProps<typeof AdminNotificationsView> = {
    tickets: [],
    moderators,
    status: "PENDING",
    busy: false,
    onStatusChange: mock(() => undefined),
    onApprove: mock(() => Promise.resolve()),
    onReject: mock(() => Promise.resolve()),
    ...props,
  };
  act(() => root?.render(<AdminNotificationsView {...defaults} />));
  return { host, props: defaults };
}

it("renders a real empty ticket inbox without fake notification records", () => {
  const { host } = renderView();

  expect(host.querySelector('[data-admin-notifications="true"]')).not.toBeNull();
  expect(host.textContent).toContain("Thông báo & ticket");
  expect(host.textContent).toContain("Không có ticket phù hợp");
  expect(host.querySelectorAll("article")).toHaveLength(0);
});

it("keeps the ticket table concise and reveals full information from Xem chi tiết", async () => {
  const { host } = renderView({ tickets: [ticket()] });

  expect(host.textContent).toContain("Nguyễn Minh Anh");
  expect(host.textContent).toContain("Dấu chân Trường Sơn");
  expect(host.textContent).toContain("Chờ duyệt");
  expect(host.textContent).not.toContain("minhanh@example.org");
  expect(host.textContent).not.toContain("Bản nháp tập 3");
  expect(host.textContent).not.toContain("Có lịch công tác đột xuất");
  expect([...host.querySelectorAll("th")].map((cell) => cell.textContent?.trim())).toEqual([
    "Người gửi",
    "Nhiệm vụ",
    "Hạn sản xuất",
    "Trạng thái",
    "Thao tác",
  ]);

  await selectDashboardAction("Dấu chân Trường Sơn", "Xem chi tiết", host);

  expect(document.body.textContent).toContain("Chi tiết ticket");
  expect(document.body.textContent).toContain("minhanh@example.org");
  expect(document.body.textContent).toContain("Bản nháp tập 3");
  expect(document.body.textContent).toContain("Có lịch công tác đột xuất");
  expect(document.body.textContent).toContain("Duyệt ticket");
  expect(document.body.textContent).toContain("Từ chối");
});

it("opens approval with a replacement selector from the ticket detail", async () => {
  const { host } = renderView({ tickets: [ticket()] });

  await selectDashboardAction("Dấu chân Trường Sơn", "Xem chi tiết", host);

  const approve = [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Duyệt ticket"))!;
  await act(async () => approve.click());

  expect(document.body.textContent).toContain("Phân công người thay thế");
  expect(document.body.querySelector('[aria-label="Moderator thay thế"]')).not.toBeNull();
});

it("requires a reason when rejecting a pending ticket", async () => {
  const onReject = mock(() => Promise.resolve());
  const { host } = renderView({ tickets: [ticket()], onReject });
  await selectDashboardAction("Dấu chân Trường Sơn", "Xem chi tiết", host);
  const reject = [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === "Từ chối")!;
  await act(async () => reject.click());
  const submit = [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === "Xác nhận từ chối")!;
  await act(async () => submit.click());

  expect(document.body.textContent).toContain("Nhập lý do từ chối");
  expect(onReject).not.toHaveBeenCalled();
});
