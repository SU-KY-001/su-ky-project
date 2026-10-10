/**
 * Pure TS entity shapes mirroring the Prisma rows (packages/db/prisma/schema.prisma).
 * No imports from @repo/db — the infrastructure adapter maps rows into these.
 */

export type SourceTier = "TIER_1_CHINH_SU" | "TIER_2_KHAO_CO" | "TIER_3_KHOA_HOC" | "TIER_4_DA_SU";

export type HistoricalEntityType = "FIGURE" | "EVENT";

/** Public read shape of an active topic (public /topics endpoint select). */
export interface Topic {
  id: string;
  slug: string;
  name: string;
}

/** Phase of a period; `[startYear, endYear)` half-open, `endYear = null` means ongoing. */
export interface HistoricalPhase {
  id: string;
  slug: string;
  name: string;
  startYear: number | null;
  endYear: number | null;
  note: string | null;
}

/** Public read shape of an active historical period with its active phases (period → phase tree). */
export interface HistoricalPeriod {
  id: string;
  slug: string;
  name: string;
  startYear: number | null;
  endYear: number | null;
  phases: HistoricalPhase[];
}

/** Fields the delivery URL builder needs for an uploaded source file. */
export interface SourceFileAsset {
  id: string;
  publicId: string;
  kind: "AUDIO" | "IMAGE" | "DOCUMENT";
  version: bigint | null;
  format: string | null;
  sizeBytes: bigint | null;
}

/** Media asset as seen when attaching an upload to a source. */
export interface SourceFileCandidate {
  id: string;
  kind: "AUDIO" | "IMAGE" | "DOCUMENT";
  status: "PENDING" | "READY" | "DELETED";
  uploadedById: string;
}

export interface Source {
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
  fileAssetId: string | null;
  /** Uploaded PDF asset, present when `fileAssetId` is set. */
  fileAsset: SourceFileAsset | null;
}

/** Source plus how many series reference it (detail endpoint payload). */
export interface SourceWithUsage extends Source {
  usageCount: number;
}

export interface HistoricalEntity {
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
