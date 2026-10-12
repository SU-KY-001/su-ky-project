import type { HistoricalTimeDto, CatalogSummaryDto } from "@repo/shared";
import type { Source } from "./catalog.entity";
export type HistoricalNodeKind = "period" | "phase" | "entity";
export interface HistoricalNodeRecord {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  time: HistoricalTimeDto;
  startYear: number | null;
  endYear: number | null;
  version: number;
  createdById: string | null;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  sortOrder: number;
  periodId: string | null;
  historicalPhaseId: string | null;
  entityType: "FIGURE" | "EVENT" | null;
  aliases: string[];
  reviewStatus: "DRAFT" | "IN_REVIEW" | "APPROVED" | "CHANGES_REQUESTED";
  reviewedVersion: number | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
}
export interface HistoricalNodeWrite {
  name?: string;
  summary?: string | null;
  time?: HistoricalTimeDto;
  isActive?: boolean;
  sortOrder?: number;
  periodId?: string;
  historicalPhaseId?: string | null;
  entityType?: "FIGURE" | "EVENT";
  aliases?: string[];
}
export interface HistoricalNodeQuery {
  page: number;
  limit: number;
  q?: string;
  includeDeleted?: boolean;
  periodId?: string;
  historicalPhaseId?: string;
  type?: "FIGURE" | "EVENT";
  reviewStatus?: HistoricalNodeRecord["reviewStatus"];
}
export interface HistoricalNodeCounts {
  childCount: number;
  sourceCount: number;
  citationCount: number;
  podcastCount: number;
}
export interface HistoricalCatalogRepository {
  get(
    kind: HistoricalNodeKind,
    id: string,
  ): Promise<HistoricalNodeRecord | null>;
  list(
    kind: HistoricalNodeKind,
    query: HistoricalNodeQuery,
  ): Promise<{ items: HistoricalNodeRecord[]; total: number }>;
  create(
    kind: HistoricalNodeKind,
    actorId: string,
    input: HistoricalNodeWrite & { name: string; time: HistoricalTimeDto },
  ): Promise<HistoricalNodeRecord>;
  patch(
    kind: HistoricalNodeKind,
    id: string,
    actorId: string,
    baseVersion: number,
    input: HistoricalNodeWrite,
  ): Promise<HistoricalNodeRecord>;
  setDeleted(
    kind: HistoricalNodeKind,
    id: string,
    actorId: string,
    baseVersion: number,
    deleted: boolean,
  ): Promise<HistoricalNodeRecord>;
  counts(
    kind: HistoricalNodeKind,
    ids: string[],
  ): Promise<Map<string, HistoricalNodeCounts>>;
}
export interface CitationOwner {
  kind: HistoricalNodeKind;
  id: string;
}
export interface HistoricalCitationRecord {
  id: string;
  sourceId: string;
  sourceRevisionId: string;
  sourceVersion: number;
  locator: string;
  excerpt: string | null;
  note: string | null;
  sortOrder: number;
  source: Source;
  snapshot: unknown;
  revisionFile: Source["fileAsset"];
}
export interface HistoricalEvidenceRepository
  extends HistoricalCatalogRepository {
  summary(): Promise<CatalogSummaryDto>;
  listPublicEvents(
    query: HistoricalNodeQuery & { slug?: string },
  ): Promise<{ ids: string[]; total: number }>;
  citations(owner: CitationOwner): Promise<HistoricalCitationRecord[]>;
  changeCitation(
    actorId: string,
    owner: CitationOwner,
    baseVersion: number,
    operation: "create" | "patch" | "delete",
    input: {
      id?: string;
      sourceId?: string;
      locator?: string;
      excerpt?: string | null;
      note?: string | null;
    },
  ): Promise<string | null>;
  reviewEntity(
    actorId: string,
    id: string,
    baseVersion: number,
    expectedStatus: HistoricalNodeRecord["reviewStatus"],
    status: HistoricalNodeRecord["reviewStatus"],
    note: string,
  ): Promise<void>;
  reviewSource(
    actorId: string,
    id: string,
    baseVersion: number,
    expectedStatus: Source["verificationStatus"],
    status: Source["verificationStatus"],
    note: string,
  ): Promise<Source>;
  getSource(id: string): Promise<Source | null>;
  revisions(
    kind: "entity" | "source",
    id: string,
  ): Promise<
    Array<{ id: string; version: number; snapshot: unknown; createdAt: Date }>
  >;
}
