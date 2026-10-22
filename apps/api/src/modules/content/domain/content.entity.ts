/**
 * Pure domain entities mirroring the content Prisma rows
 * (packages/db/prisma/schema.prisma). Hand-written and free of @repo/db
 * imports so domain/application layers stay persistence-agnostic.
 */

export type ContentStatus = "DRAFT" | "PUBLISHED" | "HIDDEN";
export type NarrationType = "THIRD_PERSON" | "FIRST_PERSON";
export type TagOrigin = "AI" | "MODERATOR";
export type EntityTagStatus = "SUGGESTED" | "CONFIRMED" | "REJECTED";
export type SourceTier =
  | "TIER_1_CHINH_SU"
  | "TIER_2_KHAO_CO"
  | "TIER_3_KHOA_HOC"
  | "TIER_4_DA_SU";
export type HistoricalEntityType = "FIGURE" | "EVENT";

export interface SeriesEntity {
  primaryHistoricalEventId?: string | null;
  historicalEntityRevisionId?: string | null;
  publicationEvidence?: unknown;
  evidenceCurrentStates?: Record<
    string,
    {
      verificationStatus: string;
      version: number;
      verifiedVersion: number | null;
      archived: boolean;
    }
  >;
  id: string;
  ownerId: string;
  topicId: string | null;
  historicalPhaseId: string | null;
  title: string;
  slug: string;
  description: string | null;
  coverImageAssetId: string | null;
  coverLandscapeAssetId: string | null;
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
  scriptDocument: unknown | null;
  audioAnalysis: unknown | null;
  audioAssetId: string | null;
  scriptUpdatedAt: Date | null;
  audioAttachedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EpisodeAttachmentEntity {
  id: string;
  episodeId: string;
  mediaAssetId: string;
  fileName: string;
  createdAt: Date;
  updatedAt: Date;
  mediaAsset: MediaAssetEntity;
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

/** Source of a series as the AI review needs it; `verifiedVersion` is not in the studio payload. */
export interface SeriesReviewSourceEntity {
  sourceId: string;
  title: string;
  url: string | null;
  hasFile: boolean;
  version: number;
  verificationStatus: string;
  verifiedVersion: number | null;
  sortOrder: number;
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
  widthPx: number | null;
  heightPx: number | null;
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
  sourceRevisionId?: string | null;
  historicalCitationId?: string | null;
  sourceRevision?: {
    version: number;
    snapshot: unknown;
    fileAsset: Pick<
      MediaAssetEntity,
      "id" | "publicId" | "kind" | "version" | "format"
    > | null;
  } | null;
  source: {
    version?: number;
    verificationStatus?: string;
    id: string;
    tier: SourceTier;
    title: string;
    author: string | null;
    publicationYear: number | null;
    url: string | null;
    fileAsset: Pick<
      MediaAssetEntity,
      "publicId" | "kind" | "version" | "format"
    > | null;
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
  attachments: EpisodeAttachmentEntity[];
  entityTags: EpisodeEntityTagWithEntityEntity[];
};

/** Episode row as included in the series detail query. */
export type EpisodeDetailRowEntity = EpisodeEntity & {
  attachments?: EpisodeAttachmentEntity[];
  narrations: Array<
    EpisodeNarrationEntity & { audioAsset: MediaAssetEntity | null }
  >;
};

/** Full series detail row (the `seriesInclude` query payload). */
export type SeriesDetailEntity = SeriesEntity & {
  topic: { id: string; name: string } | null;
  historicalPhase: {
    id: string;
    name: string;
    period: { id: string; name: string };
  } | null;
  owner: { id: string; name: string };
  coverImageAsset: MediaAssetEntity | null;
  coverLandscapeAsset: MediaAssetEntity | null;
  episodes: EpisodeDetailRowEntity[];
  sources: SeriesSourceWithSourceEntity[];
};

/** Series row as included in the studio list query. */
export type SeriesListItemEntity = SeriesEntity & {
  coverImageAsset: MediaAssetEntity | null;
  coverLandscapeAsset: MediaAssetEntity | null;
  episodes: { status: ContentStatus }[];
};
