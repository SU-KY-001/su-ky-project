/**
 * Pure domain entities mirroring the content Prisma rows
 * (packages/db/prisma/schema.prisma). Hand-written and free of @repo/db
 * imports so domain/application layers stay persistence-agnostic.
 */

export type ContentStatus = "DRAFT" | "PUBLISHED" | "HIDDEN";
export type NarrationType = "THIRD_PERSON" | "FIRST_PERSON";
export type TagOrigin = "AI" | "MODERATOR";
export type EntityTagStatus = "SUGGESTED" | "CONFIRMED" | "REJECTED";
export type SourceTier = "TIER_1_CHINH_SU" | "TIER_2_KHAO_CO" | "TIER_3_KHOA_HOC" | "TIER_4_DA_SU";
export type HistoricalEntityType = "FIGURE" | "EVENT";

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

export interface HistoricalEntityEntity {
  id: string;
  entityType: HistoricalEntityType;
  name: string;
  slug: string;
  aliases: string[];
  startYear: number | null;
  endYear: number | null;
  summary: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaAssetEntity {
  id: string;
  kind: "AUDIO" | "IMAGE" | "DOCUMENT";
  publicId: string;
  status: "PENDING" | "READY" | "DELETED";
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

/** Narration with its included relations (narrator name subset + full audio asset row). */
export type EpisodeNarrationDetailEntity = EpisodeNarrationEntity & {
  narratorEntity: { id: string; name: string } | null;
  audioAsset: MediaAssetEntity | null;
};

export type SeriesSourceWithSourceEntity = SeriesSourceEntity & {
  source: {
    id: string;
    tier: SourceTier;
    title: string;
    author: string | null;
    publicationYear: number | null;
    url: string | null;
    fileAsset: Pick<MediaAssetEntity, "publicId" | "kind" | "version" | "format"> | null;
  };
};

export type EpisodeEntityTagWithEntityEntity = EpisodeEntityTagEntity & {
  entity: { id: string; entityType: HistoricalEntityType; name: string };
};

/** Episode loaded together with its owning series (ownership checks). */
export type EpisodeWithSeriesEntity = EpisodeEntity & { series: SeriesEntity };

/** Full studio workspace payload row: episode + series + narrations/tags. */
export type EpisodeWorkspaceEntity = EpisodeWithSeriesEntity & {
  narrations: EpisodeNarrationDetailEntity[];
  entityTags: EpisodeEntityTagWithEntityEntity[];
};

/** Episode row as included in the series detail query. */
export type EpisodeDetailRowEntity = EpisodeEntity & {
  narrations: Array<EpisodeNarrationEntity & { audioAsset: MediaAssetEntity | null }>;
};

/** Full series detail row (the `seriesInclude` query payload). */
export type SeriesDetailEntity = SeriesEntity & {
  topic: { id: string; name: string } | null;
  historicalPhase: { id: string; name: string; period: { id: string; name: string } } | null;
  owner: { id: string; name: string };
  coverImageAsset: MediaAssetEntity | null;
  episodes: EpisodeDetailRowEntity[];
  sources: SeriesSourceWithSourceEntity[];
};

/** Series row as included in the studio list query. */
export type SeriesListItemEntity = SeriesEntity & {
  coverImageAsset: MediaAssetEntity | null;
  episodes: { status: ContentStatus }[];
};
