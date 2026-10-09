import { getSystemConfig } from "../../../core/config/system-config";
import type { MediaStorageGateway } from "../../media";
import type {
  EpisodeNarrationDetailEntity,
  EpisodeWorkspaceEntity,
  SeriesDetailEntity,
  SeriesListItemEntity,
} from "../domain/content.entity";

export function mapEpisodeSource(item: {
  id: string; sortOrder: number; locator: string; excerpt: string | null; origin: "AI" | "MODERATOR";
  source: { id: string; tier: string; title: string; author: string | null; publicationYear: number | null; url: string | null };
}) {
  return item;
}

export function mapEntityTag(item: {
  id: string; status: string; origin: string;
  entity: { id: string; entityType: string; name: string };
}) {
  return item;
}

export async function mapNarration(
  narration: EpisodeNarrationDetailEntity,
  storage?: MediaStorageGateway
) {
  const content = narration.scriptContent ?? "";
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const wordsPerMinute = await getSystemConfig("script.words_per_minute");
  const mismatchRatio = await getSystemConfig("narration.duration_mismatch_ratio");
  const estimatedDurationMs = wordCount ? Math.round((wordCount / wordsPerMinute) * 60_000) : 0;
  const warnings: Array<{ key: string; ratio?: number }> = [];
  if (narration.scriptUpdatedAt && narration.audioAttachedAt && narration.scriptUpdatedAt > narration.audioAttachedAt) warnings.push({ key: "SCRIPT_CHANGED_AFTER_AUDIO" });
  if (narration.audioAsset?.durationMs && estimatedDurationMs) {
    const ratio = narration.audioAsset.durationMs / estimatedDurationMs;
    if (Math.abs(narration.audioAsset.durationMs - estimatedDurationMs) / estimatedDurationMs > mismatchRatio) warnings.push({ key: "DURATION_MISMATCH", ratio });
  }
  return {
    id: narration.id, type: narration.narrationType, narrator: narration.narratorEntity ?? null,
    scriptContent: narration.scriptContent, wordCount, estimatedDurationMs,
    origin: narration.scriptPublicationId ? { kind: "AI", scriptPublicationId: narration.scriptPublicationId, episodeNo: narration.scriptPublicationEpisodeNo } : { kind: "MANUAL" },
    audio: narration.audioAsset ? {
      assetId: narration.audioAsset.id, provider: narration.audioProvider, durationMs: narration.audioAsset.durationMs,
      sizeBytes: narration.audioAsset.sizeBytes ? Number(narration.audioAsset.sizeBytes) : null,
      format: narration.audioAsset.format, previewUrl: storage?.deliveryUrl(narration.audioAsset) ?? null, attachedAt: narration.audioAttachedAt,
    } : null,
    warnings, updatedAt: narration.updatedAt,
  };
}

export function seriesChecklist(series: SeriesDetailEntity) {
  const items = [
    { key: "TOPIC", ok: Boolean(series.topicId) }, { key: "HISTORICAL_PERIOD", ok: Boolean(series.historicalPeriodId) },
    { key: "YEAR_RANGE", ok: series.startYear != null && series.endYear != null && series.startYear <= series.endYear },
    { key: "HAS_PUBLISHED_EPISODE", ok: series.episodes.some((episode) => episode.status === "PUBLISHED") },
  ];
  return { ready: items.every((item) => item.ok), items };
}

export function episodeChecklist(episode: EpisodeWorkspaceEntity) {
  const third = episode.narrations.find((item) => item.narrationType === "THIRD_PERSON");
  const items = [
    { key: "BASIC_INFO", ok: Boolean(episode.title.trim()) }, { key: "HAS_SOURCE", ok: episode.sources.length > 0 },
    { key: "THIRD_PERSON_SCRIPT", ok: Boolean(third?.scriptContent?.trim()) }, { key: "THIRD_PERSON_AUDIO", ok: third?.audioAsset?.status === "READY" },
  ];
  const warnings: Array<{ key: string; count?: number }> = [];
  if (episode.series.status !== "PUBLISHED") warnings.push({ key: "SERIES_NOT_PUBLISHED" });
  const unconfirmed = episode.entityTags.filter((tag) => tag.status !== "CONFIRMED").length;
  if (unconfirmed) warnings.push({ key: "ENTITY_TAGS_UNCONFIRMED", count: unconfirmed });
  return { ready: items.every((item) => item.ok), items, warnings };
}

export function mapSeriesDetail(series: SeriesDetailEntity, storage?: MediaStorageGateway) {
  return {
    id: series.id, title: series.title, slug: series.slug, description: series.description, status: series.status,
    isDeleted: Boolean(series.deletedAt), lock: series.adminLockedAt ? { lockedAt: series.adminLockedAt, lockedBy: series.adminLockedById } : null,
    topic: series.topic, historicalPeriod: series.historicalPeriod, startYear: series.startYear, endYear: series.endYear,
    cover: series.coverImageAsset ? { assetId: series.coverImageAsset.id, url: storage?.deliveryUrl(series.coverImageAsset) ?? null } : null,
    owner: series.owner, publishedAt: series.publishedAt, updatedAt: series.updatedAt, publishChecklist: seriesChecklist(series),
    episodes: series.episodes.map((episode) => {
      const third = episode.narrations.find((item) => item.narrationType === "THIRD_PERSON");
      return { id: episode.id, title: episode.title, slug: episode.slug, sortOrder: episode.sortOrder, status: episode.status,
        progress: { hasSource: episode._count.sources > 0, hasThirdPersonScript: Boolean(third?.scriptContent?.trim()), hasThirdPersonAudio: third?.audioAsset?.status === "READY", isPublished: episode.status === "PUBLISHED" } };
    }),
    pendingAiRuns: series.workflowRuns.map((run) => ({ runId: run.id, status: run.status, awaitingStep: run.status === "WAITING_FOR_HUMAN" ? run.currentStep : null, createdAt: run.createdAt })),
  };
}

export function mapSeriesListItem(series: SeriesListItemEntity, storage?: MediaStorageGateway) {
  return { id: series.id, title: series.title, slug: series.slug, status: series.status, isDeleted: Boolean(series.deletedAt),
    lock: series.adminLockedAt ? { lockedAt: series.adminLockedAt, lockedBy: series.adminLockedById } : null,
    cover: series.coverImageAsset ? { assetId: series.coverImageAsset.id, url: storage?.deliveryUrl(series.coverImageAsset) ?? null } : null,
    startYear: series.startYear, endYear: series.endYear,
    episodeCounts: { published: series.episodes.filter((episode) => episode.status === "PUBLISHED").length, total: series.episodes.length }, updatedAt: series.updatedAt };
}

export async function mapWorkspace(episode: EpisodeWorkspaceEntity, storage?: MediaStorageGateway) {
  return {
    id: episode.id, seriesId: episode.seriesId, seriesTitle: episode.series.title, seriesStatus: episode.series.status,
    title: episode.title, slug: episode.slug, description: episode.description, sortOrder: episode.sortOrder, status: episode.status,
    isDeleted: Boolean(episode.deletedAt), lock: episode.adminLockedAt ? { lockedAt: episode.adminLockedAt, lockedBy: episode.adminLockedById } : null,
    publishedAt: episode.publishedAt, updatedAt: episode.updatedAt,
    narrations: await Promise.all(episode.narrations.map((item) => mapNarration(item, storage))),
    sources: episode.sources.map(mapEpisodeSource), entityTags: episode.entityTags.map(mapEntityTag), publishChecklist: episodeChecklist(episode),
  };
}
