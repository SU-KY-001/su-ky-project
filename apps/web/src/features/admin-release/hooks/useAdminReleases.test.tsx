import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { adminReleaseService } from "../services/adminReleaseService";
import {
  adminReleaseKeys,
  useAdminReleaseActions,
  useAdminReleaseBoard,
} from "./useAdminReleases";

let root: Root | undefined;
let queryClient: QueryClient | undefined;

afterEach(() => {
  act(() => root?.unmount());
  queryClient?.clear();
  document.body.innerHTML = "";
});

it("queries each board status separately and preserves totals", async () => {
  const list = mock(async (filter: Parameters<typeof adminReleaseService.list>[0] = {}) => ({
    items: [{
      id: `${filter.status}-${filter.page ?? 1}`,
    } as ReleaseScheduleRecord],
    page: filter.page ?? 1,
    limit: filter.limit ?? 50,
    total: filter.status === "SCHEDULED" ? 7 : 1,
  }));
  const service = { ...adminReleaseService, list };
  let board: ReturnType<typeof useAdminReleaseBoard> | undefined;
  function Probe() {
    board = useAdminReleaseBoard({ q: "sử ký" }, { SCHEDULED: 2 }, service);
    return null;
  }
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(<QueryClientProvider client={queryClient!}><Probe /></QueryClientProvider>);
  });
  await act(async () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (
        list.mock.calls.length === 5 &&
        queryClient?.isFetching() === 0 &&
        board?.columns.SCHEDULED.total === 7
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  });

  expect(list).toHaveBeenCalledTimes(5);
  expect(list.mock.calls.map(([filter]) => filter)).toEqual(expect.arrayContaining([
    expect.objectContaining({ status: "SCHEDULED", q: "sử ký", page: 1 }),
    expect.objectContaining({ status: "SCHEDULED", q: "sử ký", page: 2 }),
  ]));
  expect(board?.columns.SCHEDULED.total).toBe(7);
  expect(board?.columns.SCHEDULED.items.map(({ id }) => id)).toEqual([
    "SCHEDULED-1",
    "SCHEDULED-2",
  ]);
});

it("invalidates the release root after a readiness action succeeds", async () => {
  const ready = { id: "schedule-1", status: "READY_TO_PUBLISH" } as ReleaseScheduleRecord;
  const checkReadiness = mock(async () => ready);
  const service = { ...adminReleaseService, checkReadiness };
  let actions: ReturnType<typeof useAdminReleaseActions> | undefined;
  function Probe() {
    actions = useAdminReleaseActions(service);
    return null;
  }
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  queryClient.setQueryData(adminReleaseKeys.list({}), { items: [] });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(<QueryClientProvider client={queryClient!}><Probe /></QueryClientProvider>);
  });
  await act(async () => {
    await actions?.checkReadiness.mutateAsync("schedule-1");
  });

  expect(queryClient.getQueryState(adminReleaseKeys.list({}))?.isInvalidated).toBe(true);
});
