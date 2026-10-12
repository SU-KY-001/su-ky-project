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
  return async () => {
    await c.invalidateQueries({ queryKey: ["podcast-production"] });
    await c.invalidateQueries({ queryKey: ["historical-catalog"] });
  };
}
