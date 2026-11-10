import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Platform, useWindowDimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Image as ExpoImage, type ImageProps } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, ScrollView, Separator, Text, XStack, YStack, ZStack } from "tamagui";
import { AppCard, AppHeader, AppIcon, AppImage, Chip, IconButton, PrimaryButton, ScreenScroll, SectionHeader, formatTime } from "@/shared/ui";
import { formatDateVi, formatDuration, podcastApi, type PodcastEpisode, type SeriesDetail } from "../podcastApi";
import type { LivePlaybackState } from "../usePlayback";
import { AddToPlaylistModal } from "@/features/personal-library";
import { useAuthStore } from "@/lib/authStore";

function LoadingBlock({ label = "Đang tải…" }: { label?: string }): React.JSX.Element {
  return (
    <YStack py="$6" items="center">
      <Text color="$inkSoft" fs="$1">{label}</Text>
    </YStack>
  );
}

function ErrorBlock({ onRetry, message = "Chưa tải được nội dung." }: { onRetry: () => void; message?: string }): React.JSX.Element {
  return (
    <YStack py="$6" items="center" g="$2">
      <Text color="$inkSoft" fs="$1">{message}</Text>
      <PrimaryButton label="Thử lại" secondary onPress={onRetry} />
    </YStack>
  );
}

interface PodcastLibraryProps {
  currentEpisode: PodcastEpisode | null;
  onSeries: (slug: string) => void;
  onPlay: (episode: PodcastEpisode) => void;
  onEpisodeQuiz: (episode: PodcastEpisode) => void;
  onRequireAuth: () => void;
}

export function PodcastLibraryScreen({ currentEpisode, onSeries, onPlay, onEpisodeQuiz, onRequireAuth }: PodcastLibraryProps): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const [menuEpisode, setMenuEpisode] = useState<PodcastEpisode | null>(null);
  const [addingEpisode, setAddingEpisode] = useState<PodcastEpisode | null>(null);
  const pendingPicker = useRef<PodcastEpisode | null>(null);
  const seriesQuery = useQuery({ queryKey: ["podcast", "series"], queryFn: () => podcastApi.listSeries() });
  const latestQuery = useQuery({
    queryKey: ["podcast", "latest", seriesQuery.data?.map((item) => item.id).join(",")],
    queryFn: () => podcastApi.latestEpisodes(6, seriesQuery.data),
    enabled: Boolean(seriesQuery.data),
  });
  const featured = seriesQuery.data?.find((item) => item.slug === "viet-nam-thoi-phong-kien") ?? seriesQuery.data?.[0];

  return (
    <YStack f={1} bg="$paper">
      <AppHeader title="Podcast" />
      <ScreenScroll>
      {seriesQuery.isPending ? (
        <LoadingBlock label="Đang tải danh sách series…" />
      ) : seriesQuery.isError || !featured ? (
        <ErrorBlock onRetry={() => void seriesQuery.refetch()} />
      ) : (
        <>
          <AppCard dark onPress={() => onSeries(featured.slug)}>
            <ZStack h="$14">
              <AppImage source={featured.hero} w="100%" h="100%" resizeMode="cover" rounded={0} op={0.7} />
              <YStack pos="absolute" l="$3" b="$3" r="$3" g="$1">
                <Text self="flex-start" color="$paperSoft" bg="$bronzeDark" px="$2" py="$0.5" rounded="$3" fs={9} fw="$7">
                  SERIES NỔI BẬT
                </Text>
                <Text color="$paperSoft" fs="$5" fw="$7" numberOfLines={1}>{featured.title}</Text>
                <Text color="$paperDeep" fs="$1" numberOfLines={2}>{featured.description}</Text>
                <YStack self="flex-start" mt="$1">
                  <PrimaryButton label="Khám phá series" onPress={() => onSeries(featured.slug)} />
                </YStack>
              </YStack>
            </ZStack>
          </AppCard>

          <YStack g="$2">
            <SectionHeader title="Series lịch sử" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack g="$2">
                {seriesQuery.data.map((item) => (
                  <YStack key={item.id} w={108} g="$1" onPress={() => onSeries(item.slug)} pressStyle={{ op: 0.75 }}>
                    <AppImage source={item.cover} w={108} h={108} resizeMode="cover" rounded={10} />
                    <Text color="$ink" fs="$1" fw="$7" numberOfLines={2}>{item.title}</Text>
                    <Text color="$inkSoft" fs={9}>{item.episodeCount} tập</Text>
                  </YStack>
                ))}
              </XStack>
            </ScrollView>
          </YStack>
        </>
      )}

      <YStack g="$1.5">
        <SectionHeader title="Tập mới phát hành" />
        {latestQuery.isPending ? (
          <LoadingBlock label="Đang tải các tập mới…" />
        ) : latestQuery.isError ? (
          <ErrorBlock onRetry={() => void latestQuery.refetch()} />
        ) : (
          latestQuery.data.map((episode) => (
            <XStack
              key={episode.id}
              py="$1.5"
              items="center"
              g="$2"
            >
              <Button unstyled f={1} minW={0} fd="row" items="center" g="$2" onPress={() => onPlay(episode)} accessibilityRole="button" accessibilityLabel={`Phát ${episode.title}`} pressStyle={{ op: 0.75 }}>
                <AppImage source={episode.image} w={56} h={56} resizeMode="cover" rounded={8} />
                <YStack f={1} minW={0}>
                  <Text color="$ink" fs="$1" fw="$7" numberOfLines={2}>{episode.title}</Text>
                  <Text color="$inkSoft" fs={10} numberOfLines={1}>
                    {episode.seriesTitle} · Tập {episode.number} · {formatDuration(episode.durationMs)}
                  </Text>
                </YStack>
              </Button>
              <IconButton icon="more-vertical" label={`Tùy chọn ${episode.title}`} onPress={() => setMenuEpisode(episode)} />
            </XStack>
          ))
        )}
      </YStack>

      {currentEpisode ? (
        <AppCard>
          <YStack p="$3" g="$2">
            <XStack items="center" g="$2">
              <YStack w="$4" h="$4" rounded="$10" bg="$paperDeep" items="center" justify="center">
                <AppIcon name="award" size={21} color="#B8322A" />
              </YStack>
              <YStack f={1}>
                <Text color="$ink" fs="$2" fw="$7">Nghe xong, ôn ngay</Text>
                <Text color="$inkSoft" fs={10} numberOfLines={2}>
                  Làm bài trắc nghiệm củng cố kiến thức tập “{currentEpisode.title}”.
                </Text>
              </YStack>
            </XStack>
            <XStack g="$2">
              <YStack f={1}>
                <PrimaryButton label="Nghe tiếp" icon="headphones" secondary onPress={() => onPlay(currentEpisode)} />
              </YStack>
              <YStack f={1}>
                <PrimaryButton label="Làm quiz" icon="edit-3" onPress={() => onEpisodeQuiz(currentEpisode)} />
              </YStack>
            </XStack>
          </YStack>
        </AppCard>
      ) : null}
      </ScreenScroll>
      <Modal visible={Boolean(menuEpisode)} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onDismiss={() => { if (pendingPicker.current) { setAddingEpisode(pendingPicker.current); pendingPicker.current = null; } }} onRequestClose={() => setMenuEpisode(null)}>
        <YStack f={1} justify="flex-end" bg="rgba(0,0,0,0.55)">
          <Button unstyled f={1} onPress={() => setMenuEpisode(null)} accessibilityLabel="Đóng tùy chọn" />
          <YStack bg="$nightSoft" borderTopLeftRadius="$6" borderTopRightRadius="$6" pb={Math.max(insets.bottom, 16)}>
            <YStack w={36} h={4} rounded="$10" bg="$inkSoft" self="center" mt="$2" />
            <XStack p="$4" g="$3" items="center" borderBottomWidth={1} bc="$inkSoft">
              {menuEpisode ? <AppImage source={menuEpisode.image} w={48} h={48} rounded={4} /> : null}
              <YStack f={1} minW={0} g="$0.5"><Text color="$paperSoft" fs="$2" fw="$7" numberOfLines={2}>{menuEpisode?.title}</Text><Text color="$paperDeep" fs="$1" numberOfLines={1}>{menuEpisode?.seriesTitle}</Text></YStack>
            </XStack>
            <Button unstyled minH={56} px="$4" fd="row" items="center" g="$3" onPress={() => { if (menuEpisode) onPlay(menuEpisode); setMenuEpisode(null); }} accessibilityRole="button"><AppIcon name="play-circle" color="#FAF6ED" /><Text color="$paperSoft" fs="$2">Phát podcast</Text></Button>
            <Button unstyled minH={56} px="$4" fd="row" items="center" g="$3" onPress={() => { const item = menuEpisode; setMenuEpisode(null); if (!user) { onRequireAuth(); return; } if (item) { if (Platform.OS === "ios") pendingPicker.current = item; else setAddingEpisode(item); } }} accessibilityRole="button"><AppIcon name="plus-circle" color="#FAF6ED" /><Text color="$paperSoft" fs="$2">Thêm vào playlist</Text></Button>
          </YStack>
        </YStack>
      </Modal>
      {addingEpisode ? <AddToPlaylistModal episodeId={addingEpisode.id} onClose={() => setAddingEpisode(null)} /> : null}
    </YStack>
  );
}

interface SeriesDetailProps {
  seriesSlug: string;
  currentEpisodeId?: string;
  isPlaying: boolean;
  onBack: () => void;
  onPlay: (episode: PodcastEpisode) => void;
  onEpisodeQuiz: (episode: PodcastEpisode) => void;
}

export function SeriesDetailScreen({ seriesSlug, currentEpisodeId, isPlaying, onBack, onPlay, onEpisodeQuiz }: SeriesDetailProps): React.JSX.Element {
  const query = useQuery({ queryKey: ["podcast", "series", seriesSlug], queryFn: () => podcastApi.getSeries(seriesSlug) });
  const detail: SeriesDetail | undefined = query.data;
  const firstPlayable = detail?.episodes.find((episode) => episode.narrationId);

  return (
    <ScrollView f={1} showsVerticalScrollIndicator={false}>
      <ZStack h="$18">
        {detail ? (
          <AppImage source={detail.hero} w="100%" h="100%" rounded={0} resizeMode="cover" />
        ) : (
          <YStack f={1} bg="$nightSoft" />
        )}
        <XStack pos="absolute" t="$2" l="$2" r="$2" justify="space-between">
          <IconButton icon="chevron-left" label="Quay lại" onPress={onBack} light />
          <IconButton icon="share-2" label="Chia sẻ" onPress={() => undefined} light />
        </XStack>
      </ZStack>

      {query.isPending ? (
        <LoadingBlock label="Đang tải thông tin series…" />
      ) : query.isError || !detail ? (
        <ErrorBlock onRetry={() => void query.refetch()} />
      ) : (
        <YStack px="$3" py="$3" g="$2">
          <Text color="$ink" fs="$5" fw="$7">{detail.title}</Text>
          <Text color="$ink" fs="$1" fw="$7">{detail.creator ?? "Sử Ký Việt Nam"}</Text>
          <Text color="$inkSoft" fs="$1">
            {detail.episodes.length} tập · {Math.max(1, Math.round(detail.totalMs / 60000))} phút
          </Text>
          <Text color="$inkSoft" fs="$1" lh="$3">{detail.description}</Text>

          {firstPlayable ? (
            <PrimaryButton label="Phát tập có audio" icon="play" onPress={() => onPlay(firstPlayable)} />
          ) : null}

          <Text color="$ink" fs="$3" fw="$7" mt="$1">Danh sách tập</Text>
          {detail.episodes.map((episode) => {
            const active = episode.id === currentEpisodeId;
            const available = Boolean(episode.narrationId);
            const handlePress = (): void => {
              if (available) {
                onPlay(episode);
                return;
              }
              Alert.alert("Chưa có audio", `Tập “${episode.title}” chưa có bản thu trên máy chủ.`);
            };
            return (
              <YStack key={episode.id}>
                <XStack
                  py="$1.5"
                  items="center"
                  g="$2"
                  op={available ? 1 : 0.72}
                  onPress={handlePress}
                  pressStyle={{ op: 0.75 }}
                >
                  <AppImage source={episode.image} w={64} h={48} resizeMode="cover" rounded={6} />
                  <YStack f={1} minW={0}>
                    <Text color={active ? "$vermilion" : "$ink"} fs="$1" fw="$7" numberOfLines={2}>
                      {episode.number}. {episode.title}
                    </Text>
                    <Text color="$inkSoft" fs={9}>
                      {formatDateVi(episode.publishedAt)} · {available ? formatDuration(episode.durationMs) : "Chưa có audio"}
                    </Text>
                  </YStack>
                  {available ? (
                    <IconButton
                      icon={active && isPlaying ? "pause" : "play"}
                      label="Phát"
                      onPress={() => onPlay(episode)}
                      light
                    />
                  ) : (
                    <Button unstyled px="$1" py="$1" onPress={handlePress} aria-label="Thông tin audio">
                      <Text color="$inkSoft" fs={9} fw="$7">Chưa có audio</Text>
                    </Button>
                  )}
                </XStack>
                <Separator bc="$line" />
              </YStack>
            );
          })}

          {detail.episodes.length > 0 ? (
            <AppCard>
              <YStack p="$3" g="$2">
                <XStack items="center" g="$2">
                  <AppIcon name="check-circle" size={24} color="#55714A" />
                  <YStack f={1}>
                    <Text color="$ink" fs="$2" fw="$7">Ôn lại nội dung vừa nghe</Text>
                    <Text color="$inkSoft" fs={10}>Làm bài trắc nghiệm để nhận XP và củng cố kiến thức.</Text>
                  </YStack>
                </XStack>
                <PrimaryButton
                  label="Làm quiz tập này"
                  icon="award"
                  onPress={() => {
                    const target = detail.episodes.find((e) => e.id === currentEpisodeId) ?? detail.episodes[0];
                    if (target) onEpisodeQuiz(target);
                  }}
                />
              </YStack>
            </AppCard>
          ) : null}
        </YStack>
      )}
    </ScrollView>
  );
}

function SeekBar({ playback }: { playback: LivePlaybackState }): React.JSX.Element {
  const [barWidth, setBarWidth] = useState(0);
  const ratio = playback.duration > 0 ? Math.min(1, playback.position / playback.duration) : 0;

  return (
    <YStack
      h={28}
      justify="center"
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      onPress={(event) => {
        if (barWidth > 0) playback.seekToRatio(event.nativeEvent.locationX / barWidth);
      }}
    >
      <XStack h={5} bg="$nightSoft" rounded="$10" overflow="hidden">
        <YStack h="100%" w={`${ratio * 100}%` as `${number}%`} bg="$vermilion" />
      </XStack>
      <YStack pos="absolute" l={Math.max(0, ratio * barWidth - 7)} w={14} h={14} rounded={7} bg="$bronze" />
    </YStack>
  );
}

interface AudioPlayerScreenProps {
  queueNavigation?: { index: number; total: number; busy: boolean; onPrevious: () => void; onNext: () => void };
  libraryError?: string | null;
  episode: PodcastEpisode;
  narrationId: string | null;
  onSelectNarration: (id: string) => void;
  onQuiz: () => void;
  onBack: () => void;
  playback: LivePlaybackState;
}

export function AudioPlayerScreen({
  queueNavigation,
  libraryError,
  episode,
  narrationId,
  onSelectNarration,
  onQuiz,
  onBack,
  playback,
}: AudioPlayerScreenProps): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  const [showFullScript, setShowFullScript] = useState(false);
  const [showQuizInvitation, setShowQuizInvitation] = useState(false);
  const scriptQuery = useQuery({ queryKey: ["podcast", "episode", episode.slug], queryFn: () => podcastApi.getEpisode(episode.slug), staleTime: 5 * 60_000 });
  const script = scriptQuery.data?.narrations.find((item) => item.id === narrationId && item.available)?.scriptContent?.trim();
  const artworkSize = Math.min(width - 48, height * 0.42, 360);
  const remaining = Math.max(0, playback.duration - playback.position);

  useEffect(() => setShowQuizInvitation(false), [episode.id]);
  useEffect(() => {
    if (playback.finishedSessionId) setShowQuizInvitation(true);
  }, [playback.finishedSessionId]);

  return (
    <YStack f={1} pos="relative" overflow="hidden" px="$3" pb="$2">
      <StatusBar style="light" />

      {/* Background ảnh mờ (Blurred Artwork Backdrop) thay cho background đen */}
      <YStack pos="absolute" t={0} l={0} r={0} b={0} pointerEvents="none" overflow="hidden">
        <ExpoImage
          source={episode.image as ImageProps["source"]}
          style={{
            position: "absolute",
            top: -50,
            left: -50,
            width: width + 100,
            height: height + 100,
          }}
          contentFit="cover"
          blurRadius={Platform.OS === "android" ? 25 : 55}
          cachePolicy="memory-disk"
        />
        {/* Lớp phủ chuyển sắc tối tạo chiều sâu sơn mài và bảo đảm độ tương phản tối ưu */}
        <YStack pos="absolute" t={0} l={0} r={0} b={0} bg="rgba(18, 14, 12, 0.62)" />
      </YStack>

      <XStack h="$4.5" items="center" justify="space-between">
        <Button unstyled w="$4" h="$4" items="center" justify="center" onPress={onBack} aria-label="Thu nhỏ">
          <AppIcon name="chevron-down" size={25} color="#FAF6ED" />
        </Button>
        <YStack items="center">
          <Text color="$bronze" fs={9} fw="$6" ls="$1">ĐANG PHÁT TỪ SERIES</Text>
          <Text color="$paperSoft" fs="$1" fw="$7">{episode.seriesTitle}</Text>
        </YStack>
        <YStack w="$4" />
      </XStack>

      <ScrollView f={1} showsVerticalScrollIndicator={false} onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}>
      <YStack minH={contentHeight} items="center" g="$4" pt="$3" pb="$5">
        <YStack f={1} minH={artworkSize} items="center" justify="center">
          <YStack rounded={14} bw={1} bc="$bronzeDark" boxShadow="0 14px 36px rgba(0, 0, 0, 0.55)">
            <AppImage source={episode.image} w={artworkSize} h={artworkSize} resizeMode="cover" rounded={13} />
          </YStack>
        </YStack>

        <YStack w="100%" g="$2">
          <YStack>
            <Text color="$paperSoft" fs="$4" lh={24} fw="$7" numberOfLines={2}>{episode.title}</Text>
            <Text color="$bronze" fs="$1" mt="$0.5">
              Sử Ký · {episode.seriesTitle} · Tập {episode.number}
            </Text>
          </YStack>

          {episode.narrations.length > 1 ? (
            <XStack g="$1.5" items="center">
              <Text color="$paperDeep" fs={10} fw="$6">Góc kể:</Text>
              {episode.narrations.map((item) => {
                const isSelected = item.id === narrationId;
                const label = item.type === "FIRST_PERSON" ? "Lời kể nhân vật" : "Người dẫn chuyện";
                return (
                  <Chip
                    key={item.id}
                    label={label}
                    selected={isSelected}
                    onPress={() => onSelectNarration(item.id)}
                  />
                );
              })}
            </XStack>
          ) : null}

          {playback.error ? (
            <XStack bg="$nightSoft" p="$2" rounded="$4" items="center" justify="space-between" g="$2">
              <Text f={1} color="$paperDeep" fs={11}>{playback.error}</Text>
              <Button unstyled px="$2" py="$1" bg="$vermilion" rounded="$3" onPress={playback.retry}>
                <Text color="$paperSoft" fs={10} fw="$7">{playback.requiresAuth ? "Đăng nhập" : "Thử lại"}</Text>
              </Button>
            </XStack>
          ) : null}

          <YStack>
            <SeekBar playback={playback} />
            <XStack justify="space-between">
              <Text color="$paperDeep" fs={11}>{formatTime(playback.position)}</Text>
              <Text color="$paperDeep" fs={11}>
                {playback.isLoading ? "Đang tải…" : `-${formatTime(remaining)}`}
              </Text>
            </XStack>
          </YStack>

          <XStack h={84} items="center" justify="center" g="$4">
            <Button
              unstyled
              w="$5"
              h="$5"
              items="center"
              justify="center"
              onPress={() => playback.seekBy(-15)}
              aria-label="Lùi 15 giây"
              pressStyle={{ op: 0.6 }}
            >
              <AppIcon name="rotate-ccw" size={28} color="#FAF6ED" />
              <Text pos="absolute" color="$paperSoft" fs={8} fw="$7" mt={2}>15</Text>
            </Button>
            <Button
              unstyled
              w={74}
              h={74}
              rounded={37}
              bg="$vermilion"
              items="center"
              justify="center"
              onPress={playback.toggle}
              aria-label={playback.isPlaying ? "Tạm dừng" : "Phát"}
              pressStyle={{ scale: 0.95 }}
              boxShadow="0 8px 22px rgba(184, 50, 42, 0.45)"
            >
              <AppIcon name={playback.isPlaying ? "pause" : "play"} size={32} color="#FAF6ED" />
            </Button>
            <Button
              unstyled
              w="$5"
              h="$5"
              items="center"
              justify="center"
              onPress={() => playback.seekBy(15)}
              aria-label="Tiến 15 giây"
              pressStyle={{ op: 0.6 }}
            >
              <AppIcon name="rotate-cw" size={28} color="#FAF6ED" />
              <Text pos="absolute" color="$paperSoft" fs={8} fw="$7" mt={2}>15</Text>
            </Button>
          </XStack>

          {queueNavigation ? <YStack g="$2"><Text ff="$body" fs="$1" text="center" color="$paperDeep">Playlist · Tập {queueNavigation.index + 1}/{queueNavigation.total}</Text><XStack g="$2"><YStack f={1}><PrimaryButton secondary icon="skip-back" label="Tập trước" disabled={queueNavigation.busy || queueNavigation.index <= 0} onPress={queueNavigation.onPrevious} /></YStack><YStack f={1}><PrimaryButton secondary icon="skip-forward" label="Tập tiếp" disabled={queueNavigation.busy || queueNavigation.index >= queueNavigation.total - 1} onPress={queueNavigation.onNext} /></YStack></XStack></YStack> : null}
          {showQuizInvitation ? (
            <YStack bg="$paperSoft" rounded="$5" p="$3" g="$2" accessibilityRole="summary">
              <XStack items="center" g="$2">
                <AppIcon name="award" size={24} color="#B8322A" />
                <YStack f={1}>
                  <Text color="$ink" fs="$2" fw="$7">Bạn đã nghe xong tập này</Text>
                  <Text color="$inkSoft" fs={10}>Ôn lại nội dung với quiz của tập podcast.</Text>
                </YStack>
              </XStack>
              <XStack g="$2">
                <YStack f={1}><PrimaryButton label="Để sau" secondary onPress={() => setShowQuizInvitation(false)} /></YStack>
                <YStack f={1}><PrimaryButton label="Bắt đầu quiz" icon="edit-3" onPress={onQuiz} /></YStack>
              </XStack>
            </YStack>
          ) : null}
          {libraryError ? <Text accessibilityRole="alert" ff="$body" fs="$2" lh="$3" color="$paperDeep">{libraryError}</Text> : null}
        </YStack>
      </YStack>
      <YStack bg="$paperDeep" rounded="$5" p="$4" mb="$5" g="$3">
        <Text color="$ink" fs="$3" fw="$7">Kịch bản tập podcast</Text>
        {scriptQuery.isPending ? <Text color="$inkSoft" fs="$2">Đang tải kịch bản…</Text> : scriptQuery.isError ? <><Text color="$inkSoft" fs="$2">Chưa tải được kịch bản.</Text><PrimaryButton secondary label="Thử lại" onPress={() => void scriptQuery.refetch()} /></> : script ? <>
          <Text color="$ink" fs="$3" lh="$4" numberOfLines={showFullScript ? undefined : 5}>{script}</Text>
          <Button unstyled self="flex-start" bg="$paperSoft" rounded="$8" px="$3" py="$2" onPress={() => setShowFullScript(!showFullScript)} accessibilityRole="button" accessibilityState={{ expanded: showFullScript }}><Text color="$ink" fs="$2" fw="$7">{showFullScript ? "Thu gọn" : "Xem toàn bộ kịch bản"}</Text></Button>
        </> : <Text color="$inkSoft" fs="$2">Kịch bản chưa có sẵn cho bản thu này.</Text>}
      </YStack>
      </ScrollView>
    </YStack>
  );
}
