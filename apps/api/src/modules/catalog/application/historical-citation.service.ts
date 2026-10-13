import { z } from "zod";
import {
  SourceTierSchema,
  type CatalogActor,
  type HistoricalCitationDto,
} from "@repo/shared";
import type { MediaStorageGateway } from "../../media";
import type {
  HistoricalEvidenceRepository,
  CitationOwner,
  HistoricalCitationRecord,
} from "../domain/historical-catalog.repository";
import type { HistoricalCatalogService } from "./historical-catalog.service";
import { DomainError } from "../../../core/errors/domain-error";

export class HistoricalCitationService {
  constructor(
    readonly repository: HistoricalEvidenceRepository,
    readonly catalog: HistoricalCatalogService,
    private storage?: MediaStorageGateway,
  ) {}
  mapCitation(row: HistoricalCitationRecord): HistoricalCitationDto {
    const s = z.record(z.unknown()).parse(row.snapshot);
    const str = (key: string, fallback: string | null) =>
      typeof s[key] === "string" ? s[key] : s[key] === null ? null : fallback;
    const file = row.revisionFile;
    const { fileAsset: _fileAsset, ...metadata } = row.source;
    const source = {
      ...metadata,
      tier: SourceTierSchema.parse(s.tier ?? row.source.tier),
      verificationStatus:
        row.sourceVersion === row.source.version
          ? row.source.verificationStatus
          : ("PENDING" as const),
      title: typeof s.title === "string" ? s.title : row.source.title,
      author: str("author", row.source.author),
      publisher: str("publisher", row.source.publisher),
      edition: str("edition", row.source.edition),
      url: str("url", row.source.url),
      isbn: str("isbn", row.source.isbn),
      publicationYear:
        typeof s.publicationYear === "number"
          ? s.publicationYear
          : typeof s.publication_year === "number"
            ? s.publication_year
            : row.source.publicationYear,
      fileAssetId: file?.id ?? null,
      version: row.sourceVersion,
      file:
        file && this.storage
          ? {
              assetId: file.id,
              url: this.storage.deliveryUrl(file),
              format: file.format,
              sizeBytes:
                file.sizeBytes === null ? null : Number(file.sizeBytes),
            }
          : null,
    };
    return {
      id: row.id,
      sourceId: row.sourceId,
      sourceRevisionId: row.sourceRevisionId,
      sourceVersion: row.sourceVersion,
      currentSourceVersion: row.source.version,
      locator: row.locator,
      excerpt: row.excerpt,
      note: row.note,
      sortOrder: row.sortOrder,
      outdated: row.sourceVersion !== row.source.version,
      source,
    };
  }
  async listCitations(owner: CitationOwner) {
    await this.catalog.getNode(owner.kind, owner.id);
    return (await this.repository.citations(owner)).map((r) =>
      this.mapCitation(r),
    );
  }
  async addCitation(
    actor: CatalogActor,
    owner: CitationOwner,
    input: {
      sourceId: string;
      locator: string;
      baseVersion: number;
      excerpt?: string | null;
      note?: string | null;
    },
  ) {
    await this.catalog.assertOwner(actor, owner.kind, owner.id);
    const id = await this.repository.changeCitation(
      actor.userId,
      owner,
      input.baseVersion,
      "create",
      input,
    );
    const row = (await this.listCitations(owner)).find((c) => c.id === id);
    if (!row)
      throw new DomainError(
        404,
        "NOT_FOUND",
        "Không tìm thấy trích dẫn vừa tạo",
      );
    return row;
  }
  async patchCitation(
    actor: CatalogActor,
    owner: CitationOwner,
    id: string,
    input: {
      baseVersion: number;
      sourceId?: string;
      locator?: string;
      excerpt?: string | null;
      note?: string | null;
    },
  ) {
    await this.catalog.assertOwner(actor, owner.kind, owner.id);
    await this.repository.changeCitation(
      actor.userId,
      owner,
      input.baseVersion,
      "patch",
      { ...input, id },
    );
    return (await this.listCitations(owner)).find((c) => c.id === id)!;
  }
  async deleteCitation(
    actor: CatalogActor,
    owner: CitationOwner,
    id: string,
    baseVersion: number,
  ) {
    await this.catalog.assertOwner(actor, owner.kind, owner.id);
    await this.repository.changeCitation(
      actor.userId,
      owner,
      baseVersion,
      "delete",
      { id },
    );
  }
}
