import { useCallback } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { podcastProductionService as api } from "../services/podcastProductionService";
export function usePodcastSeries(q = "") {
  return useInfiniteQuery({
    queryKey: ["podcast-production", "series", q],
    queryFn: ({ pageParam }) => api.series(q, pageParam),
    initialPageParam: 1,
    getNextPageParam: (p) =>
      p.page * p.limit < p.total ? p.page + 1 : undefined,
  });
}
export function usePodcastSeriesDetail(id: string) {
  return useQuery({
    queryKey: ["podcast-production", "series-detail", id],
    queryFn: () => api.detail(id),
    enabled: Boolean(id),
  });
}
export function usePodcastEpisode(id: string) {
  return useQuery({
    queryKey: ["podcast-production", "episode", id],
    queryFn: () => api.episode(id),
    enabled: Boolean(id),
  });
}
export function usePodcastInvalidation() {
  const c = useQueryClient();
  return useCallback(async () => {
    await c.invalidateQueries({ queryKey: ["podcast-production"] });
    await c.invalidateQueries({ queryKey: ["historical-catalog"] });
  }, [c]);
}

/** Reading speed changes only when an admin edits the config; no need to refetch on every mount. */
const SCRIPT_CONFIG_STALE_MS = 5 * 60_000;
export function useWordsPerMinute(): number | undefined {
  return useQuery({
    queryKey: ["podcast-production", "script-config"],
    queryFn: api.scriptConfig,
    staleTime: SCRIPT_CONFIG_STALE_MS,
  }).data?.wordsPerMinute;
}
