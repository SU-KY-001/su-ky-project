import { PodcastRankingResponseSchema, PlaylistListSchema, PlaylistDetailSchema, PlaylistSchema, type PodcastRankingQuery, type PodcastRankingResponse, type PlaylistListDto, type PlaylistDetailDto, type PlaylistDto } from "@repo/shared";
import { apiClient } from "@/lib/client";

export type PlaylistTrack = PlaylistDetailDto["items"][number];
export const libraryService = {
  async ranking(query: PodcastRankingQuery, signal?: AbortSignal): Promise<PodcastRankingResponse> {
    return PodcastRankingResponseSchema.parse((await apiClient.get("/api/me/top-podcasts", { params: query, signal })).data);
  },
  async playlists(page: number, limit: number, signal?: AbortSignal): Promise<PlaylistListDto> {
    return PlaylistListSchema.parse((await apiClient.get("/api/me/playlists", { params: { page, limit }, signal })).data);
  },
  async playlist(id: string, page: number, limit = 5, signal?: AbortSignal): Promise<PlaylistDetailDto> {
    return PlaylistDetailSchema.parse((await apiClient.get(`/api/me/playlists/${id}`, { params: { page, limit }, signal })).data);
  },
  async create(name: string, key: string): Promise<PlaylistDto> {
    return PlaylistSchema.parse((await apiClient.post("/api/me/playlists", { name }, { headers: { "Idempotency-Key": key } })).data);
  },
  async rename(id: string, name: string): Promise<void> { await apiClient.patch(`/api/me/playlists/${id}`, { name }); },
  async delete(id: string): Promise<void> { await apiClient.delete(`/api/me/playlists/${id}`); },
  async add(id: string, episodeId: string): Promise<void> { await apiClient.post(`/api/me/playlists/${id}/items`, { episodeId }); },
  async remove(id: string, episodeId: string): Promise<void> { await apiClient.delete(`/api/me/playlists/${id}/items/${episodeId}`); },
  async reorder(id: string, episodeIds: string[]): Promise<void> { await apiClient.put(`/api/me/playlists/${id}/items/order`, { episodeIds }); },
  async tracks(id: string): Promise<PlaylistTrack[]> {
    const first = await libraryService.playlist(id, 1, 50);
    const items = [...first.items];
    for (let page = 2; page <= Math.ceil(first.total / 50); page++) {
      const next = await libraryService.playlist(id, page, 50);
      if (next.playlist.updatedAt.getTime() !== first.playlist.updatedAt.getTime() || next.total !== first.total) throw new Error("Playlist đã thay đổi. Vui lòng tải lại trước khi phát hoặc sắp xếp.");
      items.push(...next.items);
    }
    return items;
  },
  async move(id: string, episodeId: string, offset: number): Promise<void> {
    const tracks = await libraryService.tracks(id);
    const index = tracks.findIndex((item) => item.episodeId === episodeId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= tracks.length) return;
    [tracks[index], tracks[target]] = [tracks[target]!, tracks[index]!];
    await apiClient.put(`/api/me/playlists/${id}/items/order`, { episodeIds: tracks.map((item) => item.episodeId) });
  },
};
