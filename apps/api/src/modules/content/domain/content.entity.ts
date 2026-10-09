/**
 * Pure domain entities mirroring the content Prisma rows
 * (packages/db/prisma/schema.prisma). Hand-written and free of @repo/db
 * imports so domain/application layers stay persistence-agnostic.
 */

export type ContentStatus = "DRAFT" | "PUBLISHED" | "HIDDEN";
export type NarrationType = "THIRD_PERSON" | "FIRST_PERSON";
export type AudioProvider = "UPLOAD" | "ELEVENLABS";
export type TagOrigin = "AI" | "MODERATOR";
export type EntityTagStatus = "SUGGESTED" | "CONFIRMED" | "REJECTED";
export type SourceTier = "TIER_1_CHINH_SU" | "TIER_2_KHAO_CO" | "TIER_3_KHOA_HOC" | "TIER_4_DA_SU";
export type HistoricalEntityType = "FIGURE" | "EVENT";

export interface SeriesEntity {
  id: string;
  ownerId: string;
  topicId: string | null;
  historicalPeriodId: string | null;
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
  scriptPublicationId: number | null;
  scriptPublicationEpisodeNo: number | null;
  audioAssetId: string | null;
  audioProvider: AudioProvider | null;
  scriptUpdatedAt: Date | null;
  audioAttachedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EpisodeSourceEntity {
  id: string;
  episodeId: string;
  sourceId: string;
  locator: string;
  excerpt: string | null;
  origin: TagOrigin;
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
  kind: "AUDIO" | "IMAGE";
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

export interface ScriptPublicationEntity {
  id: number;
  workflowRunId: number;
  approvedVersionId: number;
  approvedById: string;
  finalScript: string;
  wordCount: number;
  estimatedDurationSeconds: number;
  publishedAt: Date;
}

export interface WorkflowRunEntity {
  id: number;
  seriesId: string | null;
  topic: string;
  focusHint: string | null;
  status: string;
  currentStep: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

/** Narration with its included relations (narrator name subset + full audio asset row). */
export type EpisodeNarrationDetailEntity = EpisodeNarrationEntity & {
  narratorEntity: { id: string; name: string } | null;
  audioAsset: MediaAssetEntity | null;
};

/** Narration plus the AI script publication it was generated from. */
export type EpisodeNarrationWithPublicationEntity = EpisodeNarrationEntity & {
  scriptPublication: ScriptPublicationEntity | null;
};

export type EpisodeSourceWithSourceEntity = EpisodeSourceEntity & {
  source: {
    id: string;
    tier: SourceTier;
    title: string;
    author: string | null;
    publicationYear: number | null;
    url: string | null;
  };
};

export type EpisodeEntityTagWithEntityEntity = EpisodeEntityTagEntity & {
  entity: { id: string; entityType: HistoricalEntityType; name: string };
};

/** Episode loaded together with its owning series (ownership checks). */
export type EpisodeWithSeriesEntity = EpisodeEntity & { series: SeriesEntity };

/** Full studio workspace payload row: episode + series + narrations/sources/tags. */
export type EpisodeWorkspaceEntity = EpisodeWithSeriesEntity & {
  narrations: EpisodeNarrationDetailEntity[];
  sources: EpisodeSourceWithSourceEntity[];
  entityTags: EpisodeEntityTagWithEntityEntity[];
};

/** Episode row as included in the series detail query. */
export type EpisodeDetailRowEntity = EpisodeEntity & {
  narrations: Array<EpisodeNarrationEntity & { audioAsset: MediaAssetEntity | null }>;
  _count: { sources: number };
};

/** Full series detail row (the `seriesInclude` query payload). */
export type SeriesDetailEntity = SeriesEntity & {
  topic: { id: string; name: string } | null;
  historicalPeriod: { id: string; name: string } | null;
  owner: { id: string; name: string };
  coverImageAsset: MediaAssetEntity | null;
  episodes: EpisodeDetailRowEntity[];
  workflowRuns: WorkflowRunEntity[];
};

/** Series row as included in the studio list query. */
export type SeriesListItemEntity = SeriesEntity & {
  coverImageAsset: MediaAssetEntity | null;
  episodes: { status: ContentStatus }[];
};
