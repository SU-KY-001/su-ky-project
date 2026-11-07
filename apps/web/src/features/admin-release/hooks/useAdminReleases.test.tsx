import { afterEach, expect, it, mock } from "bun:test";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { adminReleaseService } from "../services/adminReleaseService";
import {
  adminReleaseKeys,
  useAdminReleaseActions,
  useAdminReleaseBoard,
  useAdminReleaseSchedules,
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

it("keeps the current schedule list visible while changed filters are fetching", async () => {
  type Page = Awaited<ReturnType<typeof adminReleaseService.list>>;
  let resolveNext!: (page: Page) => void;
  const currentPage: Page = {
    items: [{ id: "schedule-current", title: "Lịch hiện tại" } as ReleaseScheduleRecord],
    page: 1,
    limit: 10,
    total: 1,
  };
  const nextPage: Page = {
    items: [{ id: "schedule-next", title: "Lịch mới" } as ReleaseScheduleRecord],
    page: 1,
    limit: 10,
    total: 1,
  };
  const nextRequest = new Promise<Page>((resolve) => {
    resolveNext = resolve;
  });
  const list = mock((filter: Parameters<typeof adminReleaseService.list>[0] = {}) =>
    filter.q === "mới" ? nextRequest : Promise.resolve(currentPage));
  const service = { ...adminReleaseService, list };
  let schedules: ReturnType<typeof useAdminReleaseSchedules> | undefined;
  let changeQuery: ((value: string) => void) | undefined;

  function Probe() {
    const [query, setQuery] = useState("hiện tại");
    changeQuery = setQuery;
    schedules = useAdminReleaseSchedules({ q: query, page: 1, limit: 10 }, service);
    return <output>{schedules.data?.items[0]?.title ?? "Đang tải"}</output>;
  }

  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(<QueryClientProvider client={queryClient!}><Probe /></QueryClientProvider>);
  });
  await act(async () => {
    for (let attempt = 0; attempt < 50 && schedules?.isFetching; attempt += 1)
      await new Promise((resolve) => setTimeout(resolve, 2));
  });

  expect(host.textContent).toBe("Lịch hiện tại");
  await act(async () => {
    changeQuery?.("mới");
    await Promise.resolve();
  });

  expect(host.textContent).toBe("Lịch hiện tại");
  expect(schedules?.isPending).toBe(false);
  expect(schedules?.isFetching).toBe(true);

  await act(async () => {
    resolveNext(nextPage);
    for (let attempt = 0; attempt < 50 && schedules?.isFetching; attempt += 1)
      await new Promise((resolve) => setTimeout(resolve, 2));
  });
  expect(host.textContent).toBe("Lịch mới");
});

it("keeps each progress column visible while changed filters are fetching", async () => {
  type Page = Awaited<ReturnType<typeof adminReleaseService.list>>;
  const pendingRequests: Array<{ resolve: (page: Page) => void; page: Page }> = [];
  const list = mock((filter: Parameters<typeof adminReleaseService.list>[0] = {}) => {
    const status = filter.status ?? "SCHEDULED";
    const page: Page = {
      items: [{
        id: `${status}-${filter.q}`,
        title: `${status} ${filter.q}`,
      } as ReleaseScheduleRecord],
      page: 1,
      limit: 50,
      total: 1,
    };
    if (filter.q !== "mới") return Promise.resolve(page);
    return new Promise<Page>((resolve) => pendingRequests.push({ resolve, page }));
  });
  const service = { ...adminReleaseService, list };
  let board: ReturnType<typeof useAdminReleaseBoard> | undefined;
  let changeQuery: ((value: string) => void) | undefined;

  function Probe() {
    const [query, setQuery] = useState("hiện tại");
    changeQuery = setQuery;
    board = useAdminReleaseBoard({ q: query }, {}, service);
    return <output>{board.columns.SCHEDULED.items[0]?.title ?? "Đang tải"}</output>;
  }

  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(<QueryClientProvider client={queryClient!}><Probe /></QueryClientProvider>);
  });
  await act(async () => {
    for (let attempt = 0; attempt < 50 && board?.isPending; attempt += 1)
      await new Promise((resolve) => setTimeout(resolve, 2));
  });

  expect(host.textContent).toBe("SCHEDULED hiện tại");
  await act(async () => {
    changeQuery?.("mới");
    await Promise.resolve();
  });

  expect(host.textContent).toBe("SCHEDULED hiện tại");
  expect(board?.columns.SCHEDULED.isPending).toBe(false);
  expect(queryClient.isFetching()).toBeGreaterThan(0);

  await act(async () => {
    for (const { resolve, page } of pendingRequests) resolve(page);
    for (let attempt = 0; attempt < 50 && queryClient?.isFetching(); attempt += 1)
      await new Promise((resolve) => setTimeout(resolve, 2));
  });
  expect(host.textContent).toBe("SCHEDULED mới");
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
