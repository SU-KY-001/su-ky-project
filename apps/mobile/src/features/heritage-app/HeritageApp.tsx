import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { AppShell, type MainTab } from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { screenForTab, tabForScreen } from "./appLogic";
import { nextPlaylistMode, nextQueueIndex, playlistOrder, type PlaylistMode } from "./playlistPlayback";
import {
  podcastApi,
  fallbackEventImage,
  restoreCachedEpisode,
  serializeEpisode,
  type CachedEpisodePayload,
  type PodcastEpisode,
  type PublicHistoricalEventDto,
} from "./podcastApi";
import { LoginScreen } from "./screens/AccountScreens";
import { ProfileScreen } from "./screens/ProfileScreen";
import { DiscoveryScreen } from "./screens/DiscoveryScreen";
import { EventDetailScreen, HistoryScreen } from "./screens/HistoryScreens";
import { AudioPlayerScreen, PodcastLibraryScreen, SeriesDetailScreen } from "./screens/PodcastScreens";
import { EpisodeQuizScreen, QuizListScreen, type QuizEpisodeSummary } from "./screens/QuizScreens";
import type { AppScreen } from "./types";
import { usePlayback, type HistoryResumeRequest } from "./usePlayback";
import { ListeningHistoryScreen, type ListeningHistoryItem, type ListeningHistoryStatus } from "@/features/listening-history";
import { TopQuizzesScreen, type TopQuizItem } from "@/features/top-quizzes";
import { RankingsScreen, PlaylistsScreen, PlaylistDetailScreen, libraryService, type PlaylistTrack } from "@/features/personal-library";

const LAST_EPISODE_KEY = "suky.playback.lastEpisode";

export function HeritageApp(): React.JSX.Element {
  const router = useRouter();
  const { user, hydrate } = useAuthStore();
  const [screen, setScreen] = useState<AppScreen>("discovery");
  const [seriesSlug, setSeriesSlug] = useState("viet-nam-thoi-phong-kien");
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [selectedNarrationId, setSelectedNarrationId] = useState<string | null>(null);
  const [autoplayToken, setAutoplayToken] = useState(0);
  const [playerReturn, setPlayerReturn] = useState<AppScreen>("podcasts");
  const [resumeRequest, setResumeRequest] = useState<HistoryResumeRequest | null>(null);
  const resumeToken = useRef(0);
  const [listeningHistoryPage, setListeningHistoryPage] = useState(1);
  const [listeningHistoryStatus, setListeningHistoryStatus] = useState<ListeningHistoryStatus>("all");
  const [openingHistoryEpisodeId, setOpeningHistoryEpisodeId] = useState<string | null>(null);
  const [historyOpenError, setHistoryOpenError] = useState<string | null>(null);
  const openingHistory = useRef(false);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const playbackInteraction = useRef(0);

  const [quizEpisode, setQuizEpisode] = useState<QuizEpisodeSummary | null>(null);
  const [quizReturn, setQuizReturn] = useState<AppScreen>("quizzes");
  const [topQuizzesPage, setTopQuizzesPage] = useState(1);
  const [openingQuizId, setOpeningQuizId] = useState<string | null>(null);
  const [quizOpenError, setQuizOpenError] = useState<string | null>(null);
  const quizOpeningLock = useRef(false);
  const [selectedEvent, setSelectedEvent] = useState<PublicHistoricalEventDto | null>(null);
  const [historyPeriodId, setHistoryPeriodId] = useState<string | undefined>();
  const [rankingPeriod, setRankingPeriod] = useState<"week" | "month">("week");
  const [rankingScope, setRankingScope] = useState<"personal" | "system">("personal");
  const [rankingPage, setRankingPage] = useState(1);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const selectedPlaylistRef = useRef(selectedPlaylistId);
  selectedPlaylistRef.current = selectedPlaylistId;
  const [playlistPage, setPlaylistPage] = useState(1);
  const [addingEpisodeId, setAddingEpisodeId] = useState<string | null>(null);
  const [playlistsReturn, setPlaylistsReturn] = useState<AppScreen>("profile");
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const libraryLock = useRef(false);
  const [playlistMode, setPlaylistMode] = useState<{ id: string; mode: PlaylistMode } | null>(null);
  const [playbackQueue, setPlaybackQueue] = useState<{ ownerId: string; playlistId: string; tracks: PlaylistTrack[]; originalTracks: PlaylistTrack[]; index: number; mode: PlaylistMode } | null>(null);
  const finishedQueueSession = useRef<string | null>(null);

  const [loginReturn, setLoginReturn] = useState<AppScreen>("profile");
  const [loginReason, setLoginReason] = useState<string | undefined>();
  const [pendingPlay, setPendingPlay] = useState<PodcastEpisode | null>(null);

  // Khởi tạo phiên đăng nhập
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Phục hồi tập nghe gần nhất từ AsyncStorage, hoặc tải tập mới nhất từ API
  useEffect(() => {
    let active = true;
    const initialInteraction = playbackInteraction.current;
    void AsyncStorage.getItem(LAST_EPISODE_KEY)
      .then((saved) => {
        if (!active || playbackInteraction.current !== initialInteraction) return;
        if (saved) {
          try {
            const restored = restoreCachedEpisode(JSON.parse(saved) as CachedEpisodePayload);
            void podcastApi
              .getSeries(restored.seriesSlug)
              .then((detail) => {
                if (!active || playbackInteraction.current !== initialInteraction) return;
                const current = detail.episodes.find((item) => item.slug === restored.slug) ?? restored;
                setEpisode(current);
                setSelectedNarrationId(current.narrationId);
              })
              .catch(() => {
                if (!active || playbackInteraction.current !== initialInteraction) return;
                setEpisode(restored);
                setSelectedNarrationId(restored.narrationId);
              });
            return;
          } catch {
            // fallback tải từ API bên dưới
          }
        }
        void podcastApi.latestEpisodes(1).then((latest) => {
          if (!active || playbackInteraction.current !== initialInteraction) return;
          if (latest[0]) {
            setEpisode(latest[0]);
            setSelectedNarrationId(latest[0].narrationId);
          }
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const currentNarrationId = selectedNarrationId ?? episode?.narrationId ?? null;

  const requireAuth = (reason?: string, pending?: PodcastEpisode): void => {
    setLoginReason(reason ?? "Đăng nhập để nghe đầy đủ câu chuyện và lưu tiến trình cá nhân.");
    setLoginReturn(screen);
    if (pending) setPendingPlay(pending);
    setScreen("login");
  };

  const playback = usePlayback(
    episode,
    currentNarrationId,
    autoplayToken,
    user?.id ?? null,
    () => requireAuth(undefined, episode ?? undefined),
    resumeRequest,
  );

  const activeTab = tabForScreen(screen);
  const hideTabs = ["event", "series", "player", "episodeQuiz", "login", "listeningHistory", "topQuizzes", "rankings"].includes(screen) || (screen === "playlists" && !!addingEpisodeId);
  const dark = screen === "player" || screen === "playlistDetail";

  const changeTab = (tab: MainTab): void => { if (tab === "playlist") { setAddingEpisodeId(null); setPlaylistsReturn("discovery"); } setScreen(screenForTab(tab)); };

  const startEpisodeQuiz = (target: QuizEpisodeSummary): void => {
    setQuizReturn("quizzes");
    setQuizEpisode(target);
    setScreen("episodeQuiz");
  };

  const openTopQuiz = async (item: TopQuizItem, from: "profile" | "topQuizzes"): Promise<void> => {
    if (!user) { requireAuth("Đăng nhập để mở quiz của bạn."); return; }
    if (!item.available || quizOpeningLock.current) return;
    const ownerId = user.id;
    quizOpeningLock.current = true; setOpeningQuizId(item.quizId); setQuizOpenError(null);
    try {
      const quiz = await podcastApi.quiz(item.episodeSlug);
      if (screenRef.current !== from || useAuthStore.getState().user?.id !== ownerId) return;
      if (quiz.id !== item.quizId || !quiz.questions.length) throw new Error("Quiz đã thay đổi");
      setQuizEpisode({ slug: item.episodeSlug, title: item.episodeTitle, seriesTitle: item.seriesTitle, image: fallbackEventImage(item.seriesSlug) });
      setQuizReturn(from); setScreen("episodeQuiz");
    } catch {
      if (screenRef.current === from && useAuthStore.getState().user?.id === ownerId) setQuizOpenError("Chưa mở được quiz. Quiz có thể đã thay đổi hoặc kết nối bị gián đoạn. Vui lòng thử lại.");
    } finally { quizOpeningLock.current = false; setOpeningQuizId(null); }
  };

  useFocusEffect(useCallback(() => {
    if (screen !== "episodeQuiz" || !["profile", "topQuizzes"].includes(quizReturn)) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { setScreen(quizReturn); return true; });
    return () => subscription.remove();
  }, [screen, quizReturn]));

  const openSeries = (slug: string): void => {
    setSeriesSlug(slug);
    setScreen("series");
  };

  const playEpisode = (target: PodcastEpisode, from: AppScreen, resume?: { narrationId: string; positionMs: number }): void => {
    const narrationId = resume?.narrationId ?? target.narrationId;
    if (!narrationId) return;
    if (!useAuthStore.getState().user) { requireAuth(undefined, target); return; }
    playbackInteraction.current += 1;
    setEpisode(target);
    setPlaybackQueue(null);
    setSelectedNarrationId(narrationId);
    setResumeRequest(resume ? { ...resume, token: ++resumeToken.current } : null);
    setAutoplayToken((v) => v + 1);
    setPlayerReturn(from);
    void AsyncStorage.setItem(LAST_EPISODE_KEY, JSON.stringify(serializeEpisode(target))).catch(() => undefined);
  };

  const openLibraryEpisode = async (slug: string): Promise<void> => {
    if (!user) { requireAuth("Đăng nhập để nghe podcast và lưu hành trình."); return; }
    if (libraryLock.current) return;
    const from = screen;
    const ownerId = user.id; const interaction = playbackInteraction.current;
    libraryLock.current = true; setLibraryBusy(true); setLibraryError(null);
    try {
      const ep = await podcastApi.getEpisode(slug);
      const series = await podcastApi.getSeries(ep.series!.slug);
      if (screenRef.current !== from || useAuthStore.getState().user?.id !== ownerId || playbackInteraction.current !== interaction) return;
      const target = series.episodes.find((item) => item.slug === slug);
      if (!target?.narrationId) throw new Error("Tập không còn audio");
      playEpisode(target, from);
    } catch { if (screenRef.current === from) setLibraryError("Chưa mở được tập. Kiểm tra kết nối hoặc chọn tập khác."); }
    finally { libraryLock.current = false; setLibraryBusy(false); }
  };

  const playQueueIndex = async (queue: NonNullable<typeof playbackQueue>, startIndex: number, direction: number, from: AppScreen, keepScreen = false): Promise<void> => {
    if (libraryLock.current || useAuthStore.getState().user?.id !== queue.ownerId) return;
    libraryLock.current = true; setLibraryBusy(true); setLibraryError(null);
    const interaction = playbackInteraction.current;
    try {
      for (let offset = 0; offset < queue.tracks.length; offset++) {
        const rawIndex = startIndex + offset * direction;
        const index = queue.mode === "repeat" && direction === 1 ? rawIndex % queue.tracks.length : rawIndex;
        if (index < 0 || index >= queue.tracks.length) break;
        const track = queue.tracks[index]!;
        if (!track.available) continue;
        let detail;
        try { detail = await podcastApi.getSeries(track.seriesSlug); }
        catch (error) { if ((error as { response?: { status?: number } }).response?.status === 404) continue; throw error; }
        if (useAuthStore.getState().user?.id !== queue.ownerId || screenRef.current !== from || playbackInteraction.current !== interaction) return;
        const target = detail.episodes.find((item) => item.id === track.episodeId);
        if (!target?.narrationId) continue;
        playback.stop();
        playEpisode(target, from === "player" || keepScreen ? playerReturn : "playlistDetail");
        setPlaybackQueue({ ...queue, index });
        return;
      }
      playback.stop();
      setLibraryError("Không còn tập khả dụng trong hướng phát này.");
    } catch { setLibraryError("Chưa phát được playlist. Kiểm tra kết nối rồi thử lại."); }
    finally { libraryLock.current = false; setLibraryBusy(false); }
  };

  const startPlaylist = async (id: string, episodeId?: string): Promise<void> => {
    if (!user) { requireAuth("Đăng nhập để phát playlist."); return; }
    if (libraryLock.current) return;
    const ownerId = user.id; const from = screen; const interaction = playbackInteraction.current;
    libraryLock.current = true; setLibraryBusy(true); setLibraryError(null);
    try {
      const originalTracks = await libraryService.tracks(id);
      if (useAuthStore.getState().user?.id !== ownerId || screenRef.current !== from || playbackInteraction.current !== interaction) return;
      libraryLock.current = false;
      const mode = playlistMode?.id === id ? playlistMode.mode : "normal";
      const tracks = playlistOrder(originalTracks, mode, episodeId);
      const index = episodeId ? tracks.findIndex((track) => track.episodeId === episodeId) : 0;
      if (index < 0 || !tracks.some((track) => track.available)) { setLibraryError("Playlist chưa có tập nào phát được."); return; }
      await playQueueIndex({ ownerId, playlistId: id, tracks, originalTracks, index, mode }, index, 1, from);
    } catch { setLibraryError("Chưa tải được playlist. Vui lòng thử lại."); }
    finally { libraryLock.current = false; setLibraryBusy(false); }
  };

  useEffect(() => {
    if (!playback.finishedSessionId || !playbackQueue || finishedQueueSession.current === playback.finishedSessionId || playbackQueue.ownerId !== user?.id) return;
    finishedQueueSession.current = playback.finishedSessionId;
    const next = nextQueueIndex(playbackQueue.index, playbackQueue.tracks.length, playbackQueue.mode);
    if (next !== null) void playQueueIndex(playbackQueue, next, 1, screen, true);
  }, [playback.finishedSessionId, playbackQueue, user?.id]);

  useFocusEffect(useCallback(() => {
    if (screen !== "player" || !["playlistDetail", "rankings"].includes(playerReturn)) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { setScreen(playerReturn); return true; });
    return () => subscription.remove();
  }, [screen, playerReturn]));

  const playHistoryEpisode = async (item: ListeningHistoryItem, from: "profile" | "listeningHistory"): Promise<void> => {
    if (!user) { requireAuth("Đăng nhập để tiếp tục nghe và lưu hành trình."); return; }
    if (openingHistory.current || !item.episode.available) return;
    const ownerId = user.id; const interaction = playbackInteraction.current;
    openingHistory.current = true;
    setOpeningHistoryEpisodeId(item.episode.id);
    setHistoryOpenError(null);
    try {
      const detail = await podcastApi.getSeries(item.episode.series.slug);
      if (screenRef.current !== from || useAuthStore.getState().user?.id !== ownerId || playbackInteraction.current !== interaction) return;
      const target = detail.episodes.find((candidate) => candidate.id === item.episode.id);
      if (!target || !target.narrations.some((choice) => choice.id === item.lastNarrationId)) {
        setHistoryOpenError("Bản kể bạn đã nghe hiện không còn khả dụng. Hãy chọn tập khác.");
        return;
      }
      playEpisode(target, from, { narrationId: item.lastNarrationId, positionMs: item.lastPositionMs });
    } catch {
      if (screenRef.current === from && useAuthStore.getState().user?.id === ownerId) setHistoryOpenError("Chưa mở được tập nghe. Kiểm tra kết nối rồi chọn lại tập để thử lại.");
    } finally {
      openingHistory.current = false;
      setOpeningHistoryEpisodeId(null);
    }
  };

  useFocusEffect(useCallback(() => {
    if (screen !== "player" || playerReturn !== "listeningHistory") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { setScreen("listeningHistory"); return true; });
    return () => subscription.remove();
  }, [screen, playerReturn]));

  const openPlayer = (from: AppScreen): void => {
    if (!episode) return;
    setPlayerReturn(from);
    setScreen("player");
  };

  const openEvent = (event: PublicHistoricalEventDto): void => {
    setSelectedEvent(event);
    setScreen("event");
  };

  const onLoginSuccess = (): void => {
    if (pendingPlay) {
      const target = pendingPlay;
      setPendingPlay(null);
      playEpisode(target, loginReturn);
      setScreen(loginReturn);
      return;
    }
    setScreen(loginReturn);
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={changeTab}
      hideTabs={hideTabs}
      hideMiniPlayer={["player", "login", "episodeQuiz"].includes(screen)}
      extendBottom={screen === "login" || screen === "player"}
      dark={dark}
      miniPlayer={
        episode
          ? {
              episodeId: episode.id,
              artwork: episode.image,
              title: episode.title,
              subtitle: `Sử Ký · ${episode.seriesTitle} · Tập ${episode.number}`,
              playback,
              onOpen: () => openPlayer(screen),
              onDismiss: () => { playbackInteraction.current += 1; playback.stop(); setPlaybackQueue(null); setEpisode(null); setSelectedNarrationId(null); setResumeRequest(null); },
            }
          : undefined
      }
    >
      {screen === "discovery" ? (
        <DiscoveryScreen
          currentEpisode={episode}
          playback={playback}
          onHistory={(periodId) => {
            setHistoryPeriodId(typeof periodId === "string" ? periodId : undefined);
            setScreen("history");
          }}
          onPodcast={() => setScreen("podcasts")}
          onPlayer={() => playback.toggle()}
        />
      ) : null}

      {screen === "history" ? (
        <HistoryScreen
          key={historyPeriodId ?? "all"}
          initialPeriodId={historyPeriodId}
          onEvent={openEvent}
        />
      ) : null}

      {screen === "event" && selectedEvent ? (
        <EventDetailScreen
          event={selectedEvent}
          onBack={() => setScreen("history")}
          onPodcast={() => openSeries("viet-nam-thoi-phong-kien")}
        />
      ) : null}

      {screen === "podcasts" ? (
        <PodcastLibraryScreen
          currentEpisode={episode}
          onSeries={openSeries}
          onPlay={(item) => playEpisode(item, "podcasts")}
          onEpisodeQuiz={startEpisodeQuiz}
          onRequireAuth={() => requireAuth("Đăng nhập để thêm tập vào playlist.")}
        />
      ) : null}

      {screen === "series" ? (
        <SeriesDetailScreen
          seriesSlug={seriesSlug}
          currentEpisodeId={episode?.id}
          isPlaying={playback.isPlaying}
          onBack={() => setScreen("podcasts")}
          onPlay={(item) => playEpisode(item, "series")}
          onEpisodeQuiz={startEpisodeQuiz}
        />
      ) : null}

      {screen === "player" && episode ? (
        <AudioPlayerScreen
          libraryError={libraryError}
          queueNavigation={playbackQueue?.ownerId === user?.id && playbackQueue ? { index: playbackQueue.index, total: playbackQueue.tracks.length, busy: libraryBusy, onPrevious: () => void playQueueIndex(playbackQueue, playbackQueue.index - 1, -1, "player"), onNext: () => void playQueueIndex(playbackQueue, playbackQueue.index + 1, 1, "player") } : undefined}
          episode={episode}
          narrationId={currentNarrationId}
          onSelectNarration={setSelectedNarrationId}
          onBack={() => setScreen(playerReturn)}
          playback={playback}
        />
      ) : null}

      {screen === "quizzes" ? (
        <QuizListScreen onPlayEpisodeQuiz={startEpisodeQuiz} />
      ) : null}

      {screen === "episodeQuiz" && quizEpisode ? (
        <EpisodeQuizScreen
          episode={quizEpisode}
          signedIn={Boolean(user)}
          onBack={() => setScreen(quizReturn)}
          onRequireAuth={() => requireAuth("Đăng nhập để nộp bài quiz và tích lũy XP.")}
        />
      ) : null}

      {screen === "profile" ? (
        <ProfileScreen
          onEditProfile={() => router.push("/profile")}
          onLogin={() => requireAuth()}
          onPlayHistoryItem={(item) => void playHistoryEpisode(item, "profile")}
          onViewListeningHistory={() => { setListeningHistoryPage(1); setListeningHistoryStatus("all"); setHistoryOpenError(null); setScreen("listeningHistory"); }}
          openingEpisodeId={openingHistoryEpisodeId}
          historyOpenError={historyOpenError}
          onViewTopQuizzes={() => { setTopQuizzesPage(1); setQuizOpenError(null); setScreen("topQuizzes"); }}
          onOpenQuiz={(item) => void openTopQuiz(item, "profile")}
          onExploreQuizzes={() => setScreen("quizzes")}
          openingQuizId={openingQuizId} quizOpenError={quizOpenError}
          period={rankingPeriod} onPeriod={setRankingPeriod}
          onViewRanking={(scope) => { setRankingScope(scope); setRankingPage(1); setLibraryError(null); setScreen("rankings"); }}
          onPlayRanking={(slug) => void openLibraryEpisode(slug)}
          onViewPlaylists={() => { setAddingEpisodeId(null); setPlaylistsReturn("profile"); setLibraryError(null); setScreen("playlists"); }}
          onOpenPlaylist={(id) => { setAddingEpisodeId(null); setPlaylistsReturn("profile"); setSelectedPlaylistId(id); setPlaylistPage(1); setLibraryError(null); setScreen("playlistDetail"); }}
          libraryError={libraryError}
        />
      ) : null}

      {screen === "listeningHistory" ? <ListeningHistoryScreen
        page={listeningHistoryPage} status={listeningHistoryStatus}
        onPageChange={(page) => { setListeningHistoryPage(page); setHistoryOpenError(null); }}
        onStatusChange={(status) => { setListeningHistoryStatus(status); setListeningHistoryPage(1); setHistoryOpenError(null); }}
        onBack={() => { setHistoryOpenError(null); setScreen("profile"); }}
        onLogin={() => requireAuth("Đăng nhập để xem lịch sử nghe của bạn.")}
        onExplore={() => setScreen("podcasts")}
        onPlay={(item) => void playHistoryEpisode(item, "listeningHistory")}
        openingEpisodeId={openingHistoryEpisodeId} openError={historyOpenError}
      /> : null}

      {screen === "topQuizzes" ? <TopQuizzesScreen
        page={topQuizzesPage} onPage={(page) => { setTopQuizzesPage(page); setQuizOpenError(null); }}
        onBack={() => { setQuizOpenError(null); setScreen("profile"); }}
        onLogin={() => requireAuth("Đăng nhập để xem top quiz cá nhân.")}
        onExplore={() => setScreen("quizzes")}
        onOpen={(item) => void openTopQuiz(item, "topQuizzes")}
        openingId={openingQuizId} openError={quizOpenError}
      /> : null}

      {screen === "rankings" ? <RankingsScreen scope={rankingScope} period={rankingPeriod} page={rankingPage} onPeriod={(period) => { setRankingPeriod(period); setRankingPage(1); }} onPage={setRankingPage} onBack={() => setScreen("profile")} onPlay={(slug) => void openLibraryEpisode(slug)} onLogin={() => requireAuth()} error={libraryError} /> : null}
      {screen === "playlists" ? <PlaylistsScreen addingEpisodeId={addingEpisodeId} onBack={() => { if (screenRef.current === "playlists") setScreen(playlistsReturn); }} onLogin={() => requireAuth()} onOpen={(id) => { setSelectedPlaylistId(id); setPlaylistPage(1); setLibraryError(null); setScreen("playlistDetail"); }} /> : null}
      {screen === "playlistDetail" && selectedPlaylistId ? <PlaylistDetailScreen key={selectedPlaylistId} id={selectedPlaylistId} page={playlistPage} onPage={setPlaylistPage} onBack={() => { if (screenRef.current === "playlistDetail" && selectedPlaylistRef.current === selectedPlaylistId) setScreen("playlists"); }} onLogin={() => requireAuth()} onPlay={(id) => void startPlaylist(id)} onPlayTrack={(id, episodeId) => void startPlaylist(id, episodeId)} mode={playlistMode?.id === selectedPlaylistId ? playlistMode.mode : "normal"} onCycleMode={() => { const mode = nextPlaylistMode(playlistMode?.id === selectedPlaylistId ? playlistMode.mode : "normal"); setPlaylistMode({ id: selectedPlaylistId, mode }); setPlaybackQueue((queue) => { if (!queue || queue.playlistId !== selectedPlaylistId) return queue; const currentId = queue.tracks[queue.index]?.episodeId; const tracks = playlistOrder(queue.originalTracks, mode, currentId); const index = tracks.findIndex((item) => item.episodeId === currentId); return index < 0 ? null : { ...queue, tracks, index, mode }; }); }} onSaved={(originalTracks) => setPlaybackQueue((queue) => { if (!queue || queue.playlistId !== selectedPlaylistId) return queue; const currentId = queue.tracks[queue.index]?.episodeId; const tracks = playlistOrder(originalTracks, queue.mode, currentId); const index = tracks.findIndex((track) => track.episodeId === currentId); return index < 0 ? null : { ...queue, originalTracks, tracks, index }; })} error={libraryError} busy={libraryBusy} /> : null}

      {screen === "login" ? (
        <LoginScreen
          onBack={() => setScreen(loginReturn)}
          onSuccess={onLoginSuccess}
          reason={loginReason}
        />
      ) : null}
    </AppShell>
  );
}
