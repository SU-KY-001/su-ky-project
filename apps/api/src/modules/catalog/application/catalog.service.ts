import type { z } from "zod";
import { DomainError } from "../../../core/errors/domain-error";
import { insertWithUniqueSlug } from "../../../core/slug";
import type {
  HistoricalEntityInputSchema,
  HistoricalEntityQuerySchema,
  PatchHistoricalEntitySchema,
  PatchSourceSchema,
  SourceInputSchema,
  SourceQuerySchema,
} from "@repo/shared";
import type {
  HistoricalEntity,
  HistoricalEntityType,
  HistoricalPeriod,
  Source,
  SourceWithUsage,
  Topic,
} from "../domain/catalog.entity";
import type {
  CreateSourceData,
  HistoricalEntityListQuery,
  HistoricalEntityRepository,
  PatchSourceData,
  SimilarSourceQuery,
  SourceListQuery,
  SourceRepository,
  TaxonomyRepository,
} from "../domain/catalog.repository";

/** Validated API inputs (validated by zValidator in presentation). */
export type SourceCreateInput = z.TypeOf<typeof SourceInputSchema>;
export type SourcePatchInput = z.TypeOf<typeof PatchSourceSchema>;
export type SourceQuery = z.TypeOf<typeof SourceQuerySchema>;
export type HistoricalEntityCreateInput = z.TypeOf<typeof HistoricalEntityInputSchema>;
export type HistoricalEntityPatchInput = z.TypeOf<typeof PatchHistoricalEntitySchema>;
export type HistoricalEntityQuery = z.TypeOf<typeof HistoricalEntityQuerySchema>;

/** Requester identity used for ownership checks; role mirrors session.user.role. */
export interface CatalogActor {
  userId: string;
  role: string | null | undefined;
}

const normalizeIsbn = (value?: string | null) => value?.replace(/[\s-]/g, "").toUpperCase() || null;

/**
 * Catalog application service: pure orchestration over the domain ports.
 * Input normalization (ISBN) and error semantics (DomainError codes) live here.
 */
export class CatalogService {
  constructor(
    private readonly taxonomy: TaxonomyRepository,
    private readonly sources: SourceRepository,
    private readonly historicalEntities: HistoricalEntityRepository
  ) {}

  // --- public taxonomy -----------------------------------------------------

  listTopics(): Promise<Topic[]> {
    return this.taxonomy.listActiveTopics();
  }

  listHistoricalPeriods(): Promise<HistoricalPeriod[]> {
    return this.taxonomy.listActiveHistoricalPeriods();
  }

  // --- sources -------------------------------------------------------------

  listSimilarSources(query: { title: string; author?: string; isbn?: string }): Promise<Source[]> {
    const similar: SimilarSourceQuery = {
      title: query.title,
      ...(query.author ? { author: query.author } : {}),
      ...(query.isbn ? { isbn: normalizeIsbn(query.isbn) } : {}),
    };
    return this.sources.findSimilarSources(similar);
  }

  async listSources(query: SourceQuery): Promise<{ items: Source[]; page: number; limit: number; total: number }> {
    const { page, limit, q, tier, includeArchived } = query;
    const listQuery: SourceListQuery = {
      page,
      limit,
      includeArchived,
      ...(tier ? { tier } : {}),
      ...(q ? { q, normalizedIsbn: normalizeIsbn(q) } : {}),
    };
    const { items, total } = await this.sources.listSources(listQuery);
    return { items, page, limit, total };
  }

  async getSource(id: string): Promise<SourceWithUsage> {
    const source = await this.sources.getSourceWithUsage(id);
    if (!source) throw new DomainError(404, "NOT_FOUND", "Source not found");
    return source;
  }

  private assertSourceReachable(url: string | null | undefined, fileAssetId: string | null | undefined): void {
    if (!url && !fileAssetId) throw new DomainError(422, "VALIDATION_ERROR", "A source needs a url or an uploaded file");
  }

  private async assertFileUsable(actor: CatalogActor, assetId: string, exceptSourceId?: string): Promise<void> {
    const asset = await this.sources.findMediaAsset(assetId);
    if (!asset || asset.kind !== "DOCUMENT" || asset.status !== "READY" || (actor.role !== "admin" && asset.uploadedById !== actor.userId)) {
      throw new DomainError(422, "VALIDATION_ERROR", "Source file asset is not usable");
    }
    if (await this.sources.findSourceIdByFileAsset(assetId, exceptSourceId)) {
      throw new DomainError(409, "ASSET_IN_USE", "File asset is already attached to another source");
    }
  }

  async createSource(actor: CatalogActor, input: SourceCreateInput): Promise<Source> {
    this.assertSourceReachable(input.url, input.fileAssetId);
    if (input.fileAssetId) await this.assertFileUsable(actor, input.fileAssetId);
    const isbn = normalizeIsbn(input.isbn);
    const data: CreateSourceData = { id: crypto.randomUUID(), ...input, isbn, createdById: actor.userId };
    const inserted = await this.sources.createSource(data);
    if (!inserted) {
      const existingId = await this.sources.findSourceIdByIsbn(isbn);
      if (existingId) throw new DomainError(409, "SOURCE_ISBN_TAKEN", `ISBN already belongs to source ${existingId}`);
      throw new DomainError(409, "CONFLICT", "Source could not be created");
    }
    return this.sources.requireSource(data.id);
  }

  async updateSource(actor: CatalogActor, id: string, input: SourcePatchInput): Promise<Source> {
    const existing = await this.sources.getSource(id);
    if (!existing || (actor.role !== "admin" && existing.createdById !== actor.userId)) {
      throw new DomainError(404, "NOT_FOUND", "Source not found");
    }
    const isbn = input.isbn === undefined ? undefined : normalizeIsbn(input.isbn);
    if (isbn) {
      const duplicateId = await this.sources.findSourceIdByIsbnExcept(isbn, id);
      if (duplicateId) throw new DomainError(409, "SOURCE_ISBN_TAKEN", `ISBN already belongs to source ${duplicateId}`);
    }
    if (input.url !== undefined || input.fileAssetId !== undefined) {
      this.assertSourceReachable(
        input.url === undefined ? existing.url : input.url,
        input.fileAssetId === undefined ? existing.fileAssetId : input.fileAssetId
      );
    }
    if (input.fileAssetId) await this.assertFileUsable(actor, input.fileAssetId, id);
    const data: PatchSourceData = { ...input, isbn };
    return this.sources.updateSource(id, data);
  }

  async archiveSource(actor: CatalogActor, id: string): Promise<Source> {
    const source = await this.sources.getSource(id);
    if (!source || (actor.role !== "admin" && source.createdById !== actor.userId)) {
      throw new DomainError(404, "NOT_FOUND", "Source not found");
    }
    return this.sources.setSourceArchivedAt(id, source.archivedAt ?? new Date());
  }

  async unarchiveSource(actor: CatalogActor, id: string): Promise<Source> {
    const source = await this.sources.getSource(id);
    if (!source || (actor.role !== "admin" && source.createdById !== actor.userId)) {
      throw new DomainError(404, "NOT_FOUND", "Source not found");
    }
    return this.sources.setSourceArchivedAt(id, null);
  }

  // --- historical entities --------------------------------------------------

  listSimilarHistoricalEntities(query: { name: string; type?: HistoricalEntityType }): Promise<HistoricalEntity[]> {
    return this.historicalEntities.findSimilarEntities(query);
  }

  async listHistoricalEntities(
    query: HistoricalEntityQuery
  ): Promise<{ items: HistoricalEntity[]; page: number; limit: number; total: number }> {
    const { page, limit, q, type } = query;
    const listQuery: HistoricalEntityListQuery = {
      page,
      limit,
      ...(type ? { type } : {}),
      ...(q ? { q } : {}),
    };
    const { items, total } = await this.historicalEntities.listEntities(listQuery);
    return { items, page, limit, total };
  }

  async getHistoricalEntity(id: string): Promise<HistoricalEntity> {
    const entity = await this.historicalEntities.getEntity(id);
    if (!entity) throw new DomainError(404, "NOT_FOUND", "Historical entity not found");
    return entity;
  }

  async createHistoricalEntity(actor: CatalogActor, input: HistoricalEntityCreateInput): Promise<HistoricalEntity> {
    const data = { ...input, createdById: actor.userId };
    let createdId = "";
    await insertWithUniqueSlug(input.name, async (slug) => {
      const insertedId = await this.historicalEntities.tryInsertWithSlug(slug, data);
      if (insertedId === null) return false;
      createdId = insertedId;
      return true;
    });
    return this.historicalEntities.requireEntity(createdId);
  }

  async updateHistoricalEntity(
    actor: CatalogActor,
    id: string,
    input: HistoricalEntityPatchInput
  ): Promise<HistoricalEntity> {
    const existing = await this.historicalEntities.getEntity(id);
    if (!existing || (actor.role !== "admin" && existing.createdById !== actor.userId)) {
      throw new DomainError(404, "NOT_FOUND", "Historical entity not found");
    }
    return this.historicalEntities.updateEntity(id, input);
  }
}
