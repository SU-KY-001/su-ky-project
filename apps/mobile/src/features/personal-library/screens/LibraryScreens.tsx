import { useEffect, useRef, useState } from "react";
import { BackHandler, Modal, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button, Input, ScrollView, Spinner, Text, XStack, YStack } from "tamagui";
import { PlaylistNameSchema } from "@repo/shared";
import { AppCard, AppHeader, AppIcon, AppImage, PrimaryButton, Chip } from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { useAllPlaylists, usePlaylist } from "../hooks/useLibrary";
import { libraryService, type PlaylistTrack } from "../services/libraryService";
import { LibraryPages, RankingSection } from "../components/LibrarySections";
import { EpisodeThumbnail, PlaylistCover, usePlaylistCover } from "../components/PlaylistCover";
import { EditPlaylistModal } from "../components/EditPlaylistModal";
import { AddToPlaylistModal } from "../components/AddToPlaylistModal";
import { AddEpisodesModal } from "../components/AddEpisodesModal";
import type { PlaylistMode } from "@/features/heritage-app/playlistPlayback";

function useBack(onBack: () => void): void {
  useEffect(() => { const subscription = BackHandler.addEventListener("hardwareBackPress", () => { onBack(); return true; }); return () => subscription.remove(); }, [onBack]);
}
function newKey(): string { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.floor(Math.random() * 16); return (c === "x" ? r : (r & 3) | 8).toString(16); }); }
function errorText(error: unknown): string {
  if (axios.isAxiosError<{ error_code?: string; message?: string }>(error)) {
    const body = error.response?.data;
    if (body?.error_code && ["VALIDATION_ERROR", "CONFLICT", "CONTENT_UNAVAILABLE"].includes(body.error_code)) return body.message ?? "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.";
    if (error.response?.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.response?.status === 404) return "Playlist không còn tồn tại hoặc chưa sẵn sàng.";
    return "Chưa thực hiện được. Kiểm tra kết nối rồi thử lại.";
  }
  return error instanceof Error ? error.message : "Chưa thực hiện được. Vui lòng thử lại.";
}
export function RankingsScreen({ scope, period, page, onPeriod, onPage, onBack, onPlay, onLogin, error }: { scope: "personal" | "system"; period: "week" | "month"; page: number; onPeriod: (period: "week" | "month") => void; onPage: (page: number) => void; onBack: () => void; onPlay: (slug: string) => void; onLogin: () => void; error: string | null }): React.JSX.Element {
  useBack(onBack);
  return <YStack f={1} bg="$paper"><AppHeader title="Top podcast" onBack={onBack} /><ScrollView key={`${period}-${page}`} f={1}><YStack px="$4" py="$3" g="$4"><XStack g="$2"><Chip label="Tuần" selected={period === "week"} onPress={() => onPeriod("week")} /><Chip label="Tháng" selected={period === "month"} onPress={() => onPeriod("month")} /></XStack>{error ? <Text accessibilityRole="alert" ff="$body" fs="$2" color="$vermilion">{error}</Text> : null}<RankingSection scope={scope} period={period} page={page} limit={5} onPlay={onPlay} onLogin={onLogin} onPage={onPage} /></YStack></ScrollView></YStack>;
}

export function PlaylistsScreen({ onBack, onLogin, onOpen, addingEpisodeId }: { onBack: () => void; onLogin: () => void; onOpen: (id: string) => void; addingEpisodeId: string | null }): React.JSX.Element {
  useBack(onBack);
  const user = useAuthStore((state) => state.user);
  const [name, setName] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const key = useRef({ name: "", value: newKey() });
  const query = useAllPlaylists();
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: async (action: { type: "create"; name: string } | { type: "add"; id: string }): Promise<void> => {
    const ownerId = user?.id;
    if (action.type === "add") { await libraryService.add(action.id, addingEpisodeId!); return; }
    if (key.current.name !== action.name) key.current = { name: action.name, value: newKey() };
    const created = await libraryService.create(action.name, key.current.value);
    if (useAuthStore.getState().user?.id !== ownerId) return;
    if (addingEpisodeId) await libraryService.add(created.id, addingEpisodeId);
    key.current = { name: "", value: newKey() }; setName(""); setShowCreate(false);
  }, onSuccess: () => { void client.invalidateQueries({ queryKey: ["me", "playlists"] }); } });
  return <YStack f={1} bg="$paper"><AppHeader title={addingEpisodeId ? "Thêm tập vào playlist" : "Playlist"} onBack={addingEpisodeId && !mutation.isPending ? onBack : undefined} /><ScrollView f={1} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets><YStack px="$4" py="$3" pb="$6" g="$4">
    {!user ? <PrimaryButton label="Đăng nhập để quản lý playlist" onPress={onLogin} /> : <>
      <XStack items="center" justify="space-between"><Chip label="Danh sách phát" selected onPress={() => undefined} /><Button unstyled fd="row" items="center" g="$1" minH="$4" onPress={() => setShowCreate(!showCreate)} accessibilityRole="button" accessibilityLabel={showCreate ? "Đóng tạo playlist" : "Tạo playlist"}><AppIcon name={showCreate ? "x" : "plus"} size={24} /><Text color="$ink" ff="$body" fs="$2">{showCreate ? "Đóng" : "Tạo mới"}</Text></Button></XStack>
      {showCreate ? <AppCard><YStack p="$4" g="$3"><Text ff="$heading" fs="$3" fw="$7" color="$ink">Tạo playlist mới</Text><Input accessibilityLabel="Tên playlist mới" placeholder="Ví dụ: Những câu chuyện yêu thích" value={name} onChangeText={(value) => { setName(value); setValidation(null); }} disabled={mutation.isPending} ff="$body" color="$ink" placeholderTextColor="$inkSoft" bg="$paperSoft" bc="$line" minH="$5" maxLength={100} />{validation ? <Text accessibilityRole="alert" color="$vermilion" ff="$body" fs="$2">{validation}</Text> : null}<PrimaryButton label={mutation.isPending ? "Đang lưu…" : addingEpisodeId ? "Tạo và thêm tập" : "Tạo playlist"} disabled={mutation.isPending} onPress={() => { const parsed = PlaylistNameSchema.safeParse({ name }); if (!parsed.success) { setValidation("Nhập tên playlist từ 1 đến 100 ký tự."); return; } mutation.mutate({ type: "create", name: parsed.data.name }); }} /></YStack></AppCard> : null}
      {mutation.isError ? <Text accessibilityRole="alert" ff="$body" fs="$2" color="$vermilion">{errorText(mutation.error)}</Text> : mutation.isSuccess ? <Text ff="$body" fs="$2" color="$bronzeDark">{addingEpisodeId ? "Đã thêm tập vào playlist." : "Đã tạo playlist."}</Text> : null}
      <Text ff="$body" fs="$1" color="$inkSoft">Danh sách phát của bạn</Text>
      {query.isPending ? <Spinner color="$vermilion" /> : query.isError ? <PrimaryButton secondary label="Chưa tải được playlist. Thử lại" onPress={() => void query.refetch()} /> : !query.data.items.length ? <Text ff="$body" fs="$2" lh="$3" color="$inkSoft">Chưa có playlist. Hãy tạo playlist đầu tiên.</Text> : query.data.items.map((item) => <YStack key={item.id} g="$2"><Button unstyled fd="row" items="center" g="$3" minH={64} onPress={() => onOpen(item.id)} disabled={mutation.isPending} accessibilityRole="button"><PlaylistCover id={item.id} /><YStack f={1} minW={0} g="$1"><Text ff="$heading" fs="$3" fw="$6" color="$ink" numberOfLines={2}>{item.name}</Text><Text ff="$body" fs="$1" color="$inkSoft">Playlist · {item.itemCount} tập</Text></YStack></Button>{addingEpisodeId ? <PrimaryButton secondary label="Thêm tập vào playlist này" disabled={mutation.isPending} onPress={() => mutation.mutate({ type: "add", id: item.id })} /> : null}</YStack>)}
    </>}
  </YStack></ScrollView></YStack>;
}

export function PlaylistDetailScreen({ id, onPage, onBack, onLogin, onPlay, onPlayTrack, mode, onCycleMode, onSaved, error, busy }: { id: string; page: number; onPage: (page: number) => void; onBack: () => void; onLogin: () => void; onPlay: (id: string) => void; onPlayTrack: (id: string, episodeId: string) => void; mode: PlaylistMode; onCycleMode: () => void; onSaved: (tracks: PlaylistTrack[]) => void; error: string | null; busy: boolean }): React.JSX.Element {
  useBack(onBack);
  const user = useAuthStore((state) => state.user);
  const query = usePlaylist(id, 1);
  const cover = usePlaylistCover(id);
  const tracksQuery = useQuery({ queryKey: ["me", "playlists", user?.id, id, "tracks"], queryFn: () => libraryService.tracks(id), enabled: Boolean(user), staleTime: 0 });
  const [editing, setEditing] = useState(false);
  const [addingEpisodes, setAddingEpisodes] = useState(false);
  const [menuTrack, setMenuTrack] = useState<PlaylistTrack | null>(null);
  const [addingTrack, setAddingTrack] = useState<PlaylistTrack | null>(null);
  const pendingPicker = useRef<PlaylistTrack | null>(null);
  const insets = useSafeAreaInsets();
  const disabled = busy;
  const tracks = tracksQuery.data ?? [];
  const durations = tracks.map((item) => item.narrations[0]?.durationMs);
  const minutes = durations.every((value) => value != null) ? Math.ceil(durations.reduce<number>((sum, value) => sum + (value ?? 0), 0) / 60000) : null;
  const durationLabel = minutes === null ? "Thời lượng chưa đầy đủ" : minutes >= 60 ? `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút` : `${minutes} phút`;
  const modeLabel = mode === "shuffle" ? "Trộn ngẫu nhiên" : mode === "repeat" ? "Lặp lại playlist" : "Phát theo thứ tự";
  return <YStack f={1} bg="$nightSoft">
    <StatusBar style="light" />
    <YStack pos="absolute" t={0} b={0} l={0} r={0} pointerEvents="none">{cover[0] ? <AppImage source={cover[0]} w="100%" h="100%" blurRadius={30} rounded={0} /> : null}<YStack pos="absolute" t={0} b={0} l={0} r={0} bg="rgba(20,17,15,0.82)" /></YStack>
    <ScrollView f={1} showsVerticalScrollIndicator={false}>
    <YStack px="$4" pb="$4" g="$3">
      <Button unstyled w={44} h={44} items="center" justify="center" onPress={onBack} disabled={disabled} accessibilityRole="button" accessibilityLabel="Quay lại"><AppIcon name="chevron-left" size={25} color="#FAF6ED" /></Button>
      {!user ? <PrimaryButton label="Đăng nhập" onPress={onLogin} /> : query.isPending ? <Spinner color="$paperSoft" /> : query.isError ? <PrimaryButton secondary label="Chưa mở được playlist. Thử lại" onPress={() => void query.refetch()} /> : <>
        <YStack items="center" pb="$2"><PlaylistCover id={id} size={230} /></YStack>
        <Text ff="$heading" fs="$5" lh="$5" fw="$7" color="$paperSoft">{query.data.playlist.name}</Text>
        <XStack items="center" g="$2">{user.image ? <AppImage source={{ uri: user.image }} w={24} h={24} rounded={12} /> : <YStack w={24} h={24} rounded="$12" bg="$paperDeep" items="center" justify="center"><AppIcon name="user" size={14} /></YStack>}<Text ff="$body" color="$paperSoft" fs="$1" fw="$7">{user.name}</Text></XStack>
        <Text ff="$body" color="$paperDeep" fs="$1">{query.data.total} tập · {tracksQuery.isPending ? "Đang tính thời lượng…" : tracksQuery.isError ? "Chưa tải được thời lượng" : durationLabel}</Text>
      </>}
    </YStack>
    {user && query.data ? <YStack px="$4" py="$3" pb="$6" g="$3">
      <XStack items="center" g="$2"><Button unstyled fd="row" items="center" g="$1" bg="$paperSoft" rounded="$10" px="$3" py="$2" disabled={disabled || tracksQuery.isPending || tracksQuery.isError} onPress={() => setAddingEpisodes(true)} accessibilityRole="button"><AppIcon name="plus" size={16} /><Text color="$ink" fs="$1" fw="$7">Thêm</Text></Button><Button unstyled fd="row" items="center" g="$1" bg="$paperSoft" rounded="$10" px="$3" py="$2" disabled={disabled} onPress={() => setEditing(true)} accessibilityRole="button"><AppIcon name="edit-2" size={16} /><Text color="$ink" fs="$1" fw="$7">Chỉnh sửa</Text></Button><YStack f={1} /><Button unstyled w={48} h={48} items="center" justify="center" onPress={onCycleMode} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Chế độ: ${modeLabel}. Nhấn để đổi chế độ`}><AppIcon name={mode === "repeat" ? "repeat" : "shuffle"} size={22} color={mode === "normal" ? "#FAF6ED" : "#E8A45B"} /></Button><Button unstyled w={56} h={56} rounded="$12" bg="$vermilion" items="center" justify="center" onPress={() => onPlay(id)} disabled={disabled || !query.data.total} op={disabled || !query.data.total ? 0.45 : 1} accessibilityRole="button" accessibilityLabel={busy ? "Đang mở playlist" : "Phát playlist"}><MaterialIcons name="play-arrow" size={32} color="#FAF6ED" /></Button></XStack>
      {error ? <Text accessibilityRole="alert" ff="$body" fs="$2" color="$paperSoft">{error}</Text> : null}
      {tracksQuery.isPending ? <Spinner color="$paperSoft" /> : tracksQuery.isError ? <PrimaryButton secondary label="Chưa tải được các tập. Thử lại" onPress={() => void tracksQuery.refetch()} /> : !tracks.length ? <Text ff="$body" fs="$2" color="$paperDeep">Playlist chưa có tập nào.</Text> : tracks.map((item) => <XStack key={item.episodeId} minH={64} items="center" g="$2"><Button unstyled f={1} minW={0} fd="row" items="center" g="$3" disabled={disabled || !item.available} onPress={() => onPlayTrack(id, item.episodeId)} accessibilityRole="button" accessibilityLabel={`Phát ${item.title}`}><EpisodeThumbnail episodeId={item.episodeId} seriesSlug={item.seriesSlug} /><YStack f={1} minW={0}><Text ff="$heading" fs="$2" lh="$3" fw="$6" color={item.available ? "$paperSoft" : "$paperDeep"} numberOfLines={2}>{item.title}</Text><Text ff="$body" fs="$1" color="$paperDeep" numberOfLines={1}>{item.seriesTitle}{item.available ? "" : " · Không khả dụng"}</Text></YStack></Button><Button unstyled w={44} h={48} items="center" justify="center" onPress={() => setMenuTrack(item)} accessibilityRole="button" accessibilityLabel={`Tùy chọn ${item.title}`}><AppIcon name="more-vertical" size={20} color="#FAF6ED" /></Button></XStack>)}
      {editing ? <EditPlaylistModal id={id} name={query.data.playlist.name} onClose={() => setEditing(false)} onSaved={(items) => { onPage(1); onSaved(items); }} /> : null}
      {addingEpisodes ? <AddEpisodesModal playlistId={id} existingIds={tracks.map((item) => item.episodeId)} onClose={() => setAddingEpisodes(false)} onAdded={onSaved} /> : null}
    </YStack> : null}
  </ScrollView>
  <Modal visible={Boolean(menuTrack)} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onDismiss={() => { if (pendingPicker.current) { setAddingTrack(pendingPicker.current); pendingPicker.current = null; } }} onRequestClose={() => setMenuTrack(null)}><YStack f={1} justify="flex-end" bg="rgba(0,0,0,0.55)"><Button unstyled f={1} onPress={() => setMenuTrack(null)} accessibilityLabel="Đóng tùy chọn" /><YStack bg="$nightSoft" borderTopLeftRadius="$6" borderTopRightRadius="$6" pb={Math.max(insets.bottom, 16)}><YStack w={36} h={4} rounded="$10" bg="$inkSoft" self="center" mt="$2" /><XStack p="$4" g="$3" items="center" borderBottomWidth={1} bc="$inkSoft">{menuTrack ? <EpisodeThumbnail episodeId={menuTrack.episodeId} seriesSlug={menuTrack.seriesSlug} /> : null}<YStack f={1} minW={0}><Text color="$paperSoft" fs="$2" fw="$7" numberOfLines={2}>{menuTrack?.title}</Text><Text color="$paperDeep" fs="$1" numberOfLines={1}>{menuTrack?.seriesTitle}</Text></YStack></XStack><Button unstyled minH={56} px="$4" fd="row" items="center" g="$3" disabled={!menuTrack?.available || disabled} onPress={() => { if (menuTrack) onPlayTrack(id, menuTrack.episodeId); setMenuTrack(null); }} accessibilityRole="button"><AppIcon name="play-circle" color="#FAF6ED" /><Text color="$paperSoft" fs="$2">Phát podcast</Text></Button><Button unstyled minH={56} px="$4" fd="row" items="center" g="$3" disabled={!menuTrack?.available} onPress={() => { const item = menuTrack; setMenuTrack(null); if (item) { if (Platform.OS === "ios") pendingPicker.current = item; else setAddingTrack(item); } }} accessibilityRole="button"><AppIcon name="plus-circle" color="#FAF6ED" /><Text color="$paperSoft" fs="$2">Thêm vào playlist</Text></Button></YStack></YStack></Modal>
  {addingTrack ? <AddToPlaylistModal episodeId={addingTrack.episodeId} onClose={() => setAddingTrack(null)} /> : null}
  </YStack>;
}
