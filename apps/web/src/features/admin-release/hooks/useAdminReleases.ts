import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRef } from "react";
import type { ReleaseScheduleRecord } from "@repo/shared";
import {
  adminReleaseService,
  type ReleaseScheduleDraft,
  type ReleaseScheduleFilter,
} from "../services/adminReleaseService";
import {
  RELEASE_BOARD_COLUMNS,
  type ReleaseBoardStatus,
} from "../releaseWorkspaceModel";

export const RELEASE_SYNC_INTERVAL_MS = 2_000;

export const adminReleaseKeys = {
  root: ["admin-releases"] as const,
  dashboard: ["admin-releases", "dashboard"] as const,
  health: ["admin-releases", "health"] as const,
  detail: (id: string) => ["admin-releases", "detail", id] as const,
  list: (filter: ReleaseScheduleFilter) => ["admin-releases", "list", filter] as const,
  moderators: ["admin-releases", "moderators"] as const,
  workload: ["admin-releases", "workload"] as const,
  progress: (id: string) => ["admin-releases", "progress", id] as const,
};

export function useAdminReleaseDashboard() {
  return useQuery({ queryKey: adminReleaseKeys.dashboard, queryFn: adminReleaseService.dashboard, refetchInterval: RELEASE_SYNC_INTERVAL_MS });
}

export function useReleaseWorkerHealth(service = adminReleaseService) {
  return useQuery({
    queryKey: adminReleaseKeys.health,
    queryFn: service.health,
    refetchInterval: 5_000,
    retry: false,
  });
}

export function useLiveReleaseSchedule(id: string | null, service = adminReleaseService) {
  return useQuery({
    queryKey: adminReleaseKeys.detail(id ?? ""),
    queryFn: () => service.get(id!),
    enabled: Boolean(id),
    refetchInterval: RELEASE_SYNC_INTERVAL_MS,
  });
}

export function useAdminReleaseSchedules(
  filter: ReleaseScheduleFilter = {},
  service = adminReleaseService,
  live = true,
) {
  return useQuery({
    queryKey: adminReleaseKeys.list(filter),
    queryFn: () => service.list(filter),
    placeholderData: keepPreviousData,
    refetchInterval: live ? RELEASE_SYNC_INTERVAL_MS : false,
  });
}

export function useReleaseModerators(service = adminReleaseService) {
  return useQuery({ queryKey: adminReleaseKeys.moderators, queryFn: service.moderators });
}

export function useAdminReleaseWorkload(service = adminReleaseService) {
  return useQuery({
    queryKey: adminReleaseKeys.workload,
    queryFn: service.workload,
  });
}

export function useAdminReleaseBoard(
  filter: Omit<ReleaseScheduleFilter, "status" | "page"> = {},
  pages: Partial<Record<ReleaseBoardStatus, number>> = {},
  service = adminReleaseService,
  live = true,
) {
  type ReleasePage = Awaited<ReturnType<typeof adminReleaseService.list>>;
  const retainedPages = useRef(new Map<string, ReleasePage>());
  const requests = RELEASE_BOARD_COLUMNS.flatMap(({ status }) =>
    Array.from({ length: pages[status] ?? 1 }, (_, index) => ({
      status,
      page: index + 1,
      filter: {
        ...filter,
        status,
        page: index + 1,
      } satisfies ReleaseScheduleFilter,
    })),
  );
  return useQueries({
    queries: requests.map(({ status, page, filter: columnFilter }) => ({
      queryKey: adminReleaseKeys.list(columnFilter),
      queryFn: () => service.list(columnFilter),
      placeholderData: () => retainedPages.current.get(`${status}:${page}`),
      refetchInterval: live ? RELEASE_SYNC_INTERVAL_MS : false,
    })),
    combine: (results) => {
      results.forEach((result, index) => {
        const request = requests[index];
        if (request && result.data && !result.isPlaceholderData)
          retainedPages.current.set(`${request.status}:${request.page}`, result.data);
      });
      const columns = Object.fromEntries(
        RELEASE_BOARD_COLUMNS.map(({ status }) => {
          const columnResults = results.filter(
            (_, index) => requests[index]?.status === status,
          );
          return [status, {
            items: columnResults.flatMap(({ data }) => data?.items ?? []),
            total: columnResults.find(({ data }) => data)?.data?.total ?? 0,
            isPending: columnResults.some(({ isPending }) => isPending),
            error: columnResults.find(({ error }) => error)?.error ?? null,
          }];
        }),
      ) as Record<ReleaseBoardStatus, {
        items: ReleaseScheduleRecord[];
        total: number;
        isPending: boolean;
        error: Error | null;
      }>;
      return {
        columns,
        isPending: results.some(({ isPending }) => isPending),
        isError: results.some(({ isError }) => isError),
        dataUpdatedAt: Math.min(...results.map(({ dataUpdatedAt }) => dataUpdatedAt)),
      };
    },
  });
}

export function useAdminReleaseAttention(
  filter: Omit<ReleaseScheduleFilter, "status" | "page"> = {},
  service = adminReleaseService,
) {
  return useQueries({
    queries: (["BLOCKED", "FAILED"] as const).map((status) => {
      const attentionFilter: ReleaseScheduleFilter = {
        ...filter,
        status,
        page: 1,
        limit: 50,
      };
      return {
        queryKey: adminReleaseKeys.list(attentionFilter),
        queryFn: () => service.list(attentionFilter),
      };
    }),
    combine: (results) => ({
      items: results.flatMap(({ data }) => data?.items ?? []),
      total: results.reduce((sum, { data }) => sum + (data?.total ?? 0), 0),
      isPending: results.some(({ isPending }) => isPending),
      isError: results.some(({ isError }) => isError),
    }),
  });
}

export function useReleaseProgress(id: string | null, service = adminReleaseService) {
  return useQuery({
    queryKey: adminReleaseKeys.progress(id ?? ""),
    queryFn: () => service.progress(id!),
    enabled: Boolean(id),
    refetchInterval: RELEASE_SYNC_INTERVAL_MS,
  });
}

export function useAdminReleaseActions(service = adminReleaseService) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminReleaseKeys.root });
  return {
    create: useMutation({
      mutationFn: (input: ReleaseScheduleDraft) => service.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        patch,
      }: {
        id: string;
        patch: Parameters<typeof adminReleaseService.update>[1];
      }) => service.update(id, patch),
      onSuccess: invalidate,
    }),
    replaceAssignee: useMutation({
      mutationFn: ({ id, moderatorId }: { id: string; moderatorId: string }) =>
        service.replaceAssignee(id, moderatorId),
      onSuccess: invalidate,
    }),
    checkReadiness: useMutation({
      mutationFn: service.checkReadiness,
      onSuccess: invalidate,
    }),
    publishNow: useMutation({ mutationFn: service.publishNow, onSuccess: invalidate }),
    retry: useMutation({ mutationFn: service.retry, onSuccess: invalidate }),
    cancel: useMutation({ mutationFn: service.cancel, onSuccess: invalidate }),
  };
}
