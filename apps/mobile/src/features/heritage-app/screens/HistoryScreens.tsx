import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, ScrollView, Separator, Text, XStack, YStack, ZStack } from "tamagui";
import { AppCard, AppHeader, AppIcon, AppImage, Chip, PrimaryButton, ScreenScroll } from "@/shared/ui";
import { fallbackEventImage, podcastApi, type HistoricalPeriodDto, type PublicHistoricalEventDto } from "../podcastApi";

export function HistoryScreen({
  onEvent,
  initialPeriodId,
}: {
  onEvent: (event: PublicHistoricalEventDto) => void;
  initialPeriodId?: string;
}): React.JSX.Element {
  const periodsQuery = useQuery({
    queryKey: ["history", "periods"],
    queryFn: () => podcastApi.periods(),
  });

  const periods = periodsQuery.data ?? [];
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>(initialPeriodId);

  const eventsQuery = useQuery({
    queryKey: ["history", "events", selectedPeriodId],
    queryFn: () => podcastApi.events(selectedPeriodId ? { periodId: selectedPeriodId } : undefined),
  });

  const events = eventsQuery.data ?? [];

  return (
    <ScreenScroll>
      <AppHeader rightIcon="search" onRight={() => undefined} />
      <YStack g="$1">
        <Text color="$ink" fs="$5" lh="$5" fw="$7">Dòng chảy lịch sử</Text>
        <Text color="$inkSoft" fs="$1" lh="$2">Khám phá những dấu mốc làm nên dân tộc Việt Nam qua các thời kỳ.</Text>
      </YStack>

      {periodsQuery.isPending ? (
        <YStack py="$2" items="center"><Text color="$inkSoft" fs="$1">Đang tải các thời kỳ lịch sử…</Text></YStack>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack g="$1.5">
            <Chip
              label="Tất cả"
              selected={selectedPeriodId === undefined}
              onPress={() => setSelectedPeriodId(undefined)}
            />
            {periods.map((item: HistoricalPeriodDto) => (
              <Chip
                key={item.id}
                label={item.name}
                selected={selectedPeriodId === item.id}
                onPress={() => setSelectedPeriodId(item.id)}
              />
            ))}
          </XStack>
        </ScrollView>
      )}

      {eventsQuery.isPending ? (
        <YStack py="$6" items="center"><Text color="$inkSoft" fs="$1">Đang tải các sự kiện…</Text></YStack>
      ) : eventsQuery.isError ? (
        <YStack py="$6" items="center" g="$2">
          <Text color="$ink" fs="$2" fw="$6">Không thể tải dòng thời gian</Text>
          <Text color="$inkSoft" fs="$1" text="center">Vui lòng kiểm tra kết nối rồi thử lại.</Text>
          <PrimaryButton label="Thử lại" secondary onPress={() => void eventsQuery.refetch()} />
        </YStack>
      ) : events.length === 0 ? (
        <YStack py="$8" items="center" g="$1">
          <Text color="$ink" fs="$2" fw="$6">Chưa có sự kiện trong thời kỳ này</Text>
          <Text color="$inkSoft" fs="$1" text="center">Vui lòng chọn thời kỳ khác hoặc chọn "Tất cả" để xem toàn bộ dòng chảy lịch sử.</Text>
        </YStack>
      ) : (
        <YStack mt="$1">
          {events.map((item: PublicHistoricalEventDto, index: number) => {
            const first = index === 0;
            const last = index === events.length - 1;
            const image = fallbackEventImage(item.slug);
            const cleanTimeLabel = item.timeLabel.replace(/Khoảng /g, "");

            return (
              <XStack key={item.id} g="$2">
                <YStack w={60} items="center">
                  <YStack
                    pos="absolute"
                    l={29}
                    w={2}
                    t={first ? 14 : 0}
                    b={last ? undefined : 0}
                    h={last ? 14 : undefined}
                    bg="$line"
                  />
                  <YStack
                    w={14}
                    h={14}
                    mt="$1.5"
                    rounded={7}
                    bg={first ? "$vermilion" : "$paper"}
                    bw={2}
                    bc={first ? "$vermilion" : "$bronze"}
                  />
                  <Text color={first ? "$vermilion" : "$ink"} fs={10} fw="$7" mt="$1" text="center">
                    {cleanTimeLabel}
                  </Text>
                </YStack>
                <YStack f={1} pb="$3">
                  <AppCard onPress={() => onEvent(item)}>
                    <AppImage source={image} w="100%" h={120} resizeMode="cover" rounded={0} />
                    <YStack p="$2.5" g="$1">
                      <XStack items="center" justify="space-between" g="$2">
                        <Text f={1} color="$ink" fs="$2" fw="$7" numberOfLines={2}>{item.name}</Text>
                        <AppIcon name="chevron-right" size={17} color="#B8322A" />
                      </XStack>
                      <Text color="$inkSoft" fs="$1" lh="$2" numberOfLines={2}>{item.summary}</Text>
                    </YStack>
                  </AppCard>
                </YStack>
              </XStack>
            );
          })}
        </YStack>
      )}
    </ScreenScroll>
  );
}

export function EventDetailScreen({
  event,
  onBack,
  onPodcast,
}: {
  event: PublicHistoricalEventDto;
  onBack: () => void;
  onPodcast: () => void;
}): React.JSX.Element {
  const heroImage = fallbackEventImage(event.slug, true);
  const title = event.name;
  const timeLabel = event.timeLabel;
  const parentLabel = `${event.parent.period.name} / ${event.parent.phase.name}`;
  const summary = event.summary;
  const citations = event.citations;

  return (
    <ScrollView f={1} showsVerticalScrollIndicator={false} bg="$paper">
      <ZStack h="$18">
        <AppImage source={heroImage} w="100%" h="100%" resizeMode="cover" rounded={0} />
        <XStack pos="absolute" t="$2" l="$2" r="$2" justify="space-between">
          <AppHeader onBack={onBack} />
          <AppHeader rightIcon="share-2" onRight={() => undefined} />
        </XStack>
      </ZStack>
      <YStack px="$3" py="$3" g="$2.5">
        <Text color="$inkSoft" fs="$1">{parentLabel}</Text>
        <Text color="$vermilion" fs="$2" fw="$6">{timeLabel}</Text>
        <Text color="$ink" fs="$5" lh={28} fw="$7">{title}</Text>
        <Text color="$inkSoft" fs="$1" lh={22}>{summary}</Text>

        {citations.length > 0 ? (
          <>
            <XStack items="center" justify="space-between" mt="$1">
              <XStack items="center" g="$1.5">
                <AppIcon name="book-open" />
                <Text color="$ink" fs="$3" fw="$7">Nguồn tư liệu lịch sử</Text>
              </XStack>
            </XStack>
            {citations.map((cite, index) => (
              <YStack key={index}>
                <XStack py="$2" items="center" g="$2">
                  <YStack w="$4" h="$4" rounded="$3" bg="$paperDeep" items="center" justify="center">
                    <AppIcon name="file-text" />
                  </YStack>
                  <YStack f={1} minW={0}>
                    <Text color="$ink" fs="$1" fw="$7" numberOfLines={1}>{cite.source.title}</Text>
                    <Text color="$inkSoft" fs={10} numberOfLines={1}>
                      {cite.source.author ?? "Tài liệu lịch sử"} · {cite.locator || "Chính sử"}
                    </Text>
                  </YStack>
                </XStack>
                <Separator bc="$line" />
              </YStack>
            ))}
          </>
        ) : null}

        <PrimaryButton label="Khám phá podcast liên quan" icon="headphones" onPress={onPodcast} />
      </YStack>
    </ScrollView>
  );
}
