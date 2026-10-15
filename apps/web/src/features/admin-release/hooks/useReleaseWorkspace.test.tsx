import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { adminReleaseService } from "../services/adminReleaseService";
import { useReleaseWorkspace } from "./useReleaseWorkspace";

let root: Root | undefined;
let queryClient: QueryClient | undefined;

afterEach(() => {
  act(() => root?.unmount());
  queryClient?.clear();
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
    replaceAssignees: mock(async () => scheduled),
    retry: mock(async () => ({ status: "READY_TO_PUBLISH" as const })),
    cancel: mock(async () => ({ status: "CANCELLED" as const })),
  };
}

async function renderController(service = fakeService()) {
  let workspace: ReturnType<typeof useReleaseWorkspace> | undefined;
  function Probe() {
    workspace = useReleaseWorkspace({ service });
    return null;
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
      if (service.list.mock.calls.length >= 7 && queryClient?.isFetching() === 0)
        break;
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
  return { get workspace() { return workspace!; }, service };
}

it("restores only a valid saved view and otherwise defaults to Kanban", async () => {
  localStorage.setItem("admin-release-workspace-view", "broken");
  const first = await renderController();
  expect(first.workspace.view).toBe("kanban");
  act(() => root?.unmount());
  queryClient?.clear();

  localStorage.setItem("admin-release-workspace-view", "table");
  const second = await renderController();
  expect(second.workspace.view).toBe("table");
});

it("preserves filters across view changes and feeds board and table queries", async () => {
  const result = await renderController();
  await act(async () => {
    result.workspace.setSearch("Trường Sơn");
    result.workspace.setModeratorId("mod-1");
    result.workspace.setView("table");
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  expect(result.workspace.search).toBe("Trường Sơn");
  expect(result.workspace.moderatorId).toBe("mod-1");
  expect(localStorage.getItem("admin-release-workspace-view")).toBe("table");
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
