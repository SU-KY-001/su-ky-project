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

  const fallbackMilestones: PublicHistoricalEventDto[] = [
    {
      id: "dong-son",
      slug: "landing-demo-van-hoa-dong-son",
      name: "Văn hóa Đông Sơn",
      summary: "Khám phá đời sống cư dân Việt cổ qua đồ đồng và hoa văn, với các di tích tập trung ở lưu vực sông Hồng, sông Mã và sông Cả.",
      time: { kind: "RANGE", start: { year: -500, precision: "YEAR", approximate: true }, end: { year: -111, precision: "YEAR", approximate: true }, endState: "KNOWN" },
      timeLabel: "500 TCN – 111 TCN",
      parent: { period: { id: "p1", name: "Tiền sử & Sơ sử" }, phase: { id: "ph1", name: "Văn hóa Đông Sơn" } },
      reviewedAt: new Date(),
      citations: [],
    },
    {
      id: "938-bd",
      slug: "landing-demo-chien-thang-bach-dang-938",
      name: "Chiến thắng Bạch Đằng năm 938",
      summary: "Theo dấu kế sách của Ngô Quyền: phối hợp bãi cọc, thủy triều và thế trận trên sông để đánh bại quân Nam Hán năm 938.",
      time: { kind: "POINT", at: { year: 938, precision: "YEAR", approximate: false } },
      timeLabel: "938",
      parent: { period: { id: "p2", name: "Bắc thuộc" }, phase: { id: "ph2", name: "Bước ngoặt giành độc lập" } },
      reviewedAt: new Date(),
      citations: [],
    },
    {
      id: "1258-mong-nguyen",
      slug: "landing-demo-khang-chien-mong-nguyen",
      name: "Ba cuộc kháng chiến chống Mông - Nguyên",
      summary: "Nhìn lại các cuộc kháng chiến năm 1258, 1285 và 1288, từ những chiến thắng trên bộ đến trận quyết chiến Bạch Đằng.",
      time: { kind: "RANGE", start: { year: 1258, precision: "YEAR", approximate: false }, end: { year: 1288, precision: "YEAR", approximate: false }, endState: "KNOWN" },
      timeLabel: "1258 – 1288",
      parent: { period: { id: "p3", name: "Quân chủ" }, phase: { id: "ph3", name: "Đại Việt thời Trần" } },
      reviewedAt: new Date(),
      citations: [],
    },
    {
      id: "1418-lam-son",
      slug: "landing-demo-khoi-nghia-lam-son",
      name: "Khởi nghĩa Lam Sơn",
      summary: "Từ cuộc khởi nghĩa năm 1418 đến thắng lợi năm 1427, tìm hiểu vai trò của Lê Lợi, Nguyễn Trãi và sự kết hợp quân sự với ngoại giao.",
      time: { kind: "RANGE", start: { year: 1418, precision: "YEAR", approximate: false }, end: { year: 1427, precision: "YEAR", approximate: false }, endState: "KNOWN" },
      timeLabel: "1418 – 1427",
      parent: { period: { id: "p3", name: "Quân chủ" }, phase: { id: "ph4", name: "Kháng Minh và khởi nghĩa Lam Sơn" } },
      reviewedAt: new Date(),
      citations: [],
    },
    {
      id: "1945-cm8",
      slug: "landing-demo-cach-mang-thang-tam-doc-lap",
      name: "Cách mạng tháng Tám năm 1945",
      summary: "Khám phá cuộc tổng khởi nghĩa tháng Tám năm 1945 qua dấu mốc giành chính quyền ở Hà Nội và không khí đấu tranh giành độc lập.",
      time: { kind: "POINT", at: { year: 1945, precision: "YEAR", approximate: false } },
      timeLabel: "1945",
      parent: { period: { id: "p5", name: "Hiện đại" }, phase: { id: "ph5", name: "Cách mạng tháng Tám và giành độc lập" } },
      reviewedAt: new Date(),
      citations: [],
    },
    {
      id: "1986-doi-moi",
      slug: "landing-demo-dai-hoi-dang-toan-quoc-lan-thu-vi-doi-moi",
      name: "Đại hội VI khởi xướng công cuộc Đổi mới",
      summary: "Đại hội VI diễn ra tại Hà Nội từ ngày 15 đến 18 tháng 12 năm 1986, mở đầu đường lối Đổi mới trong bối cảnh đất nước cần những thay đổi sâu rộng.",
      time: { kind: "POINT", at: { year: 1986, precision: "YEAR", approximate: false } },
      timeLabel: "1986",
      parent: { period: { id: "p5", name: "Hiện đại" }, phase: { id: "ph6", name: "Khởi đầu công cuộc Đổi mới" } },
      reviewedAt: new Date(),
      citations: [],
    },
  ];

  const displayedEvents = eventsQuery.isError && events.length === 0 ? fallbackMilestones : events;

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
      ) : displayedEvents.length === 0 ? (
        <YStack py="$8" items="center" g="$1">
          <Text color="$ink" fs="$2" fw="$6">Chưa có sự kiện trong thời kỳ này</Text>
          <Text color="$inkSoft" fs="$1" text="center">Vui lòng chọn thời kỳ khác hoặc chọn "Tất cả" để xem toàn bộ dòng chảy lịch sử.</Text>
        </YStack>
      ) : (
        <YStack mt="$1">
          {displayedEvents.map((item: PublicHistoricalEventDto, index: number) => {
            const first = index === 0;
            const last = index === displayedEvents.length - 1;
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
  event: PublicHistoricalEventDto | null;
  onBack: () => void;
  onPodcast: () => void;
}): React.JSX.Element {
  const heroImage = event ? fallbackEventImage(event.slug, true) : fallbackEventImage("bach-dang", true);
  const title = event?.name ?? "Chiến thắng Bạch Đằng năm 938";
  const timeLabel = event?.timeLabel ?? "Năm 938";
  const parentLabel = event
    ? `${event.parent.period.name} / ${event.parent.phase.name}`
    : "Thời Bắc thuộc / Nhà Ngô";
  const summary =
    event?.summary ??
    "Ngô Quyền đã chỉ huy quân dân ta đánh tan quân Nam Hán trên sông Bạch Đằng, chấm dứt hơn một nghìn năm Bắc thuộc, mở ra thời kỳ độc lập, tự chủ lâu dài của dân tộc Việt Nam.";
  const citations = event?.citations ?? [];

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
