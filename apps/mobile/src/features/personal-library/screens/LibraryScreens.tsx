import { useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button, Input, ScrollView, Spinner, Text, XStack, YStack } from "tamagui";
import { PlaylistNameSchema } from "@repo/shared";
import { AppCard, AppHeader, PrimaryButton, Chip } from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { usePlaylist, usePlaylists } from "../hooks/useLibrary";
import { libraryService, type PlaylistTrack } from "../services/libraryService";
import { LibraryPages, RankingSection } from "../components/LibrarySections";

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
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const key = useRef({ name: "", value: newKey() });
  const query = usePlaylists(page, 5);
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: async (action: { type: "create"; name: string } | { type: "add"; id: string }): Promise<void> => {
    const ownerId = user?.id;
    if (action.type === "add") { await libraryService.add(action.id, addingEpisodeId!); return; }
    if (key.current.name !== action.name) key.current = { name: action.name, value: newKey() };
    const created = await libraryService.create(action.name, key.current.value);
    if (useAuthStore.getState().user?.id !== ownerId) return;
    if (addingEpisodeId) await libraryService.add(created.id, addingEpisodeId);
    key.current = { name: "", value: newKey() }; setName("");
  }, onSuccess: () => { void client.invalidateQueries({ queryKey: ["me", "playlists"] }); } });
  return <YStack f={1} bg="$paper"><AppHeader title={addingEpisodeId ? "Thêm tập vào playlist" : "Playlist của bạn"} onBack={mutation.isPending ? undefined : onBack} /><ScrollView f={1} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets><YStack px="$4" py="$3" pb="$6" g="$4">
    {!user ? <PrimaryButton label="Đăng nhập để quản lý playlist" onPress={onLogin} /> : <>
      <AppCard><YStack p="$4" g="$3"><Text ff="$heading" fs="$3" fw="$7" color="$ink">Tạo playlist mới</Text><Input accessibilityLabel="Tên playlist mới" placeholder="Ví dụ: Những câu chuyện yêu thích" value={name} onChangeText={(value) => { setName(value); setValidation(null); }} disabled={mutation.isPending} ff="$body" color="$ink" placeholderTextColor="$inkSoft" bg="$paperSoft" bc="$line" minH="$5" maxLength={100} />{validation ? <Text accessibilityRole="alert" color="$vermilion" ff="$body" fs="$2">{validation}</Text> : null}<PrimaryButton label={mutation.isPending ? "Đang lưu…" : addingEpisodeId ? "Tạo và thêm tập" : "Tạo playlist"} disabled={mutation.isPending} onPress={() => { const parsed = PlaylistNameSchema.safeParse({ name }); if (!parsed.success) { setValidation("Nhập tên playlist từ 1 đến 100 ký tự."); return; } mutation.mutate({ type: "create", name: parsed.data.name }); }} /></YStack></AppCard>
      {mutation.isError ? <Text accessibilityRole="alert" ff="$body" fs="$2" color="$vermilion">{errorText(mutation.error)}</Text> : mutation.isSuccess ? <Text ff="$body" fs="$2" color="$bronzeDark">{addingEpisodeId ? "Đã thêm tập vào playlist." : "Đã tạo playlist."}</Text> : null}
      {query.isPending ? <Spinner color="$vermilion" /> : query.isError ? <PrimaryButton secondary label="Chưa tải được playlist. Thử lại" onPress={() => void query.refetch()} /> : !query.data.items.length ? <Text ff="$body" fs="$2" lh="$3" color="$inkSoft">Chưa có playlist. Tạo playlist đầu tiên ở phía trên.</Text> : query.data.items.map((item) => <AppCard key={item.id}><YStack p="$3" g="$3"><Button unstyled minH="$4" onPress={() => onOpen(item.id)} disabled={mutation.isPending} accessibilityRole="button"><Text ff="$heading" fs="$3" fw="$6" color="$ink">{item.name}</Text><Text ff="$body" fs="$1" color="$inkSoft">{item.itemCount} tập · Mở playlist</Text></Button>{addingEpisodeId ? <PrimaryButton secondary label="Thêm tập vào playlist này" disabled={mutation.isPending} onPress={() => mutation.mutate({ type: "add", id: item.id })} /> : null}</YStack></AppCard>)}
      {query.data && !query.isError ? <LibraryPages page={page} pages={Math.max(1, Math.ceil(query.data.total / 5))} pending={query.isFetching || mutation.isPending} onPage={setPage} /> : null}
    </>}
  </YStack></ScrollView></YStack>;
}

export function PlaylistDetailScreen({ id, page, onPage, onBack, onLogin, onPlay, onPlayTrack, onBrowse, error, busy }: { id: string; page: number; onPage: (page: number) => void; onBack: () => void; onLogin: () => void; onPlay: (id: string) => void; onPlayTrack: (id: string, episodeId: string) => void; onBrowse: () => void; error: string | null; busy: boolean }): React.JSX.Element {
  useBack(onBack);
  const user = useAuthStore((state) => state.user);
  const query = usePlaylist(id, page);
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mutation = useMutation({ mutationFn: async (action: { type: "rename" } | { type: "delete" } | { type: "remove"; episodeId: string } | { type: "move"; episodeId: string; offset: number }): Promise<void> => {
    if (action.type === "rename") { const parsed = PlaylistNameSchema.safeParse({ name }); if (!parsed.success) throw new Error("Nhập tên từ 1 đến 100 ký tự."); await libraryService.rename(id, parsed.data.name); setName(""); }
    if (action.type === "delete") await libraryService.delete(id);
    if (action.type === "remove") await libraryService.remove(id, action.episodeId);
    if (action.type === "move") await libraryService.move(id, action.episodeId, action.offset);
  }, onSuccess: (_, action) => {
    void client.invalidateQueries({ queryKey: ["me", "playlists"] });
    if (action.type === "remove" && query.data && page > 1 && (page - 1) * 5 >= query.data.total - 1) onPage(page - 1);
    if (action.type === "delete") onBack();
  } });
  const disabled = busy || mutation.isPending;
  return <YStack f={1} bg="$paper"><AppHeader title="Chi tiết playlist" onBack={disabled ? undefined : onBack} /><ScrollView key={`${id}-${page}`} f={1} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets><YStack px="$4" py="$3" pb="$6" g="$4">
    {!user ? <PrimaryButton label="Đăng nhập" onPress={onLogin} /> : query.isPending ? <Spinner color="$vermilion" /> : query.isError ? <PrimaryButton secondary label="Chưa mở được playlist. Thử lại" onPress={() => void query.refetch()} /> : <>
      <Text ff="$heading" fs="$4" lh="$4" fw="$7" color="$ink">{query.data.playlist.name}</Text><Text ff="$body" fs="$2" color="$inkSoft">{query.data.total} tập · Playlist riêng tư</Text>
      <PrimaryButton label={busy ? "Đang mở tập…" : "Phát playlist"} disabled={disabled || !query.data.total} onPress={() => onPlay(id)} />
      <PrimaryButton secondary label="Khám phá để thêm tập" onPress={onBrowse} disabled={disabled} />
      <AppCard><YStack p="$3" g="$3"><Input accessibilityLabel="Tên playlist mới" value={name} placeholder={query.data.playlist.name} onChangeText={setName} maxLength={100} disabled={disabled} ff="$body" color="$ink" bg="$paperSoft" bc="$line" /><PrimaryButton secondary label="Lưu tên mới" disabled={disabled || !name.trim()} onPress={() => mutation.mutate({ type: "rename" })} /></YStack></AppCard>
      {mutation.isError || error ? <Text accessibilityRole="alert" ff="$body" fs="$2" color="$vermilion">{error ?? errorText(mutation.error)}</Text> : null}
      {!query.data.items.length ? <Text ff="$body" fs="$2" color="$inkSoft">Trang này chưa có tập nào.</Text> : query.data.items.map((item: PlaylistTrack, index: number) => <AppCard key={item.episodeId}><YStack p="$3" g="$3"><Button unstyled minH="$5" disabled={disabled || !item.available} onPress={() => onPlayTrack(id, item.episodeId)} accessibilityRole="button"><Text ff="$heading" fs="$2" lh="$3" fw="$6" color={item.available ? "$ink" : "$inkSoft"}>{(page - 1) * 5 + index + 1}. {item.title}</Text><Text ff="$body" fs="$1" color="$inkSoft">{item.seriesTitle}{item.available ? "" : " · Không khả dụng, sẽ bỏ qua khi phát"}</Text></Button><XStack g="$2"><YStack f={1}><PrimaryButton secondary icon="arrow-up" label="Lên" disabled={disabled || (page === 1 && index === 0)} onPress={() => mutation.mutate({ type: "move", episodeId: item.episodeId, offset: -1 })} /></YStack><YStack f={1}><PrimaryButton secondary icon="arrow-down" label="Xuống" disabled={disabled || (page - 1) * 5 + index >= query.data.total - 1} onPress={() => mutation.mutate({ type: "move", episodeId: item.episodeId, offset: 1 })} /></YStack></XStack><PrimaryButton secondary label="Bỏ tập khỏi playlist" disabled={disabled} onPress={() => mutation.mutate({ type: "remove", episodeId: item.episodeId })} /></YStack></AppCard>)}
      <LibraryPages page={page} pages={Math.max(1, Math.ceil(query.data.total / 5))} pending={disabled || query.isFetching} onPage={onPage} />
      <AppCard><YStack p="$3" g="$3">{!confirmDelete ? <PrimaryButton secondary label="Xóa playlist" disabled={disabled} onPress={() => setConfirmDelete(true)} /> : <><Text ff="$body" fs="$2" lh="$3" color="$inkSoft">Chỉ xóa playlist và danh sách tập; các tập podcast và tiến độ nghe của bạn được giữ.</Text><PrimaryButton secondary label="Xác nhận xóa playlist" disabled={disabled} onPress={() => mutation.mutate({ type: "delete" })} /><PrimaryButton secondary label="Hủy" disabled={disabled} onPress={() => setConfirmDelete(false)} /></>}</YStack></AppCard>
    </>}
  </YStack></ScrollView></YStack>;
}
