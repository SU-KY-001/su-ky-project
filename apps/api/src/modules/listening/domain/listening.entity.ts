/**
Pure, framework-free shapes mirroring the Prisma rows surfaced by the listening
module (see packages/db/prisma/schema.prisma for field nullability). No imports
from @repo/db — enums are string-literal unions matching the Prisma enums.
*/

export type ContentStatus = "DRAFT" | "PUBLISHED" | "HIDDEN";
export type NarrationType = "THIRD_PERSON" | "FIRST_PERSON";
export type MediaKind = "AUDIO" | "IMAGE" | "DOCUMENT";
export type MediaStatus = "PENDING" | "READY" | "DELETED";
export type HistoricalEntityType = "FIGURE" | "EVENT";
export type EntityTagStatus = "SUGGESTED" | "CONFIRMED" | "REJECTED";
export type TagOrigin = "AI" | "MODERATOR";
export type SourceTier = "TIER_1_CHINH_SU" | "TIER_2_KHAO_CO" | "TIER_3_KHOA_HOC" | "TIER_4_DA_SU";

export interface MediaAssetEntity {
  id: string;
  kind: MediaKind;
  publicId: string;
  status: MediaStatus;
  version: bigint | null;
  format: string | null;
  sizeBytes: bigint | null;
  durationMs: number | null;
  uploadedById: string;
  createdAt: Date;
  verifiedAt: Date | null;
  detachedAt: Date | null;
  deletedAt: Date | null;
}

export interface SeriesEntity {
  id: string;
  ownerId: string;
  topicId: string | null;
  historicalPhaseId: string | null;
  title: string;
  slug: string;
  description: string | null;
  coverImageAssetId: string | null;
  startYear: number | null;
  endYear: number | null;
  status: ContentStatus;
  statusBeforeDelete: ContentStatus | null;
  adminLockedAt: Date | null;
  adminLockedById: string | null;
  publishedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EpisodeEntity {
  id: string;
  seriesId: string;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  status: ContentStatus;
  statusBeforeDelete: ContentStatus | null;
  adminLockedAt: Date | null;
  adminLockedById: string | null;
  publishedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EpisodeNarrationEntity {
  id: string;
  episodeId: string;
  narrationType: NarrationType;
  narratorEntityId: string | null;
  scriptContent: string | null;
  audioAssetId: string | null;
  scriptUpdatedAt: Date | null;
  audioAttachedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SourceEntity {
  id: string;
  tier: SourceTier;
  title: string;
  originalTitle: string | null;
  author: string | null;
  translator: string | null;
  publisher: string | null;
  publicationYear: number | null;
  edition: string | null;
  isbn: string | null;
  url: string | null;
  createdById: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeriesSourceEntity {
  id: string;
  seriesId: string;
  sourceId: string;
  locator: string;
  excerpt: string | null;
  sortOrder: number;
  createdAt: Date;
}

export interface EpisodeEntityTagEntity {
  id: string;
  episodeId: string;
  entityId: string;
  status: EntityTagStatus;
  origin: TagOrigin;
  confirmedById: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
}

export interface ListeningProgressEntity {
  id: string;
  userId: string;
  narrationId: string;
  episodeId: string;
  audioAssetId: string;
  positionMs: number;
  playedBitmap: Uint8Array;
  playedSeconds: number;
  completedAt: Date | null;
  lastListenedAt: Date;
}

/* Query-result composites: base row plus the relations each use case includes. */

/** Public series list row: cover asset plus published-episode count. */
export interface SeriesWithCoverAndCount extends SeriesEntity {
  coverImageAsset: MediaAssetEntity | null;
  _count: { episodes: number };
}

/** Narration row with its (optional) READY-filtered audio asset. */
export interface NarrationWithAudio extends EpisodeNarrationEntity {
  audioAsset: MediaAssetEntity | null;
}

export interface EpisodeWithNarrations extends EpisodeEntity {
  narrations: NarrationWithAudio[];
}

/** /series/:slug row: cover asset plus all published episodes with narrations. */
export interface SeriesDetailEntity extends SeriesEntity {
  coverImageAsset: MediaAssetEntity | null;
  episodes: EpisodeWithNarrations[];
  sources: SeriesSourceWithSource[];
}

export interface NarratorRef {
  id: string;
  name: string;
}

export interface NarrationWithNarrator extends EpisodeNarrationEntity {
  narratorEntity: NarratorRef | null;
  audioAsset: MediaAssetEntity | null;
}

export interface SeriesSourceWithSource extends SeriesSourceEntity {
  source: SourceEntity & { fileAsset: Pick<MediaAssetEntity, "publicId" | "kind" | "version" | "format"> | null };
}

export interface EntityRef {
  id: string;
  entityType: HistoricalEntityType;
  name: string;
}

export interface EntityTagWithEntity extends EpisodeEntityTagEntity {
  entity: EntityRef;
}

export interface SeriesEpisodeRef {
  id: string;
  slug: string;
  title: string;
}

/** Series projection embedded in /episodes/:slug: cover asset + published siblings. */
export interface SeriesDetailRef extends SeriesEntity {
  coverImageAsset: MediaAssetEntity | null;
  episodes: SeriesEpisodeRef[];
  sources: SeriesSourceWithSource[];
}

export interface QuizRef {
  id: string;
}

/** /episodes/:slug row: full episode plus series (with citations), narrations, tags, quiz. */
export interface EpisodeDetailEntity extends EpisodeEntity {
  series: SeriesDetailRef;
  narrations: NarrationWithNarrator[];
  entityTags: EntityTagWithEntity[];
  quiz: QuizRef | null;
}

export interface EpisodeWithSeries extends EpisodeEntity {
  series: SeriesEntity;
}

export interface ListeningProgressWithAudio extends ListeningProgressEntity {
  audioAsset: MediaAssetEntity;
}

/** /listening-history row: progress plus audio asset and its episode + series. */
export interface ListeningProgressWithHistory extends ListeningProgressEntity {
  audioAsset: MediaAssetEntity;
  episode: EpisodeWithSeries;
}

/* Per-episode completion award surfaced by the transactional progress update. */

export interface MissionProgressSummary {
  id: string;
  title: string;
  progress: number;
  target: number;
  completedNow: boolean;
  xpAwarded: number;
}

export interface CompletionAward {
  xpAwarded: number;
  totalXp: number;
  missions: MissionProgressSummary[];
}
