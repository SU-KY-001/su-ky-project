import { client } from "@/lib/client";
import { ApiError } from "@/lib/apiError";

export interface SeriesListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  startYear: number;
  endYear: number | null;
  cover: { url: string } | null;
  coverLandscape: { url: string } | null;
  episodeCount: number;
  publishedAt: string;
}

export interface SeriesListResponse {
  items: SeriesListItem[];
  page: number;
  limit: number;
  total: number;
}

export interface SeriesListFilters {
  q?: string;
  fromYear?: number;
  toYear?: number;
}

export interface NarrationBrief {
  id: string;
  type: string;
  durationMs: number | null;
  available: boolean;
}

export interface EpisodeBrief {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  narrations: NarrationBrief[];
  viewer: {
    isCompleted: boolean;
    progress: { narrationId: string; positionMs: number; completedAt: string | null }[];
  } | null;
}

export interface SourceItem {
  title: string;
  author: string | null;
  tier: string;
  locator: string;
  url: string | null;
  fileUrl: string | null;
}

export interface SeriesDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  startYear: number;
  endYear: number | null;
  cover: { url: string } | null;
  coverLandscape: { url: string } | null;
  sources: SourceItem[];
  evidenceAsOf: string | null;
  evidenceWarning: string | null;
  episodes: EpisodeBrief[];
}

export interface EpisodeDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  hasQuiz: boolean;
  series: {
    id: string;
    slug: string;
    title: string;
    startYear: number;
    endYear: number | null;
    cover: { url: string } | null;
    coverLandscape: { url: string } | null;
    sources: SourceItem[];
    evidenceAsOf: string | null;
    evidenceWarning: string | null;
  };
  narrations: {
    id: string;
    type: string;
    narrator: { id: string; name: string } | null;
    durationMs: number | null;
    available: boolean;
  }[];
  entities: { id: string; name: string; entityType: string }[];
  previousEpisode: { id: string; slug: string; title: string } | null;
  nextEpisode: { id: string; slug: string; title: string } | null;
  viewer: {
    isCompleted: boolean;
    progress: { narrationId: string; positionMs: number; percent: number; completedAt: string | null }[];
  } | null;
}

export interface PlaybackResponse {
  narrationId: string;
  episodeId: string;
  audio: {
    assetId: string;
    url: string;
    mimeType: string;
    durationMs: number;
  };
  progress: {
    assetId: string;
    positionMs: number;
    playedBitmap: string;
    playedSeconds: number;
    percent: number;
    completedAt: string | null;
  } | null;
  sync: {
    intervalMs: number;
    completionThreshold: number;
  };
}

export interface UpdateProgressBody {
  assetId: string;
  positionMs: number;
  playedBitmap: string;
}

export interface HistoryItem {
  episode: {
    id: string;
    slug: string;
    title: string;
    available: boolean;
    series: { slug: string; title: string };
  };
  lastListenedAt: string;
  lastNarrationId: string;
  lastPositionMs: number;
  percent: number;
  isCompleted: boolean;
}

export interface QuizOption {
  id: string;
  label: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  sortOrder: number;
  options: QuizOption[];
}

export interface EpisodeQuiz {
  id: string;
  episodeId: string;
  passScorePercent: number;
  questions: QuizQuestion[];
}

export interface QuizAttemptResult {
  id: string;
  quizId: string;
  scorePercent: number;
  isPassed: boolean;
  xpAwarded: number;
  totalXp: number;
  answers: {
    questionId: string;
    selectedOptionId: string;
    correctOptionId: string;
    isCorrect: boolean;
    explanation: string | null;
  }[];
}

export interface WeeklyMission {
  id: string;
  title: string;
  activityType: "COMPLETE_EPISODE" | "PASS_QUIZ";
  targetCount: number;
  progressCount: number;
  xpReward: number;
  completedAt: string | null;
  weekStartDate: string;
  weekEndDate: string;
  status: "IN_PROGRESS" | "COMPLETED" | "EXPIRED";
}

export interface WeeklyMissionsResponse {
  weekStartDate: string;
  weekEndDate: string;
  totalXp: number;
  items: WeeklyMission[];
}

export interface MonthlyMissionReview {
  month: string;
  weeks: WeeklyMissionsResponse[];
  completedCount: number;
  expiredCount: number;
  totalCount: number;
}

export function weeksOverlappingMonth(month: string): string[] {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return [];
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  const day = firstDay.getUTCDay();
  const monday = new Date(firstDay);
  monday.setUTCDate(firstDay.getUTCDate() + (day === 0 ? -6 : 1 - day));

  const dates: string[] = [];
  for (const cursor = monday; cursor <= lastDay; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates;
}

async function apiGet(res: Response) {
  if (!res.ok) throw await ApiError.fromResponse(res);
  return res.json();
}

async function fetchWeeklyMissions(weekStartDate?: string): Promise<WeeklyMissionsResponse> {
  const res = await client.api.me["weekly-missions"].$get({
    query: weekStartDate ? { weekStartDate } : {},
  });
  return apiGet(res as unknown as Response) as Promise<WeeklyMissionsResponse>;
}

export const listeningService = {
  /** Danh sách series */
  listSeries: async (page = 1, limit = 20, filters: SeriesListFilters = {}): Promise<SeriesListResponse> => {
    const res = await client.api.series.$get({
      query: {
        page: String(page),
        limit: String(limit),
        ...(filters.q ? { q: filters.q } : {}),
        ...(filters.fromYear !== undefined ? { fromYear: String(filters.fromYear) } : {}),
        ...(filters.toYear !== undefined ? { toYear: String(filters.toYear) } : {}),
      },
    });
    return apiGet(res as unknown as Response) as Promise<SeriesListResponse>;
  },

  /** Chi tiết series + episodes */
  getSeriesDetail: async (slug: string): Promise<SeriesDetail> => {
    const res = await client.api.series[":slug"].$get({ param: { slug } });
    return apiGet(res as unknown as Response) as Promise<SeriesDetail>;
  },

  /** Chi tiết episode */
  getEpisodeDetail: async (slug: string): Promise<EpisodeDetail> => {
    const res = await client.api.episodes[":slug"].$get({ param: { slug } });
    return apiGet(res as unknown as Response) as Promise<EpisodeDetail>;
  },

  /** Lấy signed audio URL + tiến độ saved */
  playback: async (narrationId: string): Promise<PlaybackResponse> => {
    const res = await client.api.narrations[":narrationId"].playback.$get({ param: { narrationId } });
    return apiGet(res as unknown as Response) as Promise<PlaybackResponse>;
  },

  /** Gửi tiến độ nghe */
  updateProgress: async (narrationId: string, body: UpdateProgressBody) => {
    const res = await client.api.me["listening-progress"][":narrationId"].$put({
      param: { narrationId },
      json: body,
    });
    return apiGet(res as unknown as Response);
  },

  /** Lấy tiến độ nghe của 1 narration */
  getProgress: async (narrationId: string) => {
    const res = await client.api.me["listening-progress"][":narrationId"].$get({ param: { narrationId } });
    return apiGet(res as unknown as Response);
  },

  /** Lịch sử nghe */
  getHistory: async (
    page = 1,
    limit = 20,
    status: "all" | "completed" | "in_progress" = "all",
  ): Promise<{ items: HistoryItem[]; page: number; limit: number; total: number }> => {
    const res = await client.api.me["listening-history"].$get({
      query: { page: String(page), limit: String(limit), status },
    });
    return apiGet(res as unknown as Response) as Promise<{
      items: HistoryItem[];
      page: number;
      limit: number;
      total: number;
    }>;
  },

  /** Lấy bài trắc nghiệm của tập */
  getQuiz: async (slug: string): Promise<EpisodeQuiz> => {
    const res = await client.api.episodes[":slug"].quiz.$get({ param: { slug } });
    return apiGet(res as unknown as Response) as Promise<EpisodeQuiz>;
  },

  /** Nộp bài trắc nghiệm */
  submitQuizAttempt: async (
    quizId: string,
    answers: { questionId: string; optionId: string }[],
    idempotencyKey: string,
  ): Promise<QuizAttemptResult> => {
    const res = await client.api.quizzes[":quizId"].attempts.$post({
      param: { quizId },
      json: { answers },
    }, {
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return apiGet(res as unknown as Response) as Promise<QuizAttemptResult>;
  },

  /** Nhiệm vụ nghe và quiz của tuần hiện tại */
  getWeeklyMissions: async (weekStartDate?: string): Promise<WeeklyMissionsResponse> => {
    return fetchWeeklyMissions(weekStartDate);
  },

  getMonthlyMissionReview: async (month: string): Promise<MonthlyMissionReview> => {
    const weeks = await Promise.all(
      weeksOverlappingMonth(month).map(fetchWeeklyMissions),
    );
    const missions = weeks.flatMap((week) => week.items);
    return {
      month,
      weeks,
      completedCount: missions.filter((mission) => mission.status === "COMPLETED").length,
      expiredCount: missions.filter((mission) => mission.status === "EXPIRED").length,
      totalCount: missions.length,
    };
  },
};
