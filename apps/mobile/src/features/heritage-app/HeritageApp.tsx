import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { AppShell, type MainTab } from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { screenForTab, tabForScreen } from "./appLogic";
import {
  podcastApi,
  fallbackEventImage,
  restoreCachedEpisode,
  serializeEpisode,
  type CachedEpisodePayload,
  type PodcastEpisode,
  type PublicHistoricalEventDto,
} from "./podcastApi";
import { LoginScreen, ScheduleScreen } from "./screens/AccountScreens";
import { ProfileScreen } from "./screens/ProfileScreen";
import { DiscoveryScreen } from "./screens/DiscoveryScreen";
import { EventDetailScreen, HistoryScreen } from "./screens/HistoryScreens";
import { AudioPlayerScreen, PodcastLibraryScreen, SeriesDetailScreen } from "./screens/PodcastScreens";
import { EpisodeQuizScreen, QuizListScreen, type QuizEpisodeSummary } from "./screens/QuizScreens";
import type { AppScreen } from "./types";
import { usePlayback, type HistoryResumeRequest } from "./usePlayback";
import { ListeningHistoryScreen, type ListeningHistoryItem, type ListeningHistoryStatus } from "@/features/listening-history";
import { TopQuizzesScreen, type TopQuizItem } from "@/features/top-quizzes";

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

  const [quizEpisode, setQuizEpisode] = useState<QuizEpisodeSummary | null>(null);
  const [quizReturn, setQuizReturn] = useState<AppScreen>("quizzes");
  const [topQuizzesPage, setTopQuizzesPage] = useState(1);
  const [openingQuizId, setOpeningQuizId] = useState<string | null>(null);
  const [quizOpenError, setQuizOpenError] = useState<string | null>(null);
  const quizOpeningLock = useRef(false);
  const [selectedEvent, setSelectedEvent] = useState<PublicHistoricalEventDto | null>(null);
  const [historyPeriodId, setHistoryPeriodId] = useState<string | undefined>();

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
    void AsyncStorage.getItem(LAST_EPISODE_KEY)
      .then((saved) => {
        if (!active) return;
        if (saved) {
          try {
            const restored = restoreCachedEpisode(JSON.parse(saved) as CachedEpisodePayload);
            void podcastApi
              .getSeries(restored.seriesSlug)
              .then((detail) => {
                if (!active) return;
                const current = detail.episodes.find((item) => item.slug === restored.slug) ?? restored;
                setEpisode(current);
                setSelectedNarrationId(current.narrationId);
              })
              .catch(() => {
                if (!active) return;
                setEpisode(restored);
                setSelectedNarrationId(restored.narrationId);
              });
            return;
          } catch {
            // fallback tải từ API bên dưới
          }
        }
        void podcastApi.latestEpisodes(1).then((latest) => {
          if (!active) return;
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
  const hideTabs = ["event", "series", "player", "episodeQuiz", "login", "listeningHistory", "topQuizzes"].includes(screen);
  const dark = screen === "player";

  const changeTab = (tab: MainTab): void => setScreen(screenForTab(tab));

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
    setEpisode(target);
    setSelectedNarrationId(narrationId);
    setResumeRequest(resume ? { ...resume, token: ++resumeToken.current } : null);
    setAutoplayToken((v) => v + 1);
    setPlayerReturn(from);
    setScreen("player");
    void AsyncStorage.setItem(LAST_EPISODE_KEY, JSON.stringify(serializeEpisode(target))).catch(() => undefined);
  };

  const playHistoryEpisode = async (item: ListeningHistoryItem, from: "profile" | "listeningHistory"): Promise<void> => {
    if (!user) { requireAuth("Đăng nhập để tiếp tục nghe và lưu hành trình."); return; }
    if (openingHistory.current || !item.episode.available) return;
    const ownerId = user.id;
    openingHistory.current = true;
    setOpeningHistoryEpisodeId(item.episode.id);
    setHistoryOpenError(null);
    try {
      const detail = await podcastApi.getSeries(item.episode.series.slug);
      if (screenRef.current !== from || useAuthStore.getState().user?.id !== ownerId) return;
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

  const playEpisodeBySlug = async (slug: string): Promise<void> => {
    try {
      const ep = await podcastApi.getEpisode(slug);
      const detail = await podcastApi.getSeries(ep.series?.slug ?? "viet-nam-thoi-phong-kien");
      const matched = detail.episodes.find((item) => item.slug === slug);
      if (matched) {
        playEpisode(matched, screen);
      }
    } catch {
      // nếu không tìm thấy thì mở thư viện
      setScreen("podcasts");
    }
  };

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
      return;
    }
    setScreen(loginReturn);
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={changeTab}
      hideTabs={hideTabs}
      extendBottom={screen === "login"}
      dark={dark}
      miniPlayer={
        episode
          ? {
              artwork: episode.image,
              title: episode.title,
              subtitle: `Sử Ký · ${episode.seriesTitle} · Tập ${episode.number}`,
              playback,
              onOpen: () => openPlayer(screen),
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
          onPlayer={() => openPlayer("discovery")}
          onSchedule={() => setScreen("schedule")}
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
          episode={episode}
          narrationId={currentNarrationId}
          onSelectNarration={setSelectedNarrationId}
          onBack={() => setScreen(playerReturn)}
          onQuiz={() => startEpisodeQuiz(episode)}
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

      {screen === "schedule" ? (
        <ScheduleScreen
          onBack={() => setScreen("profile")}
          onPlayEpisode={playEpisodeBySlug}
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
