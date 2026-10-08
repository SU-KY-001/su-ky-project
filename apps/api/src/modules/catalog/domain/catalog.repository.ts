import type {
  HistoricalEntity,
  HistoricalEntityType,
  HistoricalPeriod,
  Source,
  SourceTier,
  SourceWithUsage,
  Topic,
} from "./catalog.entity";

/**
 * Ports owned by the application layer. Implementations live in
 * infrastructure/prisma-catalog.repository.ts — the only place touching @repo/db.
 */

export interface SourceListQuery {
  page: number;
  limit: number;
  includeArchived: boolean;
  tier?: SourceTier;
  /** Raw free-text term (matched against title/originalTitle/author). */
  q?: string;
  /** ISBN term pre-normalized by the application layer (may be null when q has no ISBN digits). */
  normalizedIsbn?: string | null;
}

export interface SimilarSourceQuery {
  title: string;
  author?: string;
  /** Normalized by the application layer before the call; may be null for ISBN-less terms. */
  isbn?: string | null;
}

export interface HistoricalEntityListQuery {
  page: number;
  limit: number;
  type?: HistoricalEntityType;
  q?: string;
}

export interface SimilarHistoricalEntityQuery {
  name: string;
  type?: HistoricalEntityType;
}

/** Create data for a source; isbn already normalized, id already allocated. */
export interface CreateSourceData {
  id: string;
  tier: SourceTier;
  title: string;
  originalTitle?: string | null;
  author?: string | null;
  translator?: string | null;
  publisher?: string | null;
  publicationYear?: number | null;
  edition?: string | null;
  isbn: string | null;
  url?: string | null;
  createdById: string;
}

/** Patch passed through to update — undefined keys leave columns untouched. */
export interface PatchSourceData {
  tier?: SourceTier;
  title?: string;
  originalTitle?: string | null;
  author?: string | null;
  translator?: string | null;
  publisher?: string | null;
  publicationYear?: number | null;
  edition?: string | null;
  isbn?: string | null;
  url?: string | null;
}

export interface CreateHistoricalEntityData {
  entityType: HistoricalEntityType;
  name: string;
  aliases?: string[];
  startYear?: number | null;
  endYear?: number | null;
  summary?: string | null;
  createdById: string;
}

export interface PatchHistoricalEntityData {
  entityType?: HistoricalEntityType;
  name?: string;
  aliases?: string[];
  startYear?: number | null;
  endYear?: number | null;
  summary?: string | null;
}

export interface TaxonomyRepository {
  listActiveTopics(): Promise<Topic[]>;
  listActiveHistoricalPeriods(): Promise<HistoricalPeriod[]>;
}

/**
 * Source read/write port. `createSource` is the skip-duplicates insert unit of
 * work (false = unique violation swallowed → caller resolves the conflict).
 * `requireSource` mirrors findUniqueOrThrow (throws on missing, as today).
 */
export interface SourceRepository {
  listSources(query: SourceListQuery): Promise<{ items: Source[]; total: number }>;
  findSimilarSources(query: SimilarSourceQuery): Promise<Source[]>;
  getSource(id: string): Promise<Source | null>;
  getSourceWithUsage(id: string): Promise<SourceWithUsage | null>;
  createSource(data: CreateSourceData): Promise<boolean>;
  findSourceIdByIsbn(isbn: string | null): Promise<string | null>;
  findSourceIdByIsbnExcept(isbn: string, exceptId: string): Promise<string | null>;
  requireSource(id: string): Promise<Source>;
  updateSource(id: string, data: PatchSourceData): Promise<Source>;
  setSourceArchivedAt(id: string, archivedAt: Date | null): Promise<Source>;
}

/**
 * Historical-entity port. `tryInsertWithSlug` is the slug-unique insert unit of
 * work: inserts under `slug` and returns the new id, or null when the slug is
 * taken (caller retries with a suffixed slug via insertWithUniqueSlug).
 */
export interface HistoricalEntityRepository {
  listEntities(query: HistoricalEntityListQuery): Promise<{ items: HistoricalEntity[]; total: number }>;
  findSimilarEntities(query: SimilarHistoricalEntityQuery): Promise<HistoricalEntity[]>;
  getEntity(id: string): Promise<HistoricalEntity | null>;
  requireEntity(id: string): Promise<HistoricalEntity>;
  tryInsertWithSlug(slug: string, data: CreateHistoricalEntityData): Promise<string | null>;
  updateEntity(id: string, data: PatchHistoricalEntityData): Promise<HistoricalEntity>;
}
