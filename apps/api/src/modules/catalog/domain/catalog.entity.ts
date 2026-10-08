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

/** Public read shape of an active historical period (public /historical-periods endpoint select). */
export interface HistoricalPeriod {
  id: string;
  slug: string;
  name: string;
  startYear: number | null;
  endYear: number | null;
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
}

/** Source plus how many episodes reference it (detail endpoint payload). */
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
