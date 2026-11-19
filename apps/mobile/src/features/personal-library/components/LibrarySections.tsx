import { Button, Spinner, Text, XStack, YStack, getTokens } from "tamagui";
import { AppCard, AppIcon, PrimaryButton, SectionHeader } from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { useRanking, usePlaylists } from "../hooks/useLibrary";

export function RankingSection({ scope, period, page = 1, limit = 4, onAll, onPlay, onLogin, onPage }: { scope: "personal" | "system"; period: "week" | "month"; page?: number; limit?: number; onAll?: () => void; onPlay: (slug: string) => void; onLogin: () => void; onPage?: (page: number) => void }): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const query = useRanking({ scope, period, page, limit });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / limit));
  return <YStack g="$3">
    <SectionHeader title={scope === "personal" ? "Bạn nghe nhiều nhất" : "Podcast nổi bật"} onPress={onAll ? user ? onAll : onLogin : undefined} />
    <Text ff="$body" fs="$1" color="$inkSoft">{period === "week" ? "Tuần này" : "Tháng này"} · {scope === "personal" ? "Lượt nghe của bạn" : "Lượt nghe toàn hệ thống"}</Text>
    {!user ? <PrimaryButton secondary label="Đăng nhập để xem" onPress={onLogin} /> : query.isPending ? <Spinner color="$vermilion" accessibilityLabel="Đang tải ranking" /> : query.isError ? <YStack g="$2"><Text ff="$body" fs="$2" color="$inkSoft">Chưa tải được bảng podcast.</Text><PrimaryButton secondary label="Thử lại" onPress={() => void query.refetch()} /></YStack> : !query.data.items.length ? <AppCard><YStack p="$4"><Text ff="$body" fs="$2" lh="$3" color="$inkSoft">Chưa có lượt nghe đủ điều kiện trong kỳ này.</Text></YStack></AppCard> : query.data.items.map((item) => <AppCard key={item.episodeId}><Button unstyled minH="$7" fd="row" items="center" g="$3" p="$3" onPress={() => onPlay(item.episodeSlug)} accessibilityRole="button" accessibilityLabel={`Nghe ${item.title}`}><Text ff="$heading" fs="$4" fw="$7" color="$bronzeDark">{item.rank}</Text><YStack f={1} minW={0} g="$2"><Text ff="$heading" fs="$2" fw="$7" color="$ink" numberOfLines={2}>{item.title}</Text><Text ff="$body" fs="$1" color="$inkSoft" numberOfLines={2}>{item.seriesTitle}</Text><Text ff="$body" fs="$2" fw="$6" color="$vermilion">{item.listenCount} lượt nghe</Text></YStack><AppIcon name="play-circle" color={getTokens().color.vermilion.val} /></Button></AppCard>)}
    {onPage && query.data && !query.isError ? <LibraryPages page={page} pages={pages} pending={query.isFetching} onPage={onPage} /> : null}
  </YStack>;
}
export function LibraryPages({ page, pages, pending = false, onPage }: { page: number; pages: number; pending?: boolean; onPage: (page: number) => void }): React.JSX.Element {
  return <YStack g="$2" py="$3"><Text ff="$body" fs="$1" text="center" color="$inkSoft">Trang {page} / {pages}</Text><XStack g="$3"><YStack f={1}><PrimaryButton secondary label="Trang trước" icon="chevron-left" disabled={pending || page <= 1} onPress={() => onPage(page - 1)} /></YStack><YStack f={1}><PrimaryButton secondary label="Trang sau" icon="chevron-right" disabled={pending || page >= pages} onPress={() => onPage(page + 1)} /></YStack></XStack></YStack>;
}
export function PlaylistPreview({ onAll, onOpen, onLogin }: { onAll: () => void; onOpen: (id: string) => void; onLogin: () => void }): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const query = usePlaylists();
  return <YStack g="$3"><SectionHeader title="Playlist của bạn" onPress={user ? onAll : onLogin} />
    {!user ? <PrimaryButton secondary label="Đăng nhập để tạo playlist" onPress={onLogin} /> : query.isPending ? <Spinner color="$vermilion" /> : query.isError ? <YStack g="$2"><Text ff="$body" fs="$2" color="$inkSoft">Chưa tải được playlist.</Text><PrimaryButton secondary label="Thử lại" onPress={() => void query.refetch()} /></YStack> : !query.data.items.length ? <PrimaryButton secondary label="Tạo playlist đầu tiên" onPress={onAll} /> : query.data.items.slice(0, 4).map((playlist) => <AppCard key={playlist.id}><Button unstyled minH="$6" fd="row" items="center" g="$3" p="$3" onPress={() => onOpen(playlist.id)} accessibilityRole="button"><AppIcon name="list" color={getTokens().color.bronzeDark.val} /><YStack f={1}><Text ff="$heading" fs="$2" fw="$6" color="$ink">{playlist.name}</Text><Text ff="$body" fs="$1" color="$inkSoft">{playlist.itemCount} tập</Text></YStack><AppIcon name="chevron-right" /></Button></AppCard>)}
  </YStack>;
}
