import { useQueryClient } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { Button, ScrollView, Spinner, Text, XStack, YStack, getTokens } from "tamagui";
import { AppIcon, AppImage, PrimaryButton, SectionHeader } from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import background from "../../../assets/brand/profile-header-v2.png";
import { ListeningHistoryRow, useListeningHistory, type ListeningHistoryItem } from "@/features/listening-history";
import { useTopQuizzes, TopQuizRow, type TopQuizItem } from "@/features/top-quizzes";

interface ProfileScreenProps {
  onLogin: () => void;
  onEditProfile: () => void;
  onPlayHistoryItem: (item: ListeningHistoryItem) => void;
  onViewListeningHistory: () => void;
  openingEpisodeId: string | null;
  historyOpenError: string | null;
  onViewTopQuizzes: () => void;
  onOpenQuiz: (item: TopQuizItem) => void;
  onExploreQuizzes: () => void;
  openingQuizId: string | null;
  quizOpenError: string | null;
}

export function ProfileScreen({ onLogin, onEditProfile, onPlayHistoryItem, onViewListeningHistory, openingEpisodeId, historyOpenError, onViewTopQuizzes, onOpenQuiz, onExploreQuizzes, openingQuizId, quizOpenError }: ProfileScreenProps): React.JSX.Element {
  const { user, signOut } = useAuthStore();
  const tokens = getTokens();
  const queryClient = useQueryClient();
  const history = useListeningHistory({ page: 1, limit: 4, status: "all" });
  const topQuizzes = useTopQuizzes(1, 4);
  const handleSignOut = async (): Promise<void> => {
    await signOut();
    await queryClient.cancelQueries({ queryKey: ["me", "listening-history"] });
    queryClient.removeQueries({ queryKey: ["me", "listening-history"] });
    await queryClient.cancelQueries({ queryKey: ["me", "top-quizzes"] });
    queryClient.removeQueries({ queryKey: ["me", "top-quizzes"] });
  };
  const initials = user?.name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "SK";

  return (
    <ScrollView f={1} bg="$paper" showsVerticalScrollIndicator={false}>
      <YStack pb="$5">
        <YStack pos="relative" px="$4" pb="$4" overflow="hidden" bg="$paperDeep">
          <YStack pos="absolute" t={0} b={0} l={0} r={0} pointerEvents="none">
            <AppImage source={background} w="100%" h="100%" rounded={0} resizeMode="stretch" op={0.7} />
          </YStack>
          <XStack minH="$5" items="center" justify="space-between">
            <Text ff="$body" fs="$1" fw="$7" ls="$1" color="$inkSoft">HỒ SƠ CÁ NHÂN</Text>
          </XStack>
          <Button unstyled w="100%" fd="row" items="center" g="$3" minH="$8" onPress={user ? onEditProfile : onLogin} accessibilityRole="button" accessibilityLabel={user ? "Chỉnh sửa hồ sơ cá nhân" : "Đăng nhập"} pressStyle={{ op: 0.75 }}>
            <YStack w="$8" h="$8" rounded="$12" overflow="hidden" bg="$paperDeep" bw="$0.5" bc="$bronze" items="center" justify="center" shrink={0}>
              {user?.image ? <AppImage source={{ uri: user.image }} w={tokens.size["$8"].val} h={tokens.size["$8"].val} rounded={tokens.radius["12"].val} /> : <Text ff="$heading" fs="$5" fw="$7" color="$vermilionDark">{initials}</Text>}
            </YStack>
            <YStack f={1} minW={0} g="$1.5">
              <Text ff="$heading" fs="$4" lh="$4" fw="$7" color="$ink" numberOfLines={2}>{user?.name || "Người nghe Sử Ký"}</Text>
              <Text ff="$body" fs="$1" color="$inkSoft" numberOfLines={1}>{user?.email || "Bắt đầu hành trình của bạn"}</Text>
              <XStack items="center" g="$1.5"><AppIcon name="book-open" size={14} color={tokens.color.vermilion.val} /><Text ff="$body" fs="$1" color="$inkSoft">Người kể chuyện thời gian</Text></XStack>
            </YStack>
            {user ? <YStack w="$4" h="$4" items="center" justify="center"><MaterialIcons name="chevron-right" size={32} color={tokens.color.ink.val} /></YStack> : null}
          </Button>
          {!user ? <YStack mt="$4"><PrimaryButton label="Đăng nhập để lưu hành trình" onPress={onLogin} /></YStack> : null}
        </YStack>

        <YStack px="$4" pt="$4" g="$5">
          <YStack g="$2.5">
            <SectionHeader title="Nghe gần đây" onPress={user ? onViewListeningHistory : onLogin} />
            <Text ff="$body" fs="$1" color="$inkSoft">Hành trình đã nghe</Text>
            {historyOpenError ? <Text accessibilityRole="alert" ff="$body" fs="$2" lh="$3" color="$vermilion">{historyOpenError}</Text> : null}
            {!user ? <Text ff="$body" fs="$2" lh="$3" color="$inkSoft" py="$3">Các tập bạn đã nghe sẽ xuất hiện tại đây.</Text> : history.isPending ? <XStack g="$2" items="center" py="$3"><Spinner color="$vermilion" /><Text ff="$body" fs="$2" color="$inkSoft">Đang tải lịch sử nghe…</Text></XStack> : history.isError ? (
              <Button unstyled minH="$4" onPress={() => void history.refetch()} accessibilityRole="button"><Text ff="$body" fs="$2" color="$vermilion">Chưa tải được lịch sử nghe. Thử lại</Text></Button>
            ) : !history.data?.items.length ? <Text ff="$body" fs="$2" lh="$3" color="$inkSoft" py="$3">Bạn chưa nghe tập nào. Hãy bắt đầu khám phá nhé.</Text> : history.data.items.slice(0, 4).map((item) => (
              <ListeningHistoryRow key={item.episode.id} item={item} disabled={openingEpisodeId !== null} opening={openingEpisodeId === item.episode.id} onPress={() => onPlayHistoryItem(item)} />
            ))}
          </YStack>

          <YStack g="$3">
            <SectionHeader title="Quiz làm nhiều nhất" onPress={user ? onViewTopQuizzes : onLogin} />
            <Text ff="$body" fs="$1" color="$inkSoft">Tất cả lần ôn tập của bạn</Text>
            {quizOpenError ? <Text accessibilityRole="alert" ff="$body" fs="$2" color="$vermilion">{quizOpenError}</Text> : null}
            {!user ? <Text ff="$body" fs="$2" lh="$3" color="$inkSoft">Đăng nhập để xem những quiz bạn đã làm.</Text> : topQuizzes.isPending ? <XStack g="$2" items="center"><Spinner color="$vermilion" /><Text ff="$body" fs="$2" color="$inkSoft">Đang tải top quiz…</Text></XStack> : topQuizzes.isError ? <YStack g="$2"><Text ff="$body" fs="$2" color="$inkSoft">Chưa tải được top quiz.</Text><PrimaryButton secondary label="Thử lại" onPress={() => void topQuizzes.refetch()} /></YStack> : !topQuizzes.data.items.length ? <YStack g="$3"><Text ff="$body" fs="$2" lh="$3" color="$inkSoft">Bạn chưa làm quiz nào. Hãy khám phá thư viện quiz.</Text><PrimaryButton secondary label="Khám phá quiz" onPress={onExploreQuizzes} /></YStack> : topQuizzes.data.items.slice(0, 4).map((item, index) => <TopQuizRow key={item.quizId} item={item} rank={index + 1} onPress={() => onOpenQuiz(item)} opening={openingQuizId === item.quizId} disabled={openingQuizId !== null} />)}
          </YStack>
          {user ? <Button unstyled minH="$4" fd="row" items="center" justify="center" g="$2" onPress={() => void handleSignOut()} accessibilityRole="button" pressStyle={{ op: 0.75 }}><AppIcon name="log-out" size={17} color={tokens.color.vermilion.val} /><Text ff="$body" fs="$2" fw="$7" color="$vermilion">Đăng xuất</Text></Button> : null}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
