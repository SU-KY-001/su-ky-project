import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminReleaseService,
  type ReleaseScheduleDraft,
  type ReleaseScheduleFilter,
} from "../services/adminReleaseService";

export const adminReleaseKeys = {
  root: ["admin-releases"] as const,
  dashboard: ["admin-releases", "dashboard"] as const,
  list: (filter: ReleaseScheduleFilter) => ["admin-releases", "list", filter] as const,
  moderators: ["admin-releases", "moderators"] as const,
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

export function useReleaseProgress(id: string | null) {
  return useQuery({
    queryKey: adminReleaseKeys.progress(id ?? ""),
    queryFn: () => adminReleaseService.progress(id!),
    enabled: Boolean(id),
  });
}

export function useAdminReleaseActions() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminReleaseKeys.root });
  return {
    create: useMutation({
      mutationFn: (input: ReleaseScheduleDraft) => adminReleaseService.create(input),
      onSuccess: invalidate,
    }),
    publishNow: useMutation({ mutationFn: adminReleaseService.publishNow, onSuccess: invalidate }),
    retry: useMutation({ mutationFn: adminReleaseService.retry, onSuccess: invalidate }),
    cancel: useMutation({ mutationFn: adminReleaseService.cancel, onSuccess: invalidate }),
  };
}
