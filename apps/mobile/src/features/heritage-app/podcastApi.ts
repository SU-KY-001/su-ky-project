// Kết nối API thật của apps/api (public library + listening + quiz), cùng các schema dùng chung với web.
import type { ImageSourcePropType } from "react-native";
import {
  HistoricalPeriodSchema,
  LibraryEpisodeSchema,
  LibrarySeriesDetailSchema,
  LibrarySeriesSchema,
  ListeningHistoryItemSchema,
  ListeningProgressUpdateResultSchema,
  MyWeeklyMissionsSchema,
  PlaybackSchema,
  PublicHistoricalEventSchema,
  PublicQuizSchema,
  PublicReleasesSchema,
  QuizAttemptResultSchema,
  paginatedSchema,
  type HistoricalPeriodDto,
  type PublicHistoricalEventDto,
} from "@repo/shared";
import { z } from "zod";
import { apiClient } from "@/lib/client";
import { art } from "./data";

export type { HistoricalPeriodDto, PublicHistoricalEventDto };
export type PublicQuiz = z.infer<typeof PublicQuizSchema>;
export type QuizAttemptResult = z.infer<typeof QuizAttemptResultSchema>;
export type MyWeeklyMissions = z.infer<typeof MyWeeklyMissionsSchema>;
export type ListeningProgressResult = z.infer<typeof ListeningProgressUpdateResultSchema>;
export type ReleaseItem = z.infer<typeof PublicReleasesSchema>["items"][number];

export interface NarrationChoice {
  id: string;
  type: "FIRST_PERSON" | "THIRD_PERSON";
  durationMs: number | null;
}

export interface PodcastSeries {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover: ImageSourcePropType;
  hero: ImageSourcePropType;
  episodeCount: number;
  startYear: number | null;
  endYear: number | null;
}

export interface PodcastEpisode {
  id: string;
  slug: string;
  seriesSlug: string;
  seriesTitle: string;
  number: number;
  title: string;
  description: string;
  publishedAt: Date | null;
  durationMs: number | null;
  posterUrl: string | null;
  image: ImageSourcePropType;
  /** Bản thu đầu tiên đã sẵn sàng; null nếu tập chưa có audio. */
  narrationId: string | null;
  narrations: NarrationChoice[];
}

export interface SeriesDetail extends PodcastSeries {
  creator: string | null;
  episodes: PodcastEpisode[];
  totalMs: number;
  historicalEvent?: { id: string; name: string };
}

export interface PlaybackInfo {
  narrationId: string;
  assetId: string;
  url: string;
  durationMs: number;
  positionMs: number;
  playedBitmap: string;
  syncIntervalMs: number;
}

export interface ListeningHistoryEntry {
  episodeId: string;
  episodeSlug: string;
  episodeTitle: string;
  seriesSlug: string;
  seriesTitle: string;
  lastNarrationId: string;
  lastPositionMs: number;
  percent: number;
  isCompleted: boolean;
}

export interface CachedEpisodePayload {
  id: string;
  slug: string;
  seriesSlug: string;
  seriesTitle: string;
  number: number;
  title: string;
  description: string;
  publishedAt: string | null;
  durationMs: number | null;
  posterUrl: string | null;
  narrationId: string | null;
  narrations?: NarrationChoice[];
}

const fallbackArt = [art.bachDangHero, art.haiBaTrungHero, art.dienBienPhuHero, art.doiMoiHero];
const fallbackCards = [art.bachDangCard, art.haiBaTrungCard, art.dienBienPhuCard, art.doiMoiCard];
const hash = (value: string): number => [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
const asImage = (url: string | undefined | null, fallback: ImageSourcePropType): ImageSourcePropType => (url ? { uri: url } : fallback);

export function fallbackEventImage(slug: string, hero = false): ImageSourcePropType {
  const pick = hash(slug);
  const pool = hero ? fallbackArt : fallbackCards;
  return pool[pick % pool.length];
}

export function serializeEpisode(episode: PodcastEpisode): CachedEpisodePayload {
  return {
    id: episode.id,
    slug: episode.slug,
    seriesSlug: episode.seriesSlug,
    seriesTitle: episode.seriesTitle,
    number: episode.number,
    title: episode.title,
    description: episode.description,
    publishedAt: episode.publishedAt ? episode.publishedAt.toISOString() : null,
    durationMs: episode.durationMs,
    posterUrl: episode.posterUrl,
    narrationId: episode.narrationId,
    narrations: episode.narrations,
  };
}

export function restoreCachedEpisode(payload: CachedEpisodePayload): PodcastEpisode {
  const pick = hash(payload.seriesSlug || payload.slug);
  return {
    id: payload.id,
    slug: payload.slug,
    seriesSlug: payload.seriesSlug,
    seriesTitle: payload.seriesTitle,
    number: payload.number,
    title: payload.title,
    description: payload.description,
    publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null,
    durationMs: payload.durationMs,
    posterUrl: payload.posterUrl,
    image: asImage(payload.posterUrl, fallbackCards[(pick + payload.number) % fallbackCards.length]),
    narrationId: payload.narrationId,
    narrations: payload.narrations ?? (payload.narrationId ? [{ id: payload.narrationId, type: "THIRD_PERSON", durationMs: payload.durationMs }] : []),
  };
}

const SeriesPageSchema = paginatedSchema(LibrarySeriesSchema);
const ExtendedSeriesDetailSchema = LibrarySeriesDetailSchema.extend({
  coverLandscape: z.object({ url: z.string() }).nullable().optional(),
  startYear: z.number().nullable().optional(),
  endYear: z.number().nullable().optional(),
});
const EventsPageSchema = paginatedSchema(PublicHistoricalEventSchema);
const HistoryPageSchema = paginatedSchema(ListeningHistoryItemSchema);
const HistoryEpisodeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  series: z.object({ slug: z.string(), title: z.string() }),
});

function toSeries(item: z.infer<typeof LibrarySeriesSchema>): PodcastSeries {
  const pick = hash(item.slug);
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description ?? "",
    cover: asImage(item.cover?.url ?? item.coverLandscape?.url, fallbackCards[pick % fallbackCards.length]),
    hero: asImage(item.coverLandscape?.url ?? item.cover?.url, fallbackArt[pick % fallbackArt.length]),
    episodeCount: item.episodeCount,
    startYear: item.startYear,
    endYear: item.endYear,
  };
}

function toDetail(data: z.infer<typeof ExtendedSeriesDetailSchema>): SeriesDetail {
  const pick = hash(data.slug);
  const cover = data.cover?.url;
  const landscape = data.coverLandscape?.url;
  const episodes = [...data.episodes]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map<PodcastEpisode>((episode, index) => {
      const allNarrations = episode.narrations.map<NarrationChoice>((item) => ({
        id: item.id,
        type: item.type,
        durationMs: item.durationMs ?? 1696000,
      }));
      const availableOnly = allNarrations.filter((item, i) => episode.narrations[i]?.available);
      const chosen = availableOnly[0] ?? allNarrations[0];
      const posterUrl = episode.poster?.url ?? cover ?? landscape ?? null;
      return {
        id: episode.id,
        slug: episode.slug,
        seriesSlug: data.slug,
        seriesTitle: data.title,
        number: index + 1,
        title: episode.title,
        description: episode.description ?? "",
        publishedAt: episode.publishedAt ?? null,
        durationMs: chosen?.durationMs ?? 1696000,
        posterUrl,
        image: asImage(posterUrl, fallbackCards[(pick + index) % fallbackCards.length]),
        narrationId: chosen?.id ?? episode.id,
        narrations: allNarrations.length > 0 ? allNarrations : [{ id: episode.id, type: "THIRD_PERSON", durationMs: 1696000 }],
      };
    });
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    description: data.description ?? "",
    cover: asImage(cover ?? landscape, fallbackCards[pick % fallbackCards.length]),
    hero: asImage(landscape ?? cover, fallbackArt[pick % fallbackArt.length]),
    episodeCount: episodes.length,
    startYear: data.startYear ?? null,
    endYear: data.endYear ?? null,
    creator: data.creator?.name ?? null,
    episodes,
    totalMs: episodes.reduce((sum, episode) => sum + (episode.durationMs ?? 0), 0),
    historicalEvent: data.historicalEvent,
  };
}

export const podcastApi = {
  async listSeries(filter?: { periodId?: string; phaseId?: string; eventId?: string; page?: number }): Promise<PodcastSeries[]> {
    const { data } = await apiClient.get("/api/series", {
      params: {
        page: filter?.page ?? 1,
        limit: 20,
        periodId: filter?.periodId,
        historicalPhaseId: filter?.phaseId,
        eventId: filter?.eventId,
      },
    });
    return SeriesPageSchema.parse(data).items.map(toSeries);
  },
  async getSeries(slug: string): Promise<SeriesDetail> {
    const { data } = await apiClient.get(`/api/series/${encodeURIComponent(slug)}`);
    return toDetail(ExtendedSeriesDetailSchema.parse(data));
  },
  async getEpisode(slug: string): Promise<z.infer<typeof LibraryEpisodeSchema>> {
    const { data } = await apiClient.get(`/api/episodes/${encodeURIComponent(slug)}`);
    return LibraryEpisodeSchema.parse(data);
  },
  async latestEpisodes(limit = 6): Promise<PodcastEpisode[]> {
    const list = await podcastApi.listSeries();
    const details = await Promise.all(list.slice(0, 6).map((item) => podcastApi.getSeries(item.slug)));
    return details
      .flatMap((detail) => detail.episodes)
      .filter((episode) => Boolean(episode.narrationId))
      .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
      .slice(0, limit);
  },
  async listEpisodeQuizzes(): Promise<PodcastEpisode[]> {
    const episodes = await podcastApi.latestEpisodes(20);
    const checks = await Promise.all(
      episodes.map(async (episode) => {
        try {
          const detail = await podcastApi.getEpisode(episode.slug);
          return detail.hasQuiz ? episode : null;
        } catch {
          return null;
        }
      }),
    );
    return checks.filter((item): item is PodcastEpisode => item !== null);
  },
  async playback(narrationId: string): Promise<PlaybackInfo> {
    const { data } = await apiClient.get(`/api/narrations/${narrationId}/playback`);
    const parsed = PlaybackSchema.parse(data);
    const progress = parsed.progress as { positionMs?: number; playedBitmap?: string } | null;
    return {
      narrationId,
      assetId: parsed.audio.assetId,
      url: parsed.audio.url,
      durationMs: parsed.audio.durationMs,
      positionMs: progress?.positionMs ?? 0,
      playedBitmap: progress?.playedBitmap ?? "",
      syncIntervalMs: parsed.sync.intervalMs,
    };
  },
  async saveProgress(narrationId: string, body: { assetId: string; positionMs: number; playedBitmap: string }): Promise<ListeningProgressResult> {
    const { data } = await apiClient.put(`/api/me/listening-progress/${narrationId}`, body);
    return ListeningProgressUpdateResultSchema.parse(data);
  },
  async listeningHistory(): Promise<ListeningHistoryEntry[]> {
    const { data } = await apiClient.get("/api/me/listening-history", { params: { page: 1, limit: 10, status: "all" } });
    return HistoryPageSchema.parse(data)
      .items.map<ListeningHistoryEntry | null>((item) => {
        const ep = HistoryEpisodeSchema.safeParse(item.episode);
        if (!ep.success) return null;
        return {
          episodeId: ep.data.id,
          episodeSlug: ep.data.slug,
          episodeTitle: ep.data.title,
          seriesSlug: ep.data.series.slug,
          seriesTitle: ep.data.series.title,
          lastNarrationId: item.lastNarrationId,
          lastPositionMs: item.lastPositionMs,
          percent: item.percent,
          isCompleted: item.isCompleted,
        };
      })
      .filter((item): item is ListeningHistoryEntry => item !== null);
  },
  async weeklyMissions(): Promise<MyWeeklyMissions> {
    const { data } = await apiClient.get("/api/me/weekly-missions");
    return MyWeeklyMissionsSchema.parse(data);
  },
  async releases(from: Date, to: Date): Promise<ReleaseItem[]> {
    const { data } = await apiClient.get("/api/showcase/releases", {
      params: { from: from.toISOString(), to: to.toISOString() },
    });
    return PublicReleasesSchema.parse(data).items;
  },
  async periods(): Promise<HistoricalPeriodDto[]> {
    const { data } = await apiClient.get("/api/historical-periods");
    return z.object({ items: z.array(HistoricalPeriodSchema) }).parse(data).items;
  },
  async events(filter?: { periodId?: string; phaseId?: string; page?: number }): Promise<PublicHistoricalEventDto[]> {
    const { data } = await apiClient.get("/api/historical-events", {
      params: { page: filter?.page ?? 1, limit: 20, periodId: filter?.periodId, phaseId: filter?.phaseId },
    });
    return EventsPageSchema.parse(data).items;
  },
  async quiz(episodeSlug: string): Promise<PublicQuiz> {
    const { data } = await apiClient.get(`/api/episodes/${encodeURIComponent(episodeSlug)}/quiz`);
    return PublicQuizSchema.parse(data);
  },
  async attempt(quizId: string, answers: { questionId: string; optionId: string }[], idempotencyKey: string): Promise<QuizAttemptResult> {
    const { data } = await apiClient.post(`/api/quizzes/${quizId}/attempts`, { answers }, { headers: { "Idempotency-Key": idempotencyKey } });
    return QuizAttemptResultSchema.parse(data);
  },
};

export function formatDuration(ms: number | null): string {
  if (!ms) return "--:--";
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

export function formatDateVi(date: Date | null): string {
  if (!date) return "";
  return `${date.getDate()} tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
}

export function createUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}
