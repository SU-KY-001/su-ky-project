import type {
  AudioProvider,
  ContentStatus,
  EpisodeEntity,
  EpisodeEntityTagEntity,
  EpisodeEntityTagWithEntityEntity,
  EpisodeNarrationDetailEntity,
  EpisodeNarrationEntity,
  EpisodeNarrationWithPublicationEntity,
  EpisodeSourceEntity,
  EpisodeSourceWithSourceEntity,
  EpisodeWithSeriesEntity,
  EpisodeWorkspaceEntity,
  HistoricalEntityEntity,
  MediaAssetEntity,
  NarrationType,
  SeriesDetailEntity,
  SeriesEntity,
  SeriesListItemEntity,
} from "./content.entity";

export interface CreateSeriesDraftInput {
  ownerId: string;
  title: string;
  slug?: string;
  description?: string | null;
  topicId?: string | null;
  historicalPeriodId?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  coverImageAssetId?: string | null;
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
  topicId?: string | null;
  historicalPeriodId?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  coverImageAssetId?: string | null;
}

export interface UpdateSeriesInput {
  id: string;
  patch: SeriesPatch;
  /** Detached (dated) when it differs from the incoming cover asset. */
  previousCoverImageAssetId: string | null;
  before: SeriesEntity;
  after: SeriesPatch;
  actorId: string;
  ipAddress: string | null;
}

export interface SeriesListFilter {
  ownerId: string | null;
  status: ContentStatus | "TRASH" | null;
  q: string | null;
  page: number;
  limit: number;
}

export interface AppendEpisodeInput {
  title: string;
  slug?: string;
  thirdPersonScript?: { content: string; scriptPublicationId: number; episodeNo: number };
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
  narratorEntityId: string | null;
}

export interface AttachAudioInput {
  previousAudioAssetId: string | null;
  assetId: string;
  provider: AudioProvider;
}

export interface UpdateEntityTagInput {
  status: "CONFIRMED" | "REJECTED";
  confirmedById: string | null;
  confirmedAt: Date | null;
}

export interface SeriesRepository {
  findSeriesById(id: string): Promise<SeriesEntity | null>;
  getSeriesDetail(id: string): Promise<SeriesDetailEntity | null>;
  findSeriesUpdatedAt(id: string): Promise<Date | null>;
  /** True when another series already holds `slug` (excluding `excludeId`). */
  seriesSlugConflict(slug: string, excludeId: string): Promise<boolean>;
  findMediaAsset(id: string): Promise<MediaAssetEntity | null>;
  listSeries(filter: SeriesListFilter): Promise<{ items: SeriesListItemEntity[]; total: number }>;
  /** Bare unique-slug draft creation (import flow; no audit, no cover bookkeeping). */
  createSeriesDraft(input: CreateSeriesDraftInput): Promise<SeriesEntity>;
  /** Transactional creation: draft + cover detach/reattach + `series.created` audit. */
  createSeries(input: CreateSeriesInput): Promise<SeriesEntity>;
  /** Transactional update: cover detach/reattach + series update + `series.updated` audit. */
  updateSeries(input: UpdateSeriesInput): Promise<void>;
  publishSeries(id: string, publishedAt: Date): Promise<void>;
  hideSeries(id: string): Promise<void>;
  trashSeries(id: string, statusBeforeDelete: ContentStatus): Promise<void>;
  restoreSeries(id: string, restoredStatus: ContentStatus): Promise<void>;
}

export interface EpisodeRepository {
  findEpisodeWithSeries(id: string): Promise<EpisodeWithSeriesEntity | null>;
  getEpisodeWorkspace(id: string): Promise<EpisodeWorkspaceEntity | null>;
  findEpisodeUpdatedAt(id: string): Promise<Date | null>;
  /** True when another episode already holds `slug` (excluding `excludeId`). */
  episodeSlugConflict(slug: string, excludeId: string): Promise<boolean>;
  listActiveEpisodeIds(seriesId: string): Promise<string[]>;
  /** Transactional unit: sort-order aggregation + unique-slug inserts + narration rows. */
  appendEpisodes(seriesId: string, inputs: AppendEpisodeInput[]): Promise<AppendEpisodeResult[]>;
  /** Transactional unit: one sortOrder update per episode id + series updatedAt stamp. */
  reorderEpisodes(orderedIds: string[], seriesId: string): Promise<void>;
  updateEpisode(id: string, patch: EpisodePatch): Promise<void>;
  publishEpisode(id: string, publishedAt: Date): Promise<void>;
  hideEpisode(id: string): Promise<void>;
  trashEpisode(id: string, statusBeforeDelete: ContentStatus): Promise<void>;
  restoreEpisode(id: string, restoredStatus: ContentStatus): Promise<void>;

  findNarrationByType(episodeId: string, narrationType: NarrationType): Promise<EpisodeNarrationDetailEntity | null>;
  findNarrationUpdatedAt(id: string): Promise<Date | null>;
  upsertNarration(input: UpsertNarrationInput): Promise<EpisodeNarrationDetailEntity>;
  findNarrationWithPublication(episodeId: string, narrationType: NarrationType): Promise<EpisodeNarrationWithPublicationEntity | null>;
  findNarrationUsingAsset(assetId: string, excludeNarrationId: string): Promise<EpisodeNarrationEntity | null>;
  /** Transactional unit: detach previous asset, attach new one, stamp the narration. */
  attachAudio(narrationId: string, input: AttachAudioInput): Promise<EpisodeNarrationDetailEntity>;
  /** Transactional unit: detach asset + clear narration audio fields. */
  detachAudio(narrationId: string, audioAssetId: string | null): Promise<void>;
  /** Transactional unit: detach asset + delete the narration row. */
  deleteNarration(narrationId: string, audioAssetId: string | null): Promise<void>;

  findHistoricalEntity(id: string): Promise<HistoricalEntityEntity | null>;

  listEpisodeSources(episodeId: string): Promise<EpisodeSourceWithSourceEntity[]>;
  /** False when the (episodeId, sourceId, locator) duplicate made `skipDuplicates` drop the row. */
  createEpisodeSource(episodeId: string, input: { sourceId: string; locator: string; excerpt?: string | null }): Promise<boolean>;
  findCreatedEpisodeSource(episodeId: string, sourceId: string, locator: string): Promise<EpisodeSourceWithSourceEntity>;
  findEpisodeSource(episodeId: string, childId: string): Promise<EpisodeSourceEntity | null>;
  updateEpisodeSource(childId: string, patch: { locator?: string; excerpt?: string | null }): Promise<EpisodeSourceWithSourceEntity>;
  countEpisodeSources(episodeId: string): Promise<number>;
  deleteEpisodeSource(episodeId: string, childId: string): Promise<void>;
  listEpisodeSourceIds(episodeId: string): Promise<string[]>;
  /** Transactional unit: one sortOrder update per source id. */
  reorderEpisodeSources(orderedIds: string[]): Promise<void>;

  listEpisodeEntityTags(episodeId: string): Promise<EpisodeEntityTagWithEntityEntity[]>;
  upsertEpisodeEntityTag(episodeId: string, entityId: string, confirmedById: string): Promise<EpisodeEntityTagWithEntityEntity>;
  findEpisodeEntityTag(episodeId: string, childId: string): Promise<EpisodeEntityTagEntity | null>;
  updateEpisodeEntityTag(childId: string, patch: UpdateEntityTagInput): Promise<EpisodeEntityTagWithEntityEntity>;
  deleteEpisodeEntityTag(episodeId: string, childId: string): Promise<void>;
}

export type {
  EpisodeEntity,
  EpisodeEntityTagEntity,
  EpisodeEntityTagWithEntityEntity,
  EpisodeNarrationDetailEntity,
  EpisodeNarrationEntity,
  EpisodeNarrationWithPublicationEntity,
  EpisodeSourceEntity,
  EpisodeSourceWithSourceEntity,
  EpisodeWithSeriesEntity,
  EpisodeWorkspaceEntity,
  HistoricalEntityEntity,
  MediaAssetEntity,
  SeriesDetailEntity,
  SeriesEntity,
  SeriesListItemEntity,
};
