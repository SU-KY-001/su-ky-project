import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
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

export const adminReleaseKeys = {
  root: ["admin-releases"] as const,
  dashboard: ["admin-releases", "dashboard"] as const,
  list: (filter: ReleaseScheduleFilter) => ["admin-releases", "list", filter] as const,
  moderators: ["admin-releases", "moderators"] as const,
  workload: ["admin-releases", "workload"] as const,
  progress: (id: string) => ["admin-releases", "progress", id] as const,
};

export function useAdminReleaseDashboard() {
  return useQuery({ queryKey: adminReleaseKeys.dashboard, queryFn: adminReleaseService.dashboard });
}

export function useAdminReleaseSchedules(filter: ReleaseScheduleFilter = {}) {
  return useQuery({ queryKey: adminReleaseKeys.list(filter), queryFn: () => adminReleaseService.list(filter) });
}

export function useReleaseModerators() {
  return useQuery({ queryKey: adminReleaseKeys.moderators, queryFn: adminReleaseService.moderators });
}

export function useAdminReleaseWorkload() {
  return useQuery({
    queryKey: adminReleaseKeys.workload,
    queryFn: adminReleaseService.workload,
  });
}

export function useAdminReleaseBoard(
  filter: Omit<ReleaseScheduleFilter, "status" | "page"> = {},
  pages: Partial<Record<ReleaseBoardStatus, number>> = {},
  service = adminReleaseService,
) {
  return useQueries({
    queries: RELEASE_BOARD_COLUMNS.map(({ status }) => {
      const columnFilter: ReleaseScheduleFilter = {
        ...filter,
        status,
        page: pages[status] ?? 1,
      };
      return {
        queryKey: adminReleaseKeys.list(columnFilter),
        queryFn: () => service.list(columnFilter),
      };
    }),
    combine: (results) => {
      const columns = Object.fromEntries(
        RELEASE_BOARD_COLUMNS.map(({ status }, index) => {
          const result = results[index];
          return [status, {
            items: result?.data?.items ?? [],
            total: result?.data?.total ?? 0,
            isPending: result?.isPending ?? false,
            error: result?.error ?? null,
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
      };
    },
  });
}

export function useAdminReleaseAttention(
  filter: Omit<ReleaseScheduleFilter, "status" | "page"> = {},
) {
  return useQueries({
    queries: (["BLOCKED", "FAILED"] as const).map((status) => {
      const attentionFilter: ReleaseScheduleFilter = {
        ...filter,
        status,
        page: 1,
      };
      return {
        queryKey: adminReleaseKeys.list(attentionFilter),
        queryFn: () => adminReleaseService.list(attentionFilter),
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

export function useReleaseProgress(id: string | null) {
  return useQuery({
    queryKey: adminReleaseKeys.progress(id ?? ""),
    queryFn: () => adminReleaseService.progress(id!),
    enabled: Boolean(id),
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
    replaceAssignees: useMutation({
      mutationFn: ({ id, moderatorIds }: { id: string; moderatorIds: string[] }) =>
        service.replaceAssignees(id, moderatorIds),
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
