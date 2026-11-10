import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/authStore";
import { listeningHistoryService } from "../services/listeningHistoryService";
import type { ListeningHistoryOptions, ListeningHistoryPage } from "../types";

export function useListeningHistory({ page = 1, limit = 10, status = "all" }: ListeningHistoryOptions): UseQueryResult<ListeningHistoryPage, Error> {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["me", "listening-history", userId, { page, limit, status }],
    queryFn: ({ signal }) => listeningHistoryService.list({ page, limit, status }, signal),
    enabled: Boolean(userId),
    staleTime: 0,
    retry: 1,
  });
}
