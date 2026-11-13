import { useRef, useState } from "react";
import { Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { PlaylistNameSchema } from "@repo/shared";
import { Button, Input, ScrollView, Spinner, Text, XStack, YStack } from "tamagui";
import { AppIcon, PrimaryButton } from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { useAllPlaylists } from "../hooks/useLibrary";
import { libraryService } from "../services/libraryService";
import { PlaylistCover } from "./PlaylistCover";

function newKey(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.floor(Math.random() * 16); return (c === "x" ? r : (r & 3) | 8).toString(16); });
}

export function AddToPlaylistModal({ episodeId, onClose }: { episodeId: string; onClose: () => void }): React.JSX.Element {
  const userId = useAuthStore((state) => state.user?.id);
  const query = useAllPlaylists();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const createKey = useRef({ name: "", key: newKey() });
  const mutation = useMutation({
    mutationFn: async (action: { type: "add"; id: string } | { type: "create"; name: string }): Promise<void> => {
      let id: string;
      if (action.type === "create") {
        if (createKey.current.name !== action.name) createKey.current = { name: action.name, key: newKey() };
        const playlist = await libraryService.create(action.name, createKey.current.key);
        if (useAuthStore.getState().user?.id !== userId) throw new Error("Phiên đăng nhập đã thay đổi.");
        id = playlist.id;
      } else id = action.id;
      await libraryService.add(id, episodeId);
    },
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["me", "playlists"] }); setSaved(true); },
  });
  const items = query.data?.items.filter((item) => item.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))) ?? [];

  return <Modal visible transparent animationType="slide" onRequestClose={() => { if (!mutation.isPending) onClose(); }}>
    <YStack f={1} bg="rgba(0,0,0,0.55)" pt="$6">
      <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: "#FAF6ED", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" }}>
        <YStack f={1} bg="$paper">
          <XStack px="$4" h={56} items="center" g="$3"><Button unstyled onPress={onClose} disabled={mutation.isPending} accessibilityRole="button"><Text color="$inkSoft" fs="$2">Hủy</Text></Button><Text f={1} color="$ink" fs="$3" fw="$7" text="center">Thêm vào playlist</Text><YStack w={30} /></XStack>
          <ScrollView f={1} keyboardShouldPersistTaps="handled"><YStack px="$4" py="$3" g="$4">
            <PrimaryButton secondary icon="plus" label="Tạo playlist mới" onPress={() => { setCreating(!creating); setValidation(null); }} disabled={mutation.isPending || saved} />
            {creating ? <YStack g="$2"><Input accessibilityLabel="Tên playlist mới" placeholder="Tên playlist" value={name} onChangeText={(value) => { setName(value); setValidation(null); }} maxLength={100} disabled={mutation.isPending || saved} bg="$paperSoft" bc="$line" color="$ink" /><PrimaryButton label="Tạo và thêm tập" disabled={mutation.isPending || saved} onPress={() => { const parsed = PlaylistNameSchema.safeParse({ name }); if (!parsed.success) { setValidation("Nhập tên playlist từ 1 đến 100 ký tự."); return; } mutation.mutate({ type: "create", name: parsed.data.name }); }} /></YStack> : null}
            <Input accessibilityLabel="Tìm playlist" placeholder="Tìm playlist" value={search} onChangeText={setSearch} bg="$paperSoft" bc="$line" color="$ink" />
            {query.isPending ? <Spinner color="$vermilion" /> : query.isError ? <PrimaryButton secondary label="Không tải được playlist. Thử lại" onPress={() => void query.refetch()} /> : !items.length ? <Text color="$inkSoft" fs="$2">{search ? "Không tìm thấy playlist." : "Bạn chưa có playlist."}</Text> : items.map((item) => <Button key={item.id} unstyled minH={64} fd="row" items="center" g="$3" onPress={() => setSelected(item.id)} disabled={mutation.isPending || saved} accessibilityRole="radio" accessibilityState={{ checked: selected === item.id }}><PlaylistCover id={item.id} size={56} /><YStack f={1} minW={0}><Text color="$ink" fs="$2" fw="$7" numberOfLines={1}>{item.name}</Text><Text color="$inkSoft" fs="$1">{item.itemCount} tập</Text></YStack><AppIcon name={selected === item.id ? "check-circle" : "circle"} size={22} /></Button>)}
            {validation ? <Text color="$vermilion" accessibilityRole="alert">{validation}</Text> : null}
            {mutation.isError ? <Text color="$vermilion" accessibilityRole="alert">{axios.isAxiosError<{ message?: string }>(mutation.error) ? mutation.error.response?.data?.message ?? "Chưa thêm được tập. Kiểm tra kết nối rồi thử lại." : mutation.error instanceof Error ? mutation.error.message : "Chưa thêm được tập. Vui lòng thử lại."}</Text> : null}
            {saved ? <Text color="$bronzeDark" accessibilityRole="alert">Đã thêm tập vào playlist.</Text> : null}
          </YStack></ScrollView>
          <YStack px="$4" pb="$4" pt="$2"><PrimaryButton label={saved ? "Xong" : mutation.isPending ? "Đang thêm…" : "Thêm vào playlist"} disabled={mutation.isPending || (!saved && !selected)} onPress={() => { if (saved) onClose(); else if (selected) mutation.mutate({ type: "add", id: selected }); }} /></YStack>
        </YStack>
      </SafeAreaView>
    </YStack>
  </Modal>;
}
