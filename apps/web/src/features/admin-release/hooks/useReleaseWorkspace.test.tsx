import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { useNotificationStore } from "@/shared/lib/notifications";
import { adminReleaseService } from "../services/adminReleaseService";
import { useReleaseWorkspace } from "./useReleaseWorkspace";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";

let root: Root | undefined;
let queryClient: QueryClient | undefined;

afterEach(() => {
  act(() => root?.unmount());
  queryClient?.clear();
  useNotificationStore.setState({ notifications: [] });
  localStorage.clear();
  document.body.innerHTML = "";
});

const scheduled = {
  id: "schedule-1",
  title: "Dấu chân Trường Sơn",
  status: "SCHEDULED",
  productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
  scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
  updatedAt: new Date("2026-10-15T08:00:00.000Z"),
  assignments: [],
  reviews: [],
  episode: null,
} as unknown as ReleaseScheduleRecord;

function fakeService({ transitionFails = false } = {}) {
  const list = mock(async (filter: Parameters<typeof adminReleaseService.list>[0] = {}) => ({
    items: filter.status === "SCHEDULED" ? [scheduled] : [],
    page: filter.page ?? 1,
    limit: filter.limit ?? 20,
    total: filter.status === "SCHEDULED" ? 1 : 0,
  }));
  return {
    ...adminReleaseService,
    list,
    get: mock(async () => scheduled),
    health: mock(async () => ({ status: "ok" as const, service: "su-ky-api", version: "0.0.1", runtime: "Bun", bunVersion: "1.4.0", database: "connected" as const, queue: "running" as const, releaseWorker: "running" as const, uptimeSeconds: 60, timestamp: new Date().toISOString() })),
    moderators: mock(async () => ({ items: [] })),
    workload: mock(async () => ({ items: [] })),
    progress: mock(async () => ({ items: [] })),
    checkReadiness: mock(async () => {
      if (transitionFails) throw new Error("Không thể đánh giá lịch");
      return { ...scheduled, status: "READY_TO_PUBLISH" as const };
    }),
    publishNow: mock(async () => ({ result: "RELEASED" as const })),
    create: mock(async () => scheduled),
    update: mock(async () => scheduled),
    replaceAssignee: mock(async () => scheduled),
    retry: mock(async () => ({ status: "READY_TO_PUBLISH" as const })),
    cancel: mock(async () => ({ status: "CANCELLED" as const })),
  };
}

async function renderController(service = fakeService()) {
  let workspace: ReturnType<typeof useReleaseWorkspace> | undefined;
  function Probe() {
    workspace = useReleaseWorkspace({ service });
    return <ConfirmationDialog {...workspace.confirmation} />;
  }
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<QueryClientProvider client={queryClient!}><Probe /></QueryClientProvider>);
  });
  await act(async () => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (service.list.mock.calls.length >= 5 && queryClient?.isFetching() === 0)
        break;
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
  return { get workspace() { return workspace!; }, service };
}

it("always opens in Kanban even when an old table preference exists", async () => {
  localStorage.setItem("admin-release-workspace-view", "table");
  const result = await renderController();

  expect(result.workspace.view).toBe("kanban");
  expect(localStorage.getItem("admin-release-workspace-view")).toBeNull();
});

it("does not request duplicate moderator workload data", async () => {
  const service = fakeService();
  await renderController(service);
  expect(service.workload).toHaveBeenCalledTimes(0);
});

it("does not request separate attention lists", async () => {
  const service = fakeService();
  await renderController(service);
  const requestedStatuses = service.list.mock.calls.map(([filter]) => filter?.status);
  expect(requestedStatuses).not.toContain("BLOCKED");
  expect(requestedStatuses).not.toContain("FAILED");
});

it("preserves filters across temporary view changes without persisting the table view", async () => {
  const result = await renderController();
  await act(async () => {
    result.workspace.setSearch("Trường Sơn");
    result.workspace.setModeratorId("mod-1");
    result.workspace.setView("table");
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  expect(result.workspace.search).toBe("Trường Sơn");
  expect(result.workspace.moderatorId).toBe("mod-1");
  expect(localStorage.getItem("admin-release-workspace-view")).toBeNull();
  expect(result.service.list.mock.calls.some(([filter]) => filter?.q === "Trường Sơn" && filter.moderatorId === "mod-1")).toBe(true);
});

it("refetches and reports a transition error while direct selection opens edit", async () => {
  const result = await renderController(fakeService({ transitionFails: true }));
  const callsBefore = result.service.list.mock.calls.length;

  let transitionError: unknown;
  await act(async () => {
    try {
      await result.workspace.transition(scheduled, "check-readiness", "READY_TO_PUBLISH");
    } catch (caught) {
      transitionError = caught;
    }
  });
  expect(transitionError).toBeInstanceOf(Error);
  expect(result.workspace.error).toBeInstanceOf(Error);
  expect(result.service.list.mock.calls.length).toBeGreaterThan(callsBefore);

  act(() => result.workspace.openEdit(scheduled));
  expect(result.workspace.dialogMode).toBe("edit");
  expect(result.workspace.selectedSchedule?.id).toBe(scheduled.id);
});

it("publishes an error toast when a release action fails", async () => {
  const result = await renderController(fakeService({ transitionFails: true }));

  await act(async () => {
    await result.workspace.transition(scheduled, "check-readiness", "READY_TO_PUBLISH").catch(() => undefined);
  });

  const notification = useNotificationStore.getState().notifications.at(-1);
  expect(notification?.status).toBe("error");
  expect(notification?.title).toBe("Thao tác chưa hoàn tất.");
  expect(notification?.description).toBe("Dữ liệu lịch đã được đồng bộ lại từ hệ thống.");
});

it("waits for the shadcn confirmation before publishing a dragged schedule", async () => {
  const result = await renderController();
  const ready = { ...scheduled, status: "READY_TO_PUBLISH" as const };
  let operation: Promise<unknown> | undefined;
  await act(async () => { operation = result.workspace.transition(ready, "publish-now", "PUBLISHING"); });
  const dialog = document.querySelector('[role="alertdialog"]');
  expect(dialog?.textContent).toContain("Phát hành podcast ngay?");
  expect(dialog?.textContent).toContain(ready.title);
  expect(result.service.publishNow).not.toHaveBeenCalled();
  await act(async () => {
    document.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')?.click();
    await operation;
  });
  expect(result.service.publishNow).toHaveBeenCalledTimes(1);
  expect(result.service.publishNow).toHaveBeenCalledWith(ready.id, expect.any(Object));
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
});

it("cancels publication with Quay lại and schedule cancellation with Escape without API writes", async () => {
  const result = await renderController();
  let operation: Promise<unknown> | undefined;
  await act(async () => { operation = result.workspace.publishNow(scheduled); });
  await act(async () => {
    document.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-cancel"]')?.click();
    await operation;
  });
  expect(result.service.publishNow).not.toHaveBeenCalled();
  await act(async () => { operation = result.workspace.cancel(scheduled); });
  expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("Hủy lịch phát hành?");
  await act(async () => {
    document.querySelector('[role="alertdialog"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await operation;
  });
  expect(result.service.cancel).not.toHaveBeenCalled();
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
});

it("confirms cancellation of the selected schedule exactly once", async () => {
  const result = await renderController();
  let operation: Promise<unknown> | undefined;
  await act(async () => { operation = result.workspace.cancel(scheduled); });
  expect(result.service.cancel).not.toHaveBeenCalled();
  await act(async () => {
    document.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')?.click();
    await operation;
  });
  expect(result.service.cancel).toHaveBeenCalledTimes(1);
  expect(result.service.cancel).toHaveBeenCalledWith(scheduled.id, expect.any(Object));
});

it("abandons an unanswered confirmation when leaving the workspace", async () => {
  const result = await renderController();
  let operation: Promise<unknown> | undefined;
  await act(async () => { operation = result.workspace.publishNow(scheduled); });
  await act(async () => { root?.unmount(); root = undefined; await operation; });
  expect(result.service.publishNow).not.toHaveBeenCalled();
});

it("automatically follows worker transitions without overwriting the open edit snapshot", async () => {
  let current = { ...scheduled, status: "READY_TO_PUBLISH" as const } as ReleaseScheduleRecord;
  const service = {
    ...fakeService(),
    get: mock(async () => current),
    list: mock(async (filter: Parameters<typeof adminReleaseService.list>[0] = {}) => ({
      items: !filter.status || filter.status === current.status ? [current] : [],
      total: !filter.status || filter.status === current.status ? 1 : 0,
      page: filter.page ?? 1, limit: filter.limit ?? 20,
    })),
  };
  const result = await renderController(service);
  await act(async () => {
    result.workspace.openEdit(current);
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  current = { ...current, status: "PUBLISHING", updatedAt: new Date("2026-10-20T13:00:00Z") };
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 2_250)); });
  expect(result.workspace.board.columns.PUBLISHING.items[0]?.id).toBe(scheduled.id);
  expect(result.workspace.board.columns.READY_TO_PUBLISH.items).toHaveLength(0);
  expect(result.workspace.liveSchedule.data?.status).toBe("PUBLISHING");
  expect(result.workspace.selectedSchedule?.status).toBe("READY_TO_PUBLISH");
  expect(result.workspace.selectedSchedule?.updatedAt).toEqual(scheduled.updatedAt);
  current = { ...current, status: "RELEASED" };
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 2_250)); });
  expect(result.workspace.board.columns.PUBLISHING.items).toHaveLength(0);
  expect(result.workspace.board.columns.RELEASED.items[0]?.id).toBe(scheduled.id);
  expect(result.workspace.liveSchedule.data?.status).toBe("RELEASED");
  expect(service.publishNow).not.toHaveBeenCalled();
  expect(service.progress.mock.calls.length).toBeGreaterThan(1);
}, 10_000);
