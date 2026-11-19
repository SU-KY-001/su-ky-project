import { Button, Spinner, Text, XStack, YStack, getTokens } from "tamagui";
import { AppCard, AppIcon, ProgressBar } from "@/shared/ui";
import type { ListeningHistoryItem } from "../types";

interface ListeningHistoryRowProps {
  item: ListeningHistoryItem;
  onPress: () => void;
  disabled?: boolean;
  opening?: boolean;
  showDate?: boolean;
}

export function ListeningHistoryRow({ item, onPress, disabled = false, opening = false, showDate = false }: ListeningHistoryRowProps): React.JSX.Element {
  const colors = getTokens().color;
  const available = item.episode.available;
  return <AppCard>
    <Button unstyled w="100%" minH="$8" fd="row" items="center" g="$3" p="$2.5" disabled={disabled || !available} op={available ? 1 : 0.6} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${available ? "Nghe tiếp" : "Không còn khả dụng"} ${item.episode.title}`} accessibilityState={{ disabled: disabled || !available, busy: opening }} pressStyle={{ op: 0.75 }}>
      <YStack w="$5" h="$5" rounded="$4" bg="$paperDeep" items="center" justify="center" shrink={0}><AppIcon name="headphones" size={24} color={colors.bronzeDark.val} /></YStack>
      <YStack f={1} minW={0} g="$2">
        <Text ff="$body" fs="$2" lh="$2" fw="$7" color="$ink" numberOfLines={2}>{item.episode.title}</Text>
        <Text ff="$body" fs="$1" lh="$1" color="$inkSoft" numberOfLines={2}>{item.episode.series.title}</Text>
        <ProgressBar value={item.percent} />
        <XStack g="$2" items="center" wrap="wrap"><Text ff="$body" fs="$1" color="$bronzeDark">{item.isCompleted ? "Đã nghe" : "Đang nghe"} · {Math.round(item.percent)}%</Text>{showDate ? <Text ff="$body" fs="$1" color="$inkSoft">{item.lastListenedAt.toLocaleDateString("vi-VN")}</Text> : null}</XStack>
        {!available ? <Text ff="$body" fs="$1" color="$inkSoft">Tập hiện không khả dụng</Text> : null}
      </YStack>
      {opening ? <Spinner color="$vermilion" accessibilityLabel="Đang mở tập nghe" /> : <AppIcon name={available ? "play-circle" : "slash"} size={26} color={colors.vermilion.val} />}
    </Button>
  </AppCard>;
}
