import { useState } from "react";
import { Modal, PanResponder, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlaylistNameSchema } from "@repo/shared";
import { Button, Input, ScrollView, Spinner, Text, XStack, YStack } from "tamagui";
import { AppIcon } from "@/shared/ui";
import { libraryService, type PlaylistTrack } from "../services/libraryService";
import { EpisodeThumbnail, PlaylistCover } from "./PlaylistCover";
import { moveItem } from "./reorder";

const ROW_HEIGHT = 72;
function ReorderHandle({ index, count, onMove }: { index: number; count: number; onMove: (from: number, to: number) => void }): React.JSX.Element {
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderRelease: (_, gesture) => onMove(index, Math.max(0, Math.min(count - 1, index + Math.round(gesture.dy / ROW_HEIGHT)))),
  });
  return <View {...responder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="Sắp xếp thứ tự tập" accessibilityHint="Kéo lên hoặc xuống để thay đổi thứ tự" accessibilityActions={[{ name: "increment", label: "Chuyển xuống" }, { name: "decrement", label: "Chuyển lên" }]} onAccessibilityAction={(event) => onMove(index, Math.max(0, Math.min(count - 1, index + (event.nativeEvent.actionName === "increment" ? 1 : -1))))} style={{ width: 48, height: ROW_HEIGHT, alignItems: "center", justifyContent: "center" }}><AppIcon name="menu" color="#5B4E44" /></View>;
}

function Editor({ id, initialName, initialTracks, onClose, onSaved }: { id: string; initialName: string; initialTracks: PlaylistTrack[]; onClose: () => void; onSaved: (tracks: PlaylistTrack[]) => void }): React.JSX.Element {
  const client = useQueryClient();
  const [name, setName] = useState(initialName);
  const [nameWidth, setNameWidth] = useState(0);
  const { width } = useWindowDimensions();
  const [tracks, setTracks] = useState(initialTracks);
  const [validation, setValidation] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: async (): Promise<void> => {
    const parsed = PlaylistNameSchema.safeParse({ name });
    if (!parsed.success) throw new Error("Nhập tên playlist từ 1 đến 100 ký tự.");
    const kept = new Set(tracks.map((item) => item.episodeId));
    for (const item of initialTracks) if (!kept.has(item.episodeId)) await libraryService.remove(id, item.episodeId);
    if (parsed.data.name !== initialName) await libraryService.rename(id, parsed.data.name);
    await libraryService.reorder(id, tracks.map((item) => item.episodeId));
  }, onSuccess: () => { void client.invalidateQueries({ queryKey: ["me", "playlists"] }); onSaved(tracks); onClose(); }, onError: () => { setValidation("Chưa lưu xong. Một số thay đổi có thể đã được lưu; hãy thử lại hoặc mở lại playlist để kiểm tra."); void client.invalidateQueries({ queryKey: ["me", "playlists"] }); } });
  const move = (from: number, to: number): void => setTracks((current) => moveItem(current, from, to));
  return <YStack f={1} bg="$paper">
    <XStack h={56} px="$4" items="center" justify="space-between"><Button unstyled disabled={mutation.isPending} onPress={onClose}><Text color="$inkSoft" fs="$2">Hủy</Text></Button><Text color="$ink" fs="$3" fw="$7">Chỉnh sửa playlist</Text><Button unstyled disabled={mutation.isPending} onPress={() => { if (!PlaylistNameSchema.safeParse({ name }).success) { setValidation("Nhập tên playlist từ 1 đến 100 ký tự."); return; } setValidation(null); mutation.mutate(); }}><Text color="$vermilion" fs="$2" fw="$7">{mutation.isPending ? "Đang lưu…" : "Lưu"}</Text></Button></XStack>
    <ScrollView f={1} keyboardShouldPersistTaps="handled"><YStack px="$4" pb="$6" g="$4">
      <YStack items="center" g="$3" pt="$3"><PlaylistCover id={id} size={160} /><Text pos="absolute" op={0} pointerEvents="none" aria-hidden ff="$body" fs="$4" fw="$7" numberOfLines={1} onLayout={(event) => setNameWidth(event.nativeEvent.layout.width)}>{name || " "}</Text><YStack w={Math.min(width - 48, Math.max(64, nameWidth + 24))} borderBottomWidth={2} bc="$bronzeDark"><Input unstyled w="100%" minH={48} accessibilityLabel="Tên playlist" value={name} onChangeText={setName} maxLength={100} disabled={mutation.isPending} text="center" ff="$body" color="$ink" fs="$4" fw="$7" /></YStack></YStack>
      {validation ? <Text accessibilityRole="alert" color="$vermilion">{validation}</Text> : null}
      {tracks.map((item, index) => <XStack key={item.episodeId} minH={ROW_HEIGHT} items="center" g="$2" borderBottomWidth={1} bc="$line"><Button unstyled w={40} h={48} items="center" justify="center" disabled={mutation.isPending} onPress={() => setTracks((current) => current.filter((entry) => entry.episodeId !== item.episodeId))} accessibilityRole="button" accessibilityLabel={`Xóa ${item.title} khỏi playlist`}><AppIcon name="minus-circle" color="#B8322A" size={23} /></Button><EpisodeThumbnail episodeId={item.episodeId} seriesSlug={item.seriesSlug} /><YStack f={1} minW={0}><Text color="$ink" fs="$2" fw="$6" numberOfLines={2}>{item.title}</Text><Text color="$inkSoft" fs="$1" numberOfLines={1}>{item.seriesTitle}</Text></YStack>{!mutation.isPending ? <ReorderHandle index={index} count={tracks.length} onMove={move} /> : null}</XStack>)}
      {!tracks.length ? <Text color="$inkSoft" fs="$2">Playlist chưa có tập nào.</Text> : null}
    </YStack></ScrollView>
  </YStack>;
}

export function EditPlaylistModal({ id, name, onClose, onSaved }: { id: string; name: string; onClose: () => void; onSaved: (tracks: PlaylistTrack[]) => void }): React.JSX.Element {
  const query = useQuery({ queryKey: ["me", "playlists", id, "edit-tracks"], queryFn: () => libraryService.tracks(id), staleTime: 0 });
  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}><SafeAreaView style={{ flex: 1, backgroundColor: "#F4ECDC" }}><YStack f={1} bg="$paper">{query.isPending ? <YStack f={1} items="center" justify="center"><Spinner color="$vermilion" /></YStack> : query.isError ? <YStack p="$4" g="$3"><Text color="$vermilion">Chưa tải được playlist.</Text><Button onPress={() => void query.refetch()}>Thử lại</Button><Button onPress={onClose}>Đóng</Button></YStack> : <Editor id={id} initialName={name} initialTracks={query.data} onClose={onClose} onSaved={onSaved} />}</YStack></SafeAreaView></Modal>;
}
