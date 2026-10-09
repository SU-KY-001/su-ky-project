import type { z } from "zod";
import { ListeningHistoryQuerySchema, PublicSeriesListQuerySchema, UpdateListeningProgressRequestSchema } from "@repo/shared";
import { getSystemConfig } from "../../../core/config/system-config";
import { DomainError } from "../../../core/errors/domain-error";
import { audioMimeType, type MediaStorageGateway } from "../../media";
import type { ListeningRepository } from "../domain/listening.repository";

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const VN_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const MS_PER_SECOND = 1000;
const BITS_PER_BYTE = 8;
const PERCENT_CAP = 100;

type UpdateProgressInput = z.infer<typeof UpdateListeningProgressRequestSchema>;
type SeriesListQuery = z.infer<typeof PublicSeriesListQuerySchema>;
type HistoryQuery = z.infer<typeof ListeningHistoryQuerySchema>;

function countBits(bytes: Uint8Array): number {
  let total = 0;
  for (const byte of bytes) { let value = byte; while (value) { total += value & 1; value >>>= 1; } }
  return total;
}

/** UTC midnight of the Monday of `now`'s week in Vietnam (UTC+7). */
function mondayInVietnam(now: Date): Date {
  const local = new Date(now.getTime() + VN_TIMEZONE_OFFSET_MS);
  const day = local.getUTCDay() || DAYS_PER_WEEK;
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - day + 1));
}

export class ListeningService {
  constructor(private readonly repo: ListeningRepository, private readonly storage: MediaStorageGateway) {}

  async playback(narrationId: string, userId: string) {
    const narration = await this.repo.findPublicNarration(narrationId);
    if (!narration?.audioAsset?.durationMs) throw new DomainError(404, "CONTENT_UNAVAILABLE", "Narration audio is not available");
    const saved = await this.repo.findProgress(userId, narrationId);
    const progress = saved
      ? {
          assetId: narration.audioAsset.id,
          positionMs: saved.audioAssetId === narration.audioAsset.id ? saved.positionMs : 0,
          playedBitmap: saved.audioAssetId === narration.audioAsset.id ? Buffer.from(saved.playedBitmap).toString("base64") : "",
          playedSeconds: saved.audioAssetId === narration.audioAsset.id ? saved.playedSeconds : 0,
          percent: saved.audioAssetId === narration.audioAsset.id ? Math.min(PERCENT_CAP, saved.playedSeconds / Math.ceil(narration.audioAsset.durationMs / MS_PER_SECOND) * PERCENT_CAP) : 0,
          completedAt: saved.completedAt,
        }
      : null;
    const [intervalMs, completionThreshold] = await Promise.all([getSystemConfig("listening.sync_interval_ms"), getSystemConfig("listening.completion_ratio")]);
    return {
      narrationId,
      episodeId: narration.episodeId,
      audio: { assetId: narration.audioAsset.id, url: this.storage.deliveryUrl(narration.audioAsset), mimeType: audioMimeType(narration.audioAsset.format), durationMs: narration.audioAsset.durationMs },
      progress,
      sync: { intervalMs, completionThreshold },
    };
  }

  async getProgress(narrationId: string, userId: string) {
    const progress = await this.repo.findProgressWithAudio(userId, narrationId);
    if (!progress) throw new DomainError(404, "NOT_FOUND", "Listening progress not found");
    return {
      assetId: progress.audioAssetId,
      positionMs: progress.positionMs,
      playedBitmap: Buffer.from(progress.playedBitmap).toString("base64"),
      playedSeconds: progress.playedSeconds,
      percent: Math.min(PERCENT_CAP, progress.playedSeconds / Math.ceil((progress.audioAsset.durationMs ?? 1) / MS_PER_SECOND) * PERCENT_CAP),
      completedAt: progress.completedAt,
    };
  }

  async updateProgress(narrationId: string, userId: string, input: UpdateProgressInput) {
    const narration = await this.repo.findPublicNarration(narrationId);
    if (!narration?.audioAsset?.durationMs) throw new DomainError(404, "CONTENT_UNAVAILABLE", "Narration audio is not available");
    if (input.assetId !== narration.audioAsset.id) throw new DomainError(409, "AUDIO_CHANGED", "Episode audio changed; reload playback");
    if (input.positionMs > narration.audioAsset.durationMs) throw new DomainError(422, "PROGRESS_INVALID", "Position exceeds audio duration");
    if (!BASE64_PATTERN.test(input.playedBitmap)) throw new DomainError(422, "PROGRESS_INVALID", "Played bitmap is not valid base64");
    const requested = Buffer.from(input.playedBitmap, "base64");
    const totalSeconds = Math.ceil(narration.audioAsset.durationMs / MS_PER_SECOND);
    const expectedBytes = Math.ceil(totalSeconds / BITS_PER_BYTE);
    if (requested.length > expectedBytes) throw new DomainError(422, "PROGRESS_INVALID", "Played bitmap exceeds audio duration");
    const padded = new Uint8Array(expectedBytes);
    padded.set(requested);
    const unusedBits = expectedBytes * BITS_PER_BYTE - totalSeconds;
    if (unusedBits > 0) padded[expectedBytes - 1] &= (1 << (BITS_PER_BYTE - unusedBits)) - 1;

    // Policy numbers are read up front so the repository unit of work stays mechanics-only.
    const [syncInterval, maxRate, tolerance, completionRatio, xpPerEpisodeCompletion] = await Promise.all([
      getSystemConfig("listening.sync_interval_ms"),
      getSystemConfig("listening.max_playback_rate"),
      getSystemConfig("listening.tolerance_intervals"),
      getSystemConfig("listening.completion_ratio"),
      getSystemConfig("xp.episode_completion"),
    ]);
    const now = new Date();
    const result = await this.repo.applyProgress({
      userId,
      narrationId,
      episodeId: narration.episodeId,
      assetId: narration.audioAsset.id,
      positionMs: input.positionMs,
      bitmap: padded,
      totalSeconds,
      now,
      weekStartDate: mondayInVietnam(now),
      xpPerEpisodeCompletion,
      completionRatio,
      budget: (elapsedSeconds: number) => Math.ceil(elapsedSeconds * maxRate) + Math.ceil((syncInterval / MS_PER_SECOND) * maxRate * tolerance),
      merge: (stored: Uint8Array, allowed: number) => {
        for (let bit = 0; bit < totalSeconds; bit += 1) {
          const byte = Math.floor(bit / BITS_PER_BYTE);
          const mask = 1 << (bit % BITS_PER_BYTE);
          if ((padded[byte]! & mask) !== 0 && (stored[byte]! & mask) === 0 && allowed-- > 0) stored[byte] |= mask;
        }
        return { bitmap: stored, playedSeconds: countBits(stored) };
      },
    });
    return {
      narrationId,
      positionMs: result.positionMs,
      playedSeconds: result.playedSeconds,
      percent: Math.min(PERCENT_CAP, result.playedSeconds / totalSeconds * PERCENT_CAP),
      completedAt: result.completedAt,
      completion: result.completion,
    };
  }

  async listSeries(query: SeriesListQuery) {
    const { items, total } = await this.repo.listPublicSeries(query);
    return {
      items: items.map((series) => ({
        id: series.id,
        slug: series.slug,
        title: series.title,
        description: series.description,
        startYear: series.startYear,
        endYear: series.endYear,
        cover: series.coverImageAsset ? { url: this.storage.deliveryUrl(series.coverImageAsset) } : null,
        episodeCount: series._count.episodes,
        publishedAt: series.publishedAt,
      })),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async getSeriesDetail(slug: string, userId: string | null) {
    const series = await this.repo.findPublicSeriesBySlug(slug);
    if (!series) throw new DomainError(404, "NOT_FOUND", "Series not found");
    const progress = userId ? await this.repo.findProgressByEpisodeIds(userId, series.episodes.map((episode) => episode.id)) : [];
    return {
      id: series.id,
      slug: series.slug,
      title: series.title,
      description: series.description,
      startYear: series.startYear,
      endYear: series.endYear,
      cover: series.coverImageAsset ? { url: this.storage.deliveryUrl(series.coverImageAsset) } : null,
      episodes: series.episodes.map((episode) => ({
        id: episode.id,
        slug: episode.slug,
        title: episode.title,
        sortOrder: episode.sortOrder,
        narrations: episode.narrations.map((narration) => ({
          id: narration.id,
          type: narration.narrationType,
          durationMs: narration.audioAsset?.durationMs ?? null,
          available: narration.audioAsset?.status === "READY",
        })),
        viewer: userId
          ? {
              isCompleted: progress.some((item) => item.episodeId === episode.id && item.completedAt),
              progress: progress.filter((item) => item.episodeId === episode.id).map((item) => ({ narrationId: item.narrationId, positionMs: item.positionMs, completedAt: item.completedAt })),
            }
          : null,
      })),
    };
  }

  async getEpisodeDetail(slug: string, userId: string | null) {
    const episode = await this.repo.findPublicEpisodeBySlug(slug);
    if (!episode) throw new DomainError(404, "NOT_FOUND", "Episode not found");
    const index = episode.series.episodes.findIndex((item) => item.id === episode.id);
    const saved = userId ? await this.repo.findProgressForEpisode(userId, episode.id) : [];
    return {
      id: episode.id,
      slug: episode.slug,
      title: episode.title,
      description: episode.description,
      publishedAt: episode.publishedAt,
      series: {
        id: episode.series.id,
        slug: episode.series.slug,
        title: episode.series.title,
        startYear: episode.series.startYear,
        endYear: episode.series.endYear,
        cover: episode.series.coverImageAsset ? { url: this.storage.deliveryUrl(episode.series.coverImageAsset) } : null,
      },
      narrations: episode.narrations.map((item) => ({
        id: item.id,
        type: item.narrationType,
        narrator: item.narratorEntity,
        durationMs: item.audioAsset?.durationMs ?? null,
        available: item.audioAsset?.status === "READY",
      })),
      sources: episode.sources.map((item) => ({ title: item.source.title, author: item.source.author, tier: item.source.tier, locator: item.locator, url: item.source.url })),
      entities: episode.entityTags.map((item) => item.entity),
      previousEpisode: index > 0 ? episode.series.episodes[index - 1] : null,
      nextEpisode: index >= 0 && index < episode.series.episodes.length - 1 ? episode.series.episodes[index + 1] : null,
      hasQuiz: Boolean(episode.quiz),
      viewer: userId
        ? {
            isCompleted: saved.some((item) => item.completedAt),
            progress: saved.map((item) => ({
              narrationId: item.narrationId,
              positionMs: item.positionMs,
              percent: Math.min(PERCENT_CAP, item.playedSeconds / Math.ceil((item.audioAsset.durationMs ?? 1) / MS_PER_SECOND) * PERCENT_CAP),
              completedAt: item.completedAt,
            })),
          }
        : null,
    };
  }

  async getHistory(userId: string, { page, limit, status }: HistoryQuery) {
    const rows = await this.repo.listListeningHistory(userId);
    const grouped = new Map<string, typeof rows[number]>();
    for (const row of rows) if (!grouped.has(row.episodeId)) grouped.set(row.episodeId, row);
    const all = [...grouped.values()].map((row) => {
      const episodeRows = rows.filter((item) => item.episodeId === row.episodeId);
      const isCompleted = episodeRows.some((item) => item.completedAt);
      const available = row.episode.status === "PUBLISHED" && !row.episode.deletedAt && row.episode.series.status === "PUBLISHED" && !row.episode.series.deletedAt;
      return {
        episode: { id: row.episode.id, slug: row.episode.slug, title: row.episode.title, available, series: { slug: row.episode.series.slug, title: row.episode.series.title } },
        lastListenedAt: row.lastListenedAt,
        lastNarrationId: row.narrationId,
        lastPositionMs: row.positionMs,
        percent: Math.max(...episodeRows.map((item) => Math.min(PERCENT_CAP, item.playedSeconds / Math.ceil((item.audioAsset.durationMs ?? 1) / MS_PER_SECOND) * PERCENT_CAP))),
        isCompleted,
      };
    }).filter((item) => status === "all" || (status === "completed" ? item.isCompleted : !item.isCompleted));
    return { items: all.slice((page - 1) * limit, page * limit), page, limit, total: all.length };
  }
}
