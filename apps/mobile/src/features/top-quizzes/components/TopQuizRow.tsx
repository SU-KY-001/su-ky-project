import { Button, Spinner, Text, XStack, YStack, getTokens } from "tamagui";
import type { TopQuizItem } from "@repo/shared";
import { useQuery } from "@tanstack/react-query";
import { AppCard, AppIcon, AppImage } from "@/shared/ui";
import { podcastApi, fallbackEventImage } from "@/features/heritage-app/podcastApi";

export function TopQuizRow({ item, rank, onPress, opening = false, disabled = false }: { item: TopQuizItem; rank: number; onPress: () => void; opening?: boolean; disabled?: boolean }): React.JSX.Element {
  const colors = getTokens().color;
  const series = useQuery({ queryKey: ["podcast", "series", item.seriesSlug], queryFn: () => podcastApi.getSeries(item.seriesSlug), enabled: item.available, staleTime: 5 * 60_000 });
  const image = series.data?.episodes.find((episode) => episode.id === item.episodeId)?.image ?? series.data?.cover ?? fallbackEventImage(item.seriesSlug);
  return <AppCard><Button unstyled w="100%" minH="$7" fd="row" items="center" g="$2" p="$2" disabled={disabled || !item.available} op={item.available ? 1 : 0.6} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.attemptCount} lần làm${item.available ? "" : ", hiện không khả dụng"}`} pressStyle={{ op: 0.75 }}>
    <Text ff="$heading" fs="$4" fw="$7" color="$bronzeDark" minW="$2" text="center">{rank}</Text>
    <AppImage source={image} w={56} h={56} rounded={6} />
    <YStack f={1} minW={0} g="$1">
      <Text ff="$heading" fs="$2" lh="$2" fw="$7" color="$ink" numberOfLines={2}>{item.title}</Text>
      <Text ff="$body" fs="$1" lh="$1" color="$inkSoft" numberOfLines={2}>{item.episodeTitle} · {item.seriesTitle}</Text>
      <XStack g="$2" wrap="wrap"><Text ff="$body" fs="$2" fw="$6" color="$vermilion">{item.attemptCount} lần làm</Text><Text ff="$body" fs="$1" color="$inkSoft">Gần nhất {item.lastSubmittedAt.toLocaleDateString("vi-VN")}</Text></XStack>
      {!item.available ? <Text ff="$body" fs="$1" color="$inkSoft">Quiz hiện không khả dụng trên ứng dụng</Text> : null}
    </YStack>
    {opening ? <Spinner color="$vermilion" accessibilityLabel="Đang mở quiz" /> : <AppIcon name={item.available ? "chevron-right" : "lock"} size={22} color={colors.vermilion.val} />}
  </Button></AppCard>;
}
