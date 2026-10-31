import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { AppShell, type MainTab } from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { screenForTab, tabForScreen } from "./appLogic";
import {
  podcastApi,
  restoreCachedEpisode,
  serializeEpisode,
  type CachedEpisodePayload,
  type PodcastEpisode,
  type PublicHistoricalEventDto,
} from "./podcastApi";
import { quizSets, type QuizSet } from "./quizData";
import { LoginScreen, ProfileScreen, ScheduleScreen } from "./screens/AccountScreens";
import { DiscoveryScreen } from "./screens/DiscoveryScreen";
import { EventDetailScreen, HistoryScreen } from "./screens/HistoryScreens";
import { AudioPlayerScreen, PodcastLibraryScreen, SeriesDetailScreen } from "./screens/PodcastScreens";
import {
  EpisodeQuizScreen,
  QuizIntroScreen,
  QuizListScreen,
  QuizPlayScreen,
  QuizResultScreen,
} from "./screens/QuizScreens";
import type { AppScreen } from "./types";
import { usePlayback } from "./usePlayback";

const LAST_EPISODE_KEY = "suky.playback.lastEpisode";

export function HeritageApp(): React.JSX.Element {
  const { user, hydrate } = useAuthStore();
  const [screen, setScreen] = useState<AppScreen>("discovery");
  const [quiz, setQuiz] = useState<QuizSet>(quizSets[0]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [score, setScore] = useState(0);

  const [seriesSlug, setSeriesSlug] = useState("viet-nam-thoi-phong-kien");
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [selectedNarrationId, setSelectedNarrationId] = useState<string | null>(null);
  const [autoplayToken, setAutoplayToken] = useState(0);
  const [playerReturn, setPlayerReturn] = useState<AppScreen>("podcasts");

  const [quizEpisode, setQuizEpisode] = useState<PodcastEpisode | null>(null);
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
  );

  const activeTab = tabForScreen(screen);
  const hideTabs = ["event", "series", "player", "quizIntro", "question", "result", "episodeQuiz", "login"].includes(screen);
  const dark = screen === "player";

  const changeTab = (tab: MainTab): void => setScreen(screenForTab(tab));

  const resetQuiz = (target: QuizSet): void => {
    setQuiz(target);
    setQuestionIndex(0);
    setSelectedId(undefined);
    setScore(0);
  };

  const openQuizSet = (target: QuizSet): void => {
    resetQuiz(target);
    setScreen("quizIntro");
  };

  const playQuiz = (): void => setScreen("question");

  const startEpisodeQuiz = (target: PodcastEpisode): void => {
    setQuizEpisode(target);
    setScreen("episodeQuiz");
  };

  const openSeries = (slug: string): void => {
    setSeriesSlug(slug);
    setScreen("series");
  };

  const playEpisode = (target: PodcastEpisode, from: AppScreen): void => {
    if (!target.narrationId) return;
    setEpisode(target);
    setSelectedNarrationId(target.narrationId);
    setAutoplayToken((v) => v + 1);
    setPlayerReturn(from);
    setScreen("player");
    void AsyncStorage.setItem(LAST_EPISODE_KEY, JSON.stringify(serializeEpisode(target))).catch(() => undefined);
  };

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

  const retryQuiz = (): void => {
    resetQuiz(quiz);
    setScreen("question");
  };

  const chooseAnswer = (optionId: string): void => {
    if (selectedId) return;
    setSelectedId(optionId);
    if (optionId === quiz.questions[questionIndex].correctOptionId) setScore((val) => val + 1);
  };

  const nextQuestion = (): void => {
    if (questionIndex === quiz.questions.length - 1) {
      setScreen("result");
      return;
    }
    setQuestionIndex((val) => val + 1);
    setSelectedId(undefined);
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
            setHistoryPeriodId(periodId);
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

      {screen === "event" ? (
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
        <QuizListScreen
          onPlayQuizSet={openQuizSet}
          onPlayEpisodeQuiz={startEpisodeQuiz}
        />
      ) : null}

      {screen === "quizIntro" ? (
        <QuizIntroScreen
          quiz={quiz}
          onBack={() => setScreen("quizzes")}
          onStart={playQuiz}
        />
      ) : null}

      {screen === "question" ? (
        <QuizPlayScreen
          quiz={quiz}
          index={questionIndex}
          selectedId={selectedId}
          onSelect={chooseAnswer}
          onNext={nextQuestion}
          onExit={() => setScreen("quizzes")}
        />
      ) : null}

      {screen === "result" ? (
        <QuizResultScreen
          quiz={quiz}
          score={score}
          onRetry={retryQuiz}
          onClose={() => setScreen("quizzes")}
        />
      ) : null}

      {screen === "episodeQuiz" && quizEpisode ? (
        <EpisodeQuizScreen
          episode={quizEpisode}
          signedIn={Boolean(user)}
          onBack={() => setScreen("quizzes")}
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
          onLogin={() => requireAuth()}
          onSchedule={() => setScreen("schedule")}
          onPlayEpisodeSlug={playEpisodeBySlug}
        />
      ) : null}

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
