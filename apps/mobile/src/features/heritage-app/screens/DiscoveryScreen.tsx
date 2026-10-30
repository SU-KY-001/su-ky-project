import { useQuery } from "@tanstack/react-query";
import { Button, Text, XStack, YStack, ZStack } from "tamagui";
import {
  AppCard,
  AppIcon,
  AppImage,
  BrandMark,
  IconButton,
  PrimaryButton,
  ProgressBar,
  ScreenScroll,
  SearchBar,
  SectionHeader,
  formatTime,
} from "@/shared/ui";
import { art } from "../data";
import { podcastApi, type HistoricalPeriodDto, type PodcastEpisode } from "../podcastApi";
import type { LivePlaybackState } from "../usePlayback";

interface DiscoveryScreenProps {
  currentEpisode: PodcastEpisode | null;
  playback: LivePlaybackState;
  onHistory: (periodId?: string) => void;
  onPodcast: () => void;
  onPlayer: () => void;
  onSchedule: () => void;
}

export function DiscoveryScreen({
  currentEpisode,
  playback,
  onHistory,
  onPodcast,
  onPlayer,
  onSchedule,
}: DiscoveryScreenProps): React.JSX.Element {
  const periodsQuery = useQuery({
    queryKey: ["history", "periods"],
    queryFn: () => podcastApi.periods(),
  });

  const periods = periodsQuery.data ?? [];

  const topics = [
    { title: "Thời Hùng Vương", subtitle: "Cội nguồn dân tộc", image: art.haiBaTrungCard },
    { title: "Các cuộc kháng chiến", subtitle: "Giữ nước, dựng nước", image: art.dienBienPhuCard },
    { title: "Việt Nam hiện đại", subtitle: "Đất nước chuyển mình", image: art.doiMoiCard },
  ];

  const ratio = playback.duration > 0 ? (playback.position / playback.duration) * 100 : 0;

  return (
    <ScreenScroll>
      <XStack pt="$1" items="center" g="$2">
        <BrandMark />
        <YStack f={1}><SearchBar /></YStack>
        <IconButton icon="user" label="Tài khoản" onPress={onSchedule} light />
      </XStack>

      <AppCard dark onPress={onHistory}>
        <ZStack h="$16">
          <AppImage source={art.bachDangHero} w="100%" h="100%" resizeMode="cover" op={0.68} rounded={0} />
          <YStack pos="absolute" l="$3" r="$3" b="$3" g="$1.5">
            <Text color="$paperSoft" fs="$5" lh="$5" fw="$7">Mỗi trang sử, một câu chuyện</Text>
            <Text color="$paperDeep" fs="$1" lh="$2" maxW="$16">Khám phá con người, sự kiện và dấu mốc làm nên hồn Việt.</Text>
            <YStack self="flex-start" mt="$1"><PrimaryButton label="Khám phá ngay" onPress={onHistory} /></YStack>
          </YStack>
        </ZStack>
      </AppCard>

      {currentEpisode ? (
        <YStack g="$2">
          <SectionHeader title="Nghe tiếp" onPress={onPodcast} />
          <AppCard onPress={onPlayer}>
            <XStack p="$2.5" g="$2.5" items="center" overflow="hidden">
              <AppImage source={currentEpisode.image} w={112} h={124} resizeMode="cover" rounded={8} />
              <YStack f={1} minW={0} h={124} justify="space-between">
                <YStack g="$0.5">
                  <Text color="$ink" fs="$2" lh={18} fw="$7" numberOfLines={1}>
                    {currentEpisode.title}
                  </Text>
                  <Text color="$inkSoft" fs={10.5} lh={14} numberOfLines={1}>
                    {currentEpisode.seriesTitle} · Tập {currentEpisode.number}
                  </Text>
                </YStack>
                <YStack g="$0.5">
                  <ProgressBar value={ratio} />
                  <XStack items="center" justify="space-between">
                    <Text color="$inkSoft" fs={8} lh={10}>{formatTime(playback.position)}</Text>
                    <Text color="$inkSoft" fs={8} lh={10}>
                      {playback.duration > 0 ? formatTime(playback.duration) : "--:--"}
                    </Text>
                  </XStack>
                </YStack>
                <ZStack h={44} w="100%">
                  <Button
                    unstyled
                    pos="absolute"
                    l="25%"
                    ml={-22}
                    w={44}
                    h={44}
                    items="center"
                    justify="center"
                    onPress={() => playback.seekBy(-15)}
                    aria-label="Lùi 15 giây"
                  >
                    <AppIcon name="rotate-ccw" size={19} />
                    <Text pos="absolute" color="$ink" fs={7} fw="$7">15</Text>
                  </Button>
                  <YStack pos="absolute" l="50%" ml={-22} w={44} h={44} items="center" justify="center">
                    <IconButton
                      icon={playback.isPlaying ? "pause" : "play"}
                      label={playback.isPlaying ? "Tạm dừng" : "Phát"}
                      onPress={playback.toggle}
                      filled
                    />
                  </YStack>
                  <Button
                    unstyled
                    pos="absolute"
                    l="75%"
                    ml={-22}
                    w={44}
                    h={44}
                    items="center"
                    justify="center"
                    onPress={() => playback.seekBy(15)}
                    aria-label="Tiến 15 giây"
                  >
                    <AppIcon name="rotate-cw" size={19} />
                    <Text pos="absolute" color="$ink" fs={7} fw="$7">15</Text>
                  </Button>
                  <Button
                    unstyled
                    pos="absolute"
                    r={-8}
                    w={44}
                    h={44}
                    items="center"
                    justify="center"
                    onPress={onPlayer}
                    aria-label="Tùy chọn"
                  >
                    <AppIcon name="more-horizontal" size={20} />
                  </Button>
                </ZStack>
              </YStack>
            </XStack>
          </AppCard>
        </YStack>
      ) : null}

      <YStack g="$2">
        <SectionHeader title="Chủ đề nổi bật" onPress={onHistory} />
        <XStack g="$2" w="100%">
          {topics.map((topic) => (
            <YStack key={topic.title} f={1} minW={0}>
              <AppCard onPress={onHistory}>
                <ZStack w="100%" h={152}>
                  <AppImage source={topic.image} w="100%" h="100%" rounded={0} resizeMode="cover" op={0.72} />
                  <YStack pos="absolute" l="$2" r="$2" b="$2">
                    <Text color="$paperSoft" fs="$2" lh="$2" fw="$7">{topic.title}</Text>
                    <Text color="$paperDeep" fs={9} lh={12} numberOfLines={2}>{topic.subtitle}</Text>
                  </YStack>
                </ZStack>
              </AppCard>
            </YStack>
          ))}
        </XStack>
      </YStack>

      {periods.length > 0 ? (
        <YStack g="$2">
          <SectionHeader title="Dòng chảy lịch sử" action="Khám phá toàn bộ" onPress={() => onHistory()} />
          <ZStack h={66}>
            <YStack pos="absolute" t={5} l="8.33%" r="8.33%" h={2} bg="$bronze" />
            <XStack pos="absolute" t={0} l={0} r={0}>
              {periods.slice(0, 6).map((period: HistoricalPeriodDto, index: number) => {
                const isHighlight = index === 2 || index === 0;
                return (
                  <YStack
                    key={period.id}
                    f={1}
                    minW={0}
                    items="center"
                    onPress={() => onHistory(period.id)}
                    pressStyle={{ op: 0.7 }}
                  >
                    <YStack
                      w={12}
                      h={12}
                      rounded={6}
                      bg="$paper"
                      bw={2}
                      bc={isHighlight ? "$vermilion" : "$bronze"}
                      items="center"
                      justify="center"
                    >
                      <YStack
                        w={isHighlight ? 6 : 4}
                        h={isHighlight ? 6 : 4}
                        rounded={3}
                        bg={isHighlight ? "$vermilion" : "$bronze"}
                      />
                    </YStack>
                    <Text
                      mt="$1"
                      color={isHighlight ? "$vermilion" : "$ink"}
                      fs={8}
                      lh={10}
                      fw={isHighlight ? "$7" : "$5"}
                      text="center"
                      numberOfLines={1}
                    >
                      {period.name}
                    </Text>
                  </YStack>
                );
              })}
            </XStack>
          </ZStack>
        </YStack>
      ) : null}
    </ScreenScroll>
  );
}

