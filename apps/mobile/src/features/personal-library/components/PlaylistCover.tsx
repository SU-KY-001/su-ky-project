import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ImageSourcePropType } from "react-native";
import { XStack, YStack } from "tamagui";
import { AppIcon, AppImage } from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { podcastApi } from "@/features/heritage-app/podcastApi";
import { libraryService } from "../services/libraryService";

export function EpisodeThumbnail({ episodeId, seriesSlug, size = 48 }: { episodeId: string; seriesSlug: string; size?: number }): React.JSX.Element {
  const query = useQuery({ queryKey: ["podcast", "series", seriesSlug], queryFn: () => podcastApi.getSeries(seriesSlug), staleTime: 300000 });
  const image = query.data?.episodes.find((episode) => episode.id === episodeId)?.image ?? query.data?.cover;
  return image ? <AppImage source={image} w={size} h={size} rounded={4} /> : <YStack w={size} h={size} bg="$paperDeep" rounded="$2" items="center" justify="center"><AppIcon name="music" size={20} /></YStack>;
}

export function usePlaylistCover(id: string): ImageSourcePropType[] {
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["me", "playlists", userId, id, "cover"], enabled: Boolean(userId),
    queryFn: async ({ signal }): Promise<ImageSourcePropType[]> => {
      const playlist = await libraryService.playlist(id, 1, 4, signal);
      const results = await Promise.all(playlist.items.filter((item) => item.available).map(async (item) => {
        try {
          const series = await client.fetchQuery({ queryKey: ["podcast", "series", item.seriesSlug], queryFn: () => podcastApi.getSeries(item.seriesSlug), staleTime: 300000 });
          return series.episodes.find((episode) => episode.id === item.episodeId)?.image ?? series.cover;
        } catch { return null; }
      }));
      return results.filter((image): image is ImageSourcePropType => image !== null);
    },
  });
  return query.data ?? [];
}

export function PlaylistCover({ id, size = 64 }: { id: string; size?: number }): React.JSX.Element {
  const images = usePlaylistCover(id);
  return <YStack w={size} h={size} bg="$paperDeep" overflow="hidden" rounded="$2" items="center" justify="center">
    {images.length >= 4 ? <YStack>{[0, 2].map((row) => <XStack key={row}>{images.slice(row, row + 2).map((image, index) => <AppImage key={row + index} source={image} w={size / 2} h={size / 2} rounded={0} />)}</XStack>)}</YStack> : images[0] ? <AppImage source={images[0]} w={size} h={size} rounded={0} /> : <AppIcon name="music" size={Math.min(36, size / 2)} />}
  </YStack>;
}
