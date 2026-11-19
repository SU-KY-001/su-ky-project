import { useEffect } from "react";
import { BackHandler } from "react-native";
import { ScrollView, Spinner, Text, XStack, YStack } from "tamagui";
import { AppCard, AppHeader, Chip, PrimaryButton } from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { ListeningHistoryRow } from "../components/ListeningHistoryRow";
import { useListeningHistory } from "../hooks/useListeningHistory";
import type { ListeningHistoryItem, ListeningHistoryStatus } from "../types";

interface ListeningHistoryScreenProps {
  page: number;
  status: ListeningHistoryStatus;
  onPageChange: (page: number) => void;
  onStatusChange: (status: ListeningHistoryStatus) => void;
  onBack: () => void;
  onLogin: () => void;
  onExplore: () => void;
  onPlay: (item: ListeningHistoryItem) => void;
  openingEpisodeId: string | null;
  openError: string | null;
}

const PAGE_SIZE = 5;

export function ListeningHistoryScreen({ page, status, onPageChange, onStatusChange, onBack, onLogin, onExplore, onPlay, openingEpisodeId, openError }: ListeningHistoryScreenProps): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const query = useListeningHistory({ page, limit: PAGE_SIZE, status });
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { onBack(); return true; });
    return () => subscription.remove();
  }, [onBack]);

  return <YStack f={1} bg="$paper">
    <AppHeader title="Lịch sử nghe" onBack={onBack} />
    {!user ? <YStack px="$4" pt="$4"><AppCard><YStack p="$4" g="$4"><Text ff="$body" fs="$2" lh="$3" color="$inkSoft">Đăng nhập để xem lịch sử và tiếp tục hành trình của bạn.</Text><PrimaryButton label="Đăng nhập" onPress={onLogin} /></YStack></AppCard></YStack> : <>
      <YStack px="$4" py="$3" g="$3">
        <Text ff="$body" fs="$2" color="$inkSoft">{query.data ? `${query.data.total} tập trong lịch sử` : "Hành trình đã nghe của bạn"}</Text>
        <XStack g="$2" wrap="wrap">
          <Chip label="Tất cả" selected={status === "all"} onPress={() => onStatusChange("all")} />
          <Chip label="Đang nghe" selected={status === "in_progress"} onPress={() => onStatusChange("in_progress")} />
          <Chip label="Đã nghe" selected={status === "completed"} onPress={() => onStatusChange("completed")} />
        </XStack>
      </YStack>
      <ScrollView key={`${page}-${status}`} f={1} showsVerticalScrollIndicator={false}>
        <YStack px="$4" pb="$5" g="$3">
          {openError ? <Text accessibilityRole="alert" ff="$body" fs="$2" lh="$3" color="$vermilion">{openError}</Text> : null}
          {query.isPending ? <YStack py="$6" items="center" g="$3"><Spinner color="$vermilion" /><Text ff="$body" fs="$2" color="$inkSoft">Đang tải lịch sử nghe…</Text></YStack> : query.isError ? <AppCard><YStack p="$4" g="$3"><Text accessibilityRole="alert" ff="$body" fs="$2" lh="$3" color="$inkSoft">Chưa tải được lịch sử nghe. Kiểm tra kết nối rồi thử lại.</Text><PrimaryButton secondary label="Thử lại" onPress={() => void query.refetch()} /></YStack></AppCard> : !query.data.items.length ? <AppCard><YStack p="$4" g="$4">
            <Text ff="$body" fs="$2" lh="$3" color="$inkSoft">{page > 1 ? "Trang này không còn tập nào. Hãy quay lại trang đầu." : status === "all" ? "Bạn chưa nghe tập nào. Hãy khám phá thư viện podcast." : status === "completed" ? "Bạn chưa hoàn thành tập nào." : "Không có tập nào đang nghe dở."}</Text>
            {page > 1 ? <PrimaryButton secondary label="Về trang đầu" onPress={() => onPageChange(1)} /> : status === "all" ? <PrimaryButton label="Khám phá podcast" onPress={onExplore} /> : null}
          </YStack></AppCard> : query.data.items.map((item) => <ListeningHistoryRow key={item.episode.id} item={item} showDate disabled={openingEpisodeId !== null} opening={openingEpisodeId === item.episode.id} onPress={() => onPlay(item)} />)}
        </YStack>
      </ScrollView>
      {query.data && !query.isError && !query.isPending ? <YStack px="$4" py="$3" g="$2" bg="$paperSoft" borderTopWidth="$0.25" bc="$line">
        <Text ff="$body" fs="$1" color="$inkSoft" text="center">Trang {page} / {totalPages}</Text>
        <XStack g="$3"><YStack f={1}><PrimaryButton secondary icon="chevron-left" label="Trang trước" disabled={page <= 1 || query.isFetching} onPress={() => onPageChange(page - 1)} /></YStack><YStack f={1}><PrimaryButton secondary icon="chevron-right" label="Trang sau" disabled={page >= totalPages || query.isFetching} onPress={() => onPageChange(page + 1)} /></YStack></XStack>
      </YStack> : null}
    </>}
  </YStack>;
}
