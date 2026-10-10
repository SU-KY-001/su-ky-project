import { getSystemConfig } from "../../../core/config/system-config";
import type { MediaStorageGateway } from "../../media";
import type {
  EpisodeNarrationDetailEntity,
  EpisodeWorkspaceEntity,
  SeriesDetailEntity,
  SeriesListItemEntity,
  SeriesSourceWithSourceEntity,
} from "../domain/content.entity";

export function mapSeriesSource(item: SeriesSourceWithSourceEntity, storage?: MediaStorageGateway) {
  const { fileAsset, ...source } = item.source;
  return {
    id: item.id, sortOrder: item.sortOrder, locator: item.locator, excerpt: item.excerpt,
    source: { ...source, fileUrl: fileAsset ? (storage?.deliveryUrl(fileAsset) ?? null) : null },
  };
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
    audio: narration.audioAsset ? {
      assetId: narration.audioAsset.id, durationMs: narration.audioAsset.durationMs,
      sizeBytes: narration.audioAsset.sizeBytes ? Number(narration.audioAsset.sizeBytes) : null,
      format: narration.audioAsset.format, previewUrl: storage?.deliveryUrl(narration.audioAsset) ?? null, attachedAt: narration.audioAttachedAt,
    } : null,
    warnings, updatedAt: narration.updatedAt,
  };
}

export function seriesChecklist(series: SeriesDetailEntity) {
  const items = [
    { key: "TOPIC", ok: Boolean(series.topicId) }, { key: "HISTORICAL_PHASE", ok: Boolean(series.historicalPhaseId) },
    { key: "YEAR_RANGE", ok: series.startYear != null && series.endYear != null && series.startYear <= series.endYear },
    { key: "HAS_SOURCE", ok: series.sources.length > 0 },
    { key: "HAS_PUBLISHED_EPISODE", ok: series.episodes.some((episode) => episode.status === "PUBLISHED") },
  ];
  return { ready: items.every((item) => item.ok), items };
}

export function episodeChecklist(episode: EpisodeWorkspaceEntity) {
  const third = episode.narrations.find((item) => item.narrationType === "THIRD_PERSON");
  const items = [
    { key: "BASIC_INFO", ok: Boolean(episode.title.trim()) },
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
    topic: series.topic, historicalPhase: series.historicalPhase, startYear: series.startYear, endYear: series.endYear,
    cover: series.coverImageAsset ? { assetId: series.coverImageAsset.id, url: storage?.deliveryUrl(series.coverImageAsset) ?? null } : null,
    owner: series.owner, publishedAt: series.publishedAt, updatedAt: series.updatedAt, publishChecklist: seriesChecklist(series),
    sources: series.sources.map((item) => mapSeriesSource(item, storage)),
    episodes: series.episodes.map((episode) => {
      const third = episode.narrations.find((item) => item.narrationType === "THIRD_PERSON");
      return { id: episode.id, title: episode.title, slug: episode.slug, sortOrder: episode.sortOrder, status: episode.status,
        progress: { hasThirdPersonScript: Boolean(third?.scriptContent?.trim()), hasThirdPersonAudio: third?.audioAsset?.status === "READY", isPublished: episode.status === "PUBLISHED" } };
    }),
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
    entityTags: episode.entityTags.map(mapEntityTag), publishChecklist: episodeChecklist(episode),
  };
}
