import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { PodcastRankingQuery, PodcastRankingResponse, PlaylistListDto, PlaylistDetailDto } from "@repo/shared";
import { useAuthStore } from "@/lib/authStore";
import { libraryService } from "../services/libraryService";

export function useRanking(query: PodcastRankingQuery): UseQueryResult<PodcastRankingResponse, Error> {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({ queryKey: ["me", "top-podcasts", userId, query], queryFn: ({ signal }) => libraryService.ranking(query, signal), enabled: Boolean(userId), staleTime: 0, retry: 1 });
}
export function usePlaylists(page = 1, limit = 4): UseQueryResult<PlaylistListDto, Error> {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({ queryKey: ["me", "playlists", userId, page, limit], queryFn: ({ signal }) => libraryService.playlists(page, limit, signal), enabled: Boolean(userId), staleTime: 0, retry: 1 });
}
export function usePlaylist(id: string, page = 1): UseQueryResult<PlaylistDetailDto, Error> {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({ queryKey: ["me", "playlists", userId, id, page], queryFn: ({ signal }) => libraryService.playlist(id, page, 5, signal), enabled: Boolean(userId && id), staleTime: 0, retry: 1 });
}
