import type {
  ContentStatus,
  EpisodeEntity,
  EpisodeAttachmentEntity,
  EpisodeEntityTagEntity,
  EpisodeEntityTagWithEntityEntity,
  EpisodeNarrationDetailEntity,
  EpisodeNarrationEntity,
  EpisodeWithSeriesEntity,
  EpisodeWorkspaceEntity,
  HistoricalEntityEntity,
  MediaAssetEntity,
  NarrationType,
  SeriesDetailEntity,
  SeriesEntity,
  SeriesListItemEntity,
  SeriesReviewSourceEntity,
  SeriesSourceEntity,
  SeriesSourceWithSourceEntity,
} from "./content.entity";
import type { AudioAnalysis, EditorDocument } from "@repo/shared";
import type { EpisodePublishGate } from "../application/publication-gate";

export interface CreateSeriesDraftInput {
  ownerId: string;
  title: string;
  slug?: string;
  description?: string | null;
  language?: string;
  topicId?: string | null;
  historicalPhaseId?: string | null;
  primaryHistoricalEventId?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  coverImageAssetId?: string | null;
  coverLandscapeAssetId?: string | null;
}

export interface CreateSeriesInput extends CreateSeriesDraftInput {
  /** Audit metadata for the `series.created` entry written inside the adapter transaction. */
  actorId: string;
  ipAddress: string | null;
}

export interface SeriesPatch {
  title?: string;
  slug?: string;
  description?: string | null;
  language?: string;
  topicId?: string | null;
  historicalPhaseId?: string | null;
  primaryHistoricalEventId?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  coverImageAssetId?: string | null;
  coverLandscapeAssetId?: string | null;
}

export interface UpdateSeriesInput {
  id: string;
  patch: SeriesPatch;
  /** Detached (dated) when it differs from the incoming cover asset. */
  previousCoverImageAssetId: string | null;
  previousCoverLandscapeAssetId: string | null;
  before: SeriesEntity;
  after: SeriesPatch;
  actorId: string;
  ipAddress: string | null;
}

export interface SeriesListFilter {
  ownerId: string | null;
  viewerId?: string | null;
  status: ContentStatus | "TRASH" | null;
  q: string | null;
  page: number;
  limit: number;
}

export interface AppendEpisodeInput {
  title: string;
  slug?: string;
}

export interface AppendEpisodeResult {
  episodeId: string;
  narrationId: string;
  title: string;
}

export interface EpisodePatch {
  title?: string;
  slug?: string;
  description?: string | null;
}

export interface UpsertNarrationInput {
  episodeId: string;
  narrationType: NarrationType;
  /** Passed through verbatim: `undefined` keeps the stored content (Prisma semantics). */
  scriptContent?: string | null;
  scriptDocument?: EditorDocument | null;
  narratorEntityId: string | null;
}

export interface AttachAudioInput {
  previousAudioAssetId: string | null;
  assetId: string;
  analysis?: AudioAnalysis;
}

export interface UpdateEntityTagInput {
  status: "CONFIRMED" | "REJECTED";
  confirmedById: string | null;
  confirmedAt: Date | null;
}

export interface SeriesRepository {
  findSeriesById(id: string): Promise<SeriesEntity | null>;
  isActiveReleaseCollaboratorForSeries?(seriesId: string, moderatorId: string): Promise<boolean>;
  isActiveReleaseCollaboratorForEpisode?(episodeId: string, moderatorId: string): Promise<boolean>;
  getSeriesDetail(id: string): Promise<SeriesDetailEntity | null>;
  findSeriesUpdatedAt(id: string): Promise<Date | null>;
  /** True when another series already holds `slug` (excluding `excludeId`). */
  seriesSlugConflict(slug: string, excludeId: string): Promise<boolean>;
  findMediaAsset(id: string): Promise<MediaAssetEntity | null>;
  historicalPhaseExists(id: string): Promise<boolean>;
  listSeries(
    filter: SeriesListFilter,
  ): Promise<{ items: SeriesListItemEntity[]; total: number }>;
  /** Bare unique-slug draft creation (import flow; no audit, no cover bookkeeping). */
  createSeriesDraft(input: CreateSeriesDraftInput): Promise<SeriesEntity>;
  /** Transactional creation: draft + cover detach/reattach + `series.created` audit. */
  createSeries(input: CreateSeriesInput): Promise<SeriesEntity>;
  /** Transactional update: cover detach/reattach + series update + `series.updated` audit. */
  updateSeries(input: UpdateSeriesInput): Promise<void>;
  publishSeriesWithEvidence(
    actorId: string,
    id: string,
    baseUpdatedAt: Date,
  ): Promise<void>;
  resolveHistoricalCitation(
    seriesId: string,
    citationId: string,
  ): Promise<{
    sourceId: string;
    locator: string;
    excerpt: string | null;
    historicalCitationId: string;
  }>;
  publishSeries(id: string, publishedAt: Date): Promise<void>;
  hideSeries(id: string): Promise<void>;
  trashSeries(id: string, statusBeforeDelete: ContentStatus): Promise<void>;
  restoreSeries(id: string, restoredStatus: ContentStatus): Promise<void>;

  listSeriesSources(seriesId: string): Promise<SeriesSourceWithSourceEntity[]>;
  /** Read-only view for AI review: one row per source of the series, in sortOrder. */
  listReviewSources(seriesId: string): Promise<SeriesReviewSourceEntity[]>;
  /** False when the (seriesId, sourceId, locator) duplicate made `skipDuplicates` drop the row. */
  createSeriesSource(
    seriesId: string,
    input: {
      sourceId: string;
      locator: string;
      excerpt?: string | null;
      historicalCitationId?: string;
    },
  ): Promise<boolean>;
  findCreatedSeriesSource(
    seriesId: string,
    sourceId: string,
    locator: string,
  ): Promise<SeriesSourceWithSourceEntity>;
  findSeriesSource(
    seriesId: string,
    childId: string,
  ): Promise<SeriesSourceEntity | null>;
  updateSeriesSource(
    childId: string,
    patch: { locator?: string; excerpt?: string | null },
  ): Promise<SeriesSourceWithSourceEntity>;
  countSeriesSources(seriesId: string): Promise<number>;
  deleteSeriesSource(seriesId: string, childId: string): Promise<void>;
  listSeriesSourceIds(seriesId: string): Promise<string[]>;
  /** Transactional unit: one sortOrder update per source id. */
  reorderSeriesSources(orderedIds: string[]): Promise<void>;
}

export interface EpisodeRepository {
  findEpisodeWithSeries(id: string): Promise<EpisodeWithSeriesEntity | null>;
  getEpisodeWorkspace(id: string): Promise<EpisodeWorkspaceEntity | null>;
  findEpisodeUpdatedAt(id: string): Promise<Date | null>;
  /** True when another episode already holds `slug` (excluding `excludeId`). */
  episodeSlugConflict(slug: string, excludeId: string): Promise<boolean>;
  listActiveEpisodeIds(seriesId: string): Promise<string[]>;
  /** Transactional unit: sort-order aggregation + unique-slug inserts + narration rows. */
  appendEpisodes(
    seriesId: string,
    inputs: AppendEpisodeInput[],
  ): Promise<AppendEpisodeResult[]>;
  /** Transactional unit: one sortOrder update per episode id + series updatedAt stamp. */
  reorderEpisodes(orderedIds: string[], seriesId: string): Promise<void>;
  updateEpisode(id: string, patch: EpisodePatch): Promise<void>;
  /** `gate` is evaluated inside the publish transaction together with evidence validity and the timestamp lock. */
  publishEpisodeWithEvidence(
    actorId: string | null,
    id: string,
    baseUpdatedAt: Date,
    gate: EpisodePublishGate,
  ): Promise<void>;
  publishEpisode(id: string, publishedAt: Date): Promise<void>;
  hideEpisode(id: string): Promise<void>;
  trashEpisode(id: string, statusBeforeDelete: ContentStatus): Promise<void>;
  restoreEpisode(id: string, restoredStatus: ContentStatus): Promise<void>;

  listEpisodeAttachments(episodeId: string): Promise<EpisodeAttachmentEntity[]>;
  setEpisodePoster(episodeId: string, assetId: string | null, fileName: string): Promise<void>;
  findEpisodeAttachment(
    episodeId: string,
    attachmentId: string,
  ): Promise<EpisodeAttachmentEntity | null>;
  findEpisodeAttachmentUsingAsset(
    assetId: string,
  ): Promise<EpisodeAttachmentEntity | null>;
  attachEpisodeDocument(input: {
    episodeId: string;
    mediaAssetId: string;
    fileName: string;
  }): Promise<EpisodeAttachmentEntity>;
  detachEpisodeDocument(attachmentId: string): Promise<void>;

  findNarrationByType(
    episodeId: string,
    narrationType: NarrationType,
  ): Promise<EpisodeNarrationDetailEntity | null>;
  findNarrationUpdatedAt(id: string): Promise<Date | null>;
  upsertNarration(
    input: UpsertNarrationInput,
  ): Promise<EpisodeNarrationDetailEntity>;
  findNarrationUsingAsset(
    assetId: string,
    excludeNarrationId: string,
  ): Promise<EpisodeNarrationEntity | null>;
  /** Transactional unit: detach previous asset, attach new one, stamp the narration. */
  attachAudio(
    narrationId: string,
    input: AttachAudioInput,
  ): Promise<EpisodeNarrationDetailEntity>;
  /** Transactional unit: detach asset + clear narration audio fields. */
  detachAudio(narrationId: string, audioAssetId: string | null): Promise<void>;
  /** Transactional unit: detach asset + delete the narration row. */
  deleteNarration(
    narrationId: string,
    audioAssetId: string | null,
  ): Promise<void>;

  findHistoricalEntity(id: string): Promise<HistoricalEntityEntity | null>;

  listEpisodeEntityTags(
    episodeId: string,
  ): Promise<EpisodeEntityTagWithEntityEntity[]>;
  upsertEpisodeEntityTag(
    episodeId: string,
    entityId: string,
    confirmedById: string,
  ): Promise<EpisodeEntityTagWithEntityEntity>;
  findEpisodeEntityTag(
    episodeId: string,
    childId: string,
  ): Promise<EpisodeEntityTagEntity | null>;
  updateEpisodeEntityTag(
    childId: string,
    patch: UpdateEntityTagInput,
  ): Promise<EpisodeEntityTagWithEntityEntity>;
  deleteEpisodeEntityTag(episodeId: string, childId: string): Promise<void>;
}

export type {
  EpisodeAttachmentEntity,
  EpisodeEntity,
  EpisodeEntityTagEntity,
  EpisodeEntityTagWithEntityEntity,
  EpisodeNarrationDetailEntity,
  EpisodeNarrationEntity,
  EpisodeWithSeriesEntity,
  EpisodeWorkspaceEntity,
  HistoricalEntityEntity,
  MediaAssetEntity,
  SeriesDetailEntity,
  SeriesEntity,
  SeriesListItemEntity,
  SeriesReviewSourceEntity,
  SeriesSourceEntity,
  SeriesSourceWithSourceEntity,
};
