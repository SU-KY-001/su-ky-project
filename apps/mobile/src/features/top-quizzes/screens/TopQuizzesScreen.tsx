import { useEffect } from "react";
import { BackHandler } from "react-native";
import { ScrollView, Spinner, Text, XStack, YStack } from "tamagui";
import type { TopQuizItem } from "@repo/shared";
import { AppCard, AppHeader, PrimaryButton } from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { useTopQuizzes } from "../hooks/useTopQuizzes";
import { TopQuizRow } from "../components/TopQuizRow";

export function TopQuizzesScreen({ page, onPage, onBack, onLogin, onExplore, onOpen, openingId, openError }: { page: number; onPage: (page: number) => void; onBack: () => void; onLogin: () => void; onExplore: () => void; onOpen: (item: TopQuizItem) => void; openingId: string | null; openError: string | null }): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const query = useTopQuizzes(page, 5);
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 5));
  useEffect(() => { const subscription = BackHandler.addEventListener("hardwareBackPress", () => { onBack(); return true; }); return () => subscription.remove(); }, [onBack]);
  return <YStack f={1} bg="$paper">
    <AppHeader title="Quiz làm nhiều nhất" onBack={onBack} />
    <ScrollView key={page} f={1} showsVerticalScrollIndicator={false}><YStack px="$4" py="$3" pb="$5" g="$3">
      <Text ff="$body" fs="$2" lh="$3" color="$inkSoft">Số lần nộp bài từ trước đến nay, gồm cả đạt và chưa đạt.</Text>
      {openError ? <Text accessibilityRole="alert" ff="$body" fs="$2" color="$vermilion">{openError}</Text> : null}
      {!user ? <PrimaryButton label="Đăng nhập để xem" onPress={onLogin} /> : query.isPending ? <YStack py="$6" items="center" g="$3"><Spinner color="$vermilion" /><Text ff="$body" fs="$2" color="$inkSoft">Đang tải top quiz…</Text></YStack> : query.isError ? <AppCard><YStack p="$4" g="$3"><Text accessibilityRole="alert" ff="$body" fs="$2" lh="$3" color="$inkSoft">Chưa tải được top quiz. Vui lòng thử lại.</Text><PrimaryButton secondary label="Thử lại" onPress={() => void query.refetch()} /></YStack></AppCard> : !query.data.items.length ? <AppCard><YStack p="$4" g="$3"><Text ff="$body" fs="$2" lh="$3" color="$inkSoft">{page > 1 ? "Trang này không còn quiz. Quay lại trang đầu để cập nhật." : "Bạn chưa làm quiz nào. Hãy bắt đầu ôn tập nhé."}</Text><PrimaryButton label={page > 1 ? "Về trang đầu" : "Khám phá quiz"} onPress={page > 1 ? () => onPage(1) : onExplore} /></YStack></AppCard> : query.data.items.map((item, index) => <TopQuizRow key={item.quizId} item={item} rank={(page - 1) * 5 + index + 1} onPress={() => onOpen(item)} opening={openingId === item.quizId} disabled={openingId !== null} />)}
    </YStack></ScrollView>
    {user && query.data && !query.isError ? <YStack bg="$paperSoft" px="$4" py="$3" g="$2" borderTopWidth="$0.25" bc="$line"><Text ff="$body" fs="$1" color="$inkSoft" text="center">Trang {page} / {pages} · {query.data.total} quiz</Text><XStack g="$3"><YStack f={1}><PrimaryButton secondary label="Trang trước" icon="chevron-left" disabled={page <= 1 || query.isFetching} onPress={() => onPage(page - 1)} /></YStack><YStack f={1}><PrimaryButton secondary label="Trang sau" icon="chevron-right" disabled={page >= pages || query.isFetching} onPress={() => onPage(page + 1)} /></YStack></XStack></YStack> : null}
  </YStack>;
}
