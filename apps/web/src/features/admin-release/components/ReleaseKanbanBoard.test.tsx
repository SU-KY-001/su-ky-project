import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { ReleaseKanbanBoard, type ReleaseKanbanColumns } from "./ReleaseKanbanBoard";
import type { ReleaseBoardStatus, ReleaseDropCommand } from "../releaseWorkspaceModel";
import { releaseReviewFixture } from "@/test/releaseReviewFixtures";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

function schedule(id: string, status: ReleaseScheduleRecord["status"]): ReleaseScheduleRecord {
  return {
    id,
    episodeId: null,
    title: `Lịch ${id}`,
    productionDeadline: new Date("2026-10-10T08:00:00.000Z"),
    scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
    status,
    version: 1,
    createdById: "admin-1",
    publishedAt: null,
    cancelledAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    assignments: [
      {
        scheduleId: id,
        moderatorId: "moderator-1",
        assignedById: "admin-1",
        assignedAt: new Date("2026-10-01T00:00:00.000Z"),
        removedAt: null,
        moderator: { id: "moderator-1", name: "Nguyễn Minh Anh", email: "minh.anh@example.org" },
      },
      {
        scheduleId: id,
        moderatorId: "moderator-2",
        assignedById: "admin-1",
        assignedAt: new Date("2026-10-01T00:00:00.000Z"),
        removedAt: null,
        moderator: { id: "moderator-2", name: "Trần Hoàng Nam", email: "hoang.nam@example.org" },
      },
    ],
    reviews: [],
    episode: null,
  } as ReleaseScheduleRecord;
}

function columns(): ReleaseKanbanColumns {
  return {
    SCHEDULED: { items: [schedule("scheduled", "SCHEDULED")], total: 3, page: 1 },
    READY_TO_PUBLISH: { items: [schedule("ready", "READY_TO_PUBLISH")], total: 1, page: 1 },
    RELEASED: { items: [schedule("released", "RELEASED")], total: 1, page: 1 },
    FAILED: { items: [schedule("failed", "FAILED")], total: 1, page: 1 },
  };
}

function renderBoard(overrides: Partial<React.ComponentProps<typeof ReleaseKanbanBoard>> = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const props = {
    columns: columns(),
    pendingIds: new Set<string>(),
    onOpenEdit: mock(() => undefined),
    onTransition: mock(() => undefined),
    onPageChange: mock(() => undefined),
    ...overrides,
  };
  act(() => root?.render(<ReleaseKanbanBoard {...props} />));
  return { host, props };
}

function transfer() {
  const values = new Map<string, string>();
  const dataTransfer = {
    effectAllowed: "none",
    dropEffect: "none",
    dragImage: null as Element | null,
    setData: (type: string, value: string) => values.set(type, value),
    getData: (type: string) => values.get(type) ?? "",
    setDragImage(image: Element) {
      dataTransfer.dragImage = image;
    },
  };
  return dataTransfer as unknown as DataTransfer & { dragImage: Element | null };
}

function drag(source: Element, target: Element) {
  const dataTransfer = transfer();
  const start = new Event("dragstart", { bubbles: true });
  Object.defineProperty(start, "dataTransfer", { value: dataTransfer });
  const over = new Event("dragover", { bubbles: true, cancelable: true });
  Object.defineProperty(over, "dataTransfer", { value: dataTransfer });
  const drop = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(drop, "dataTransfer", { value: dataTransfer });
  act(() => {
    source.dispatchEvent(start);
    target.dispatchEvent(over);
    target.dispatchEvent(drop);
  });
}

it("renders four columns, server totals, badges, dates and editable cards", () => {
  const { host, props } = renderBoard();
  expect([...host.querySelectorAll("section")].map((node) => node.getAttribute("aria-label"))).toEqual([
    "Đã lên lịch",
    "Sẵn sàng phát hành",
    "Đã phát hành",
    "Phát hành thất bại",
  ]);
  expect(host.querySelector('[aria-label="Đã lên lịch"]')?.textContent).toContain("3");
  expect(host.querySelectorAll('[data-card-badge-type="name"]')).toHaveLength(8);
  expect(host.textContent).toContain("Hạn sản xuất");
  expect(host.textContent).not.toContain("Quá hạn sản xuất");
  expect(host.querySelector('[data-release-column="FAILED"] [data-release-id="failed"] [data-card-badge-type="status"]')?.textContent).toBe("Phát hành thất bại");
  expect(host.querySelector('[data-release-column="PUBLISHING"]')).toBeNull();

  const card = host.querySelector('[data-release-id="scheduled"]')!;
  act(() => card.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  act(() => card.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  expect(props.onOpenEdit).toHaveBeenCalledTimes(2);
});

it("fires only policy-backed drag transitions without mutating columns", async () => {
  const sourceColumns = columns();
  const snapshots = Object.fromEntries(
    Object.entries(sourceColumns).map(([status, column]) => [status, [...column.items]]),
  );
  const onTransition = mock((
    _schedule: ReleaseScheduleRecord,
    _command: ReleaseDropCommand,
    _target: ReleaseBoardStatus,
  ) => Promise.reject(new Error("server rejected")));
  const { host } = renderBoard({ columns: sourceColumns, onTransition });

  drag(
    host.querySelector('[data-release-id="scheduled"]')!,
    host.querySelector('[aria-label="Sẵn sàng phát hành"]')!,
  );
  drag(
    host.querySelector('[data-release-id="ready"]')!,
    host.querySelector('[aria-label="Phát hành thất bại"]')!,
  );
  drag(
    host.querySelector('[data-release-id="failed"]')!,
    host.querySelector('[aria-label="Đã phát hành"]')!,
  );
  drag(
    host.querySelector('[data-release-id="ready"]')!,
    host.querySelector('[aria-label="Đã lên lịch"]')!,
  );
  drag(
    host.querySelector('[data-release-id="scheduled"]')!,
    host.querySelector('[aria-label="Đã lên lịch"]')!,
  );
  await act(async () => { await Promise.resolve(); });

  expect(onTransition).toHaveBeenCalledTimes(1);
  expect(onTransition.mock.calls[0]?.slice(1)).toEqual(["check-readiness", "READY_TO_PUBLISH"]);
  for (const [status, column] of Object.entries(sourceColumns))
    expect(column.items).toEqual(snapshots[status]);
});

it("keeps a synchronized card preview and marks valid drop targets", () => {
  const { host } = renderBoard();
  const card = host.querySelector<HTMLElement>('[data-release-id="scheduled"]')!;
  const dataTransfer = transfer();
  const start = new Event("dragstart", { bubbles: true });
  Object.defineProperty(start, "dataTransfer", { value: dataTransfer });

  act(() => card.dispatchEvent(start));

  expect(dataTransfer.dragImage?.getAttribute("data-drag-preview")).toBe("true");
  expect(card.dataset.dragging).toBe("true");
  expect(host.querySelector<HTMLElement>('[data-release-column="READY_TO_PUBLISH"]')?.dataset.dropAvailable).toBe("true");
  expect(host.querySelector<HTMLElement>('[data-release-column="RELEASED"]')?.dataset.dropAvailable).toBe("false");
});

it("keeps cards free of action controls and loads only the requested column page", () => {
  const { host, props } = renderBoard();
  expect(host.querySelector('[data-slot="dashboard-row-actions"]')).toBeNull();
  expect(host.querySelector("article button")).toBeNull();
  const card = host.querySelector('[data-release-id="scheduled"]')!;
  act(() => card.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  expect(props.onOpenEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "scheduled" }));
  expect(props.onTransition).not.toHaveBeenCalled();

  const loadMore = host.querySelector<HTMLButtonElement>(
    '[aria-label="Tải thêm Đã lên lịch"]',
  )!;
  act(() => loadMore.click());
  expect(props.onPageChange).toHaveBeenCalledWith("SCHEDULED", 2);
});

it("shows four cards by default and expands or collapses one busy column", () => {
  const busyColumns = columns();
  busyColumns.SCHEDULED = {
    items: Array.from({ length: 6 }, (_, index) => schedule(`scheduled-${index + 1}`, "SCHEDULED")),
    total: 6,
    page: 1,
  };
  const { host } = renderBoard({ columns: busyColumns });
  const column = host.querySelector<HTMLElement>('[data-release-column="SCHEDULED"]')!;

  expect(column.querySelectorAll("[data-release-id]")).toHaveLength(4);
  expect(column.querySelector('[data-release-id="scheduled-5"]')).toBeNull();

  const expand = column.querySelector<HTMLButtonElement>('[aria-label="Xem thêm 2 lịch Đã lên lịch"]')!;
  act(() => expand.click());
  expect(column.querySelectorAll("[data-release-id]")).toHaveLength(6);

  const collapse = column.querySelector<HTMLButtonElement>('[aria-label="Thu gọn Đã lên lịch"]')!;
  act(() => collapse.click());
  expect(column.querySelectorAll("[data-release-id]")).toHaveLength(4);
});

it.each(["SCHEDULED", "READY_TO_PUBLISH", "RELEASED", "FAILED"] as const)(
  "uses submission time rather than the current time for %s production deadlines",
  (status) => {
    const { schedule: item } = releaseReviewFixture();
    item.status = status;
    item.productionDeadline = new Date("2026-01-01T09:04:00Z");
    item.reviews[0]!.submittedAt = new Date("2026-01-01T09:03:00Z");
    item.reviews[0]!.reviewedAt = new Date("2026-01-01T10:00:00Z");
    const sourceColumns = columns();
    sourceColumns[status] = { items: [item], total: 1, page: 1 };
    const { host } = renderBoard({ columns: sourceColumns });
    const card = host.querySelector(`[data-release-id="${item.id}"]`)!;
    expect(card.textContent).not.toContain("Quá hạn sản xuất");

    item.reviews[0]!.submittedAt = new Date("2026-01-01T09:05:00Z");
    act(() => root?.render(<ReleaseKanbanBoard columns={sourceColumns} pendingIds={new Set()} onOpenEdit={() => undefined} onTransition={() => undefined} onPageChange={() => undefined} />));
    expect(card.textContent).toContain("Quá hạn sản xuất");

    item.reviews[0]!.submittedAt = new Date(item.productionDeadline);
    act(() => root?.render(<ReleaseKanbanBoard columns={sourceColumns} pendingIds={new Set()} onOpenEdit={() => undefined} onTransition={() => undefined} onPageChange={() => undefined} />));
    expect(card.textContent).not.toContain("Quá hạn sản xuất");
  },
);

it("does not infer late completion from withdrawn or obsolete submissions", () => {
  const { schedule: item } = releaseReviewFixture();
  item.status = "READY_TO_PUBLISH";
  item.productionDeadline = new Date("2026-01-01T09:04:00Z");
  const review = { ...item.reviews[0]!, submittedAt: new Date("2026-01-01T09:05:00Z") };
  item.reviews = [
    { ...review, status: "WITHDRAWN" },
    { ...review, revision: review.revision - 1 },
    { ...review, episodeId: "previous-episode" },
  ];
  const sourceColumns = columns();
  sourceColumns.READY_TO_PUBLISH = { items: [item], total: 1, page: 1 };
  const { host } = renderBoard({ columns: sourceColumns });
  expect(host.querySelector(`[data-release-id="${item.id}"]`)?.textContent).not.toContain("Quá hạn sản xuất");
});
