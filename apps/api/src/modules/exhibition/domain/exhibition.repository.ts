import type { ExhibitionDocument, ExhibitionSummary, ResolvedExhibition, ExhibitionPodcastOption, ExhibitionPodcastQuery } from "@repo/shared";

export interface ExhibitionRecord {
  id: string;
  ownerId: string;
  slug: string;
  revision: number;
  document: ExhibitionDocument;
  publishedDocument: ExhibitionDocument | null;
  publishedRevision: number | null;
  updatedAt: Date;
}

export interface ExhibitionRepository {
  list(ownerId: string, query: { q: string; status: "all" | "published" | "unpublished"; page: number; limit: number }): Promise<{ items: ExhibitionSummary[]; page: number; limit: number; total: number }>;
  resolve(document: ExhibitionDocument): Promise<ResolvedExhibition>;
  podcastOptions(query: ExhibitionPodcastQuery): Promise<{ items: ExhibitionPodcastOption[]; page: number; limit: number; total: number }>;
  create(ownerId: string, document: ExhibitionDocument): Promise<ExhibitionRecord>;
  publish(id: string, ownerId: string, revision: number): Promise<ExhibitionRecord | null>;
  findPublished(slug: string): Promise<ExhibitionDocument | null>;
  find(id: string, ownerId: string): Promise<ExhibitionRecord | null>;
  save(id: string, ownerId: string, revision: number, document: ExhibitionDocument): Promise<ExhibitionRecord | null>;
}
