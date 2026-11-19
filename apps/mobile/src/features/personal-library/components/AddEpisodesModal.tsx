import { useState } from "react";
import { Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, ScrollView, Spinner, Text, XStack, YStack } from "tamagui";
import { AppIcon, AppImage, PrimaryButton } from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { podcastApi, type PodcastEpisode, type PodcastSeries } from "@/features/heritage-app/podcastApi";
import { libraryService, type PlaylistTrack } from "../services/libraryService";

export function AddEpisodesModal({ playlistId, existingIds, onClose, onAdded }: { playlistId: string; existingIds: string[]; onClose: () => void; onAdded: (tracks: PlaylistTrack[]) => void }): React.JSX.Element {
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const query = useQuery({
    queryKey: ["podcast", "playlist-picker"],
    queryFn: async (): Promise<PodcastEpisode[]> => {
      const series: PodcastSeries[] = [];
      let page = 1;
      while (true) {
        const items = await podcastApi.listSeries({ page });
        series.push(...items);
        if (items.length < 20) break;
        page++;
      }
      const details = await Promise.all(series.map((item) => client.fetchQuery({ queryKey: ["podcast", "series", item.slug], queryFn: () => podcastApi.getSeries(item.slug), staleTime: 300000 })));
      return details.flatMap((detail) => detail.episodes).filter((episode) => Boolean(episode.narrationId));
    },
    staleTime: 60000,
  });
  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      for (const episodeId of selected) {
        if (useAuthStore.getState().user?.id !== userId) throw new Error("Phiên đăng nhập đã thay đổi.");
        await libraryService.add(playlistId, episodeId);
      }
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["me", "playlists"] });
      try { if (useAuthStore.getState().user?.id === userId) onAdded(await libraryService.tracks(playlistId)); } catch { /* The playlist is still updated and will refresh on the next playback. */ }
      onClose();
    },
    onError: () => { void client.invalidateQueries({ queryKey: ["me", "playlists"] }); },
  });
  const existing = new Set(existingIds);
  const term = search.trim().toLocaleLowerCase("vi");
  const episodes = (query.data ?? []).filter((item) => `${item.title} ${item.seriesTitle}`.toLocaleLowerCase("vi").includes(term));
  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={() => { if (!mutation.isPending) onClose(); }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4ECDC" }}><YStack f={1} bg="$paper">
      <XStack h={56} px="$4" items="center" g="$3"><Button unstyled disabled={mutation.isPending} onPress={onClose} accessibilityRole="button"><Text color="$inkSoft" fs="$2">Hủy</Text></Button><Text f={1} color="$ink" fs="$3" fw="$7" text="center">Thêm tập podcast</Text><YStack w={30} /></XStack>
      <YStack px="$4" pb="$3"><Input accessibilityLabel="Tìm tập podcast" placeholder="Tìm tập hoặc series" value={search} onChangeText={setSearch} bg="$paperSoft" bc="$line" color="$ink" /></YStack>
      <ScrollView f={1} keyboardShouldPersistTaps="handled"><YStack px="$4" pb="$4" g="$2">
        {query.isPending ? <YStack py="$6" items="center"><Spinner color="$vermilion" /><Text color="$inkSoft" fs="$2">Đang tải podcast…</Text></YStack> : query.isError ? <PrimaryButton secondary label="Chưa tải được podcast. Thử lại" onPress={() => void query.refetch()} /> : !episodes.length ? <Text color="$inkSoft" fs="$2">Không tìm thấy tập podcast.</Text> : episodes.map((episode) => {
          const alreadyAdded = existing.has(episode.id);
          const checked = alreadyAdded || selected.includes(episode.id);
          return <Button key={episode.id} unstyled minH={64} fd="row" items="center" g="$3" disabled={alreadyAdded || mutation.isPending} onPress={() => setSelected((current) => current.includes(episode.id) ? current.filter((id) => id !== episode.id) : [...current, episode.id])} accessibilityRole="checkbox" accessibilityState={{ checked, disabled: alreadyAdded || mutation.isPending }} accessibilityLabel={`${episode.title}${alreadyAdded ? ", đã có trong playlist" : ""}`}><AppImage source={episode.image} w={52} h={52} rounded={5} /><YStack f={1} minW={0}><Text color="$ink" fs="$2" fw="$6" numberOfLines={2}>{episode.title}</Text><Text color="$inkSoft" fs="$1" numberOfLines={1}>{alreadyAdded ? "Đã có trong playlist" : episode.seriesTitle}</Text></YStack><AppIcon name={checked ? "check-circle" : "circle"} color={checked ? "#B8322A" : "#5B4E44"} size={22} /></Button>;
        })}
        {mutation.isError ? <Text accessibilityRole="alert" color="$vermilion" fs="$2">Chưa thêm được tất cả các tập. Một số tập có thể đã được thêm; hãy thử lại.</Text> : null}
      </YStack></ScrollView>
      <YStack px="$4" pt="$2" pb="$4"><PrimaryButton label={mutation.isPending ? "Đang thêm…" : selected.length ? `Thêm ${selected.length} tập` : "Chọn tập để thêm"} disabled={!selected.length || mutation.isPending} onPress={() => mutation.mutate()} /></YStack>
    </YStack></SafeAreaView>
  </Modal>;
}
