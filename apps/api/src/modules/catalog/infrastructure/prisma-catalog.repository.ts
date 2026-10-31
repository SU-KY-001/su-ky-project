import {
  prisma,
  Prisma,
  type HistoricalEntity as PrismaHistoricalEntity,
} from "@repo/db";
import type {
  HistoricalEntity,
  HistoricalPeriod,
  Source,
  SourceWithUsage,
  Topic,
  SourceFileCandidate,
} from "../domain/catalog.entity";
import type {
  CreateHistoricalEntityData,
  CreateSourceData,
  HistoricalEntityListQuery,
  HistoricalEntityRepository,
  PatchHistoricalEntityData,
  PatchSourceData,
  SimilarHistoricalEntityQuery,
  SimilarSourceQuery,
  SourceListQuery,
  SourceRepository,
  TaxonomyRepository,
} from "../domain/catalog.repository";
import { jsonSnapshot } from "./prisma-historical-catalog.repository";
import { DomainError } from "../../../core/errors/domain-error";
import { writeAudit } from "../../../core/audit";
import { insertSourcePages, readSourcePdfPages } from "./source-pdf-pages";
import { env } from "../../../core/env";

const SOURCE_INCLUDE = {
  fileAsset: {
    select: {
      id: true,
      publicId: true,
      kind: true,
      version: true,
      format: true,
      sizeBytes: true,
    },
  },
} satisfies Prisma.SourceInclude;
type SourceRow = Prisma.SourceGetPayload<{ include: typeof SOURCE_INCLUDE }>;
type SourceRowWithUsage = Prisma.SourceGetPayload<{
  include: typeof SOURCE_INCLUDE & {
    _count: { select: { seriesSources: true } };
  };
}>;

/** Field order mirrors the Prisma model so JSON payloads keep their key order. */
export function toSource(row: SourceRow): Source {
  return {
    version: row.version,
    verificationStatus: row.verificationStatus,
    verifiedVersion: row.verifiedVersion,
    verifiedById: row.verifiedById,
    verifiedAt: row.verifiedAt,
    verificationNote: row.verificationNote,
    id: row.id,
    tier: row.tier,
    title: row.title,
    originalTitle: row.originalTitle,
    author: row.author,
    translator: row.translator,
    publisher: row.publisher,
    publicationYear: row.publicationYear,
    edition: row.edition,
    isbn: row.isbn,
    url: row.url,
    createdById: row.createdById,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    fileAssetId: row.fileAssetId,
    fileAsset: row.fileAsset,
  };
}

function toSourceWithUsage(row: SourceRowWithUsage): SourceWithUsage {
  const source = toSource(row);
  return {
    ...source,
    usageCount: row._count.seriesSources,
    historicalUsageCount: 0,
  };
}

function toHistoricalEntity(row: PrismaHistoricalEntity): HistoricalEntity {
  return {
    id: row.id,
    entityType: row.entityType,
    name: row.name,
    slug: row.slug,
    aliases: row.aliases,
    startYear: row.startYear,
    endYear: row.endYear,
    summary: row.summary,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toTopic(row: { id: string; slug: string; name: string }): Topic {
  return { id: row.id, slug: row.slug, name: row.name };
}

export class PrismaCatalogRepository
  implements TaxonomyRepository, SourceRepository, HistoricalEntityRepository
{
  // --- taxonomy -------------------------------------------------------------

  async listActiveTopics(): Promise<Topic[]> {
    const rows = await prisma.topic.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true },
    });
    return rows.map(toTopic);
  }

  async listActiveHistoricalPeriods(): Promise<HistoricalPeriod[]> {
    return prisma.historicalPeriod.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        startYear: true,
        endYear: true,
        phases: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            slug: true,
            name: true,
            startYear: true,
            endYear: true,
            note: true,
          },
        },
      },
    });
  }

  // --- sources ---------------------------------------------------------------

  async listSources(
    query: SourceListQuery,
  ): Promise<{ items: Source[]; total: number }> {
    const where = {
      verificationStatus: query.verificationStatus,
      ...(query.includeArchived ? {} : { archivedAt: null }),
      ...(query.tier ? { tier: query.tier } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" as const } },
              {
                originalTitle: {
                  contains: query.q,
                  mode: "insensitive" as const,
                },
              },
              { author: { contains: query.q, mode: "insensitive" as const } },
              { isbn: query.normalizedIsbn ?? null },
            ],
          }
        : {}),
    };
    const sortDirection = query.sortDirection ?? "asc";
    const orderBy =
      query.sortBy === "createdAt"
        ? [{ createdAt: sortDirection }, { id: sortDirection }]
        : [{ title: sortDirection }, { id: sortDirection }];
    const [rows, total] = await Promise.all([
      prisma.source.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy,
        include: SOURCE_INCLUDE,
      }),
      prisma.source.count({ where }),
    ]);
    return { items: rows.map(toSource), total };
  }

  async findSimilarSources(query: SimilarSourceQuery): Promise<Source[]> {
    const rows = await prisma.source.findMany({
      where: {
        archivedAt: null,
        OR: [
          { title: { contains: query.title, mode: "insensitive" as const } },
          ...(query.author
            ? [
                {
                  author: {
                    contains: query.author,
                    mode: "insensitive" as const,
                  },
                },
              ]
            : []),
          ...(query.isbn !== undefined ? [{ isbn: query.isbn }] : []),
        ],
      },
      take: 10,
      orderBy: { title: "asc" },
      include: SOURCE_INCLUDE,
    });
    return rows.map(toSource);
  }

  async getSource(id: string): Promise<Source | null> {
    const row = await prisma.source.findUnique({
      where: { id },
      include: SOURCE_INCLUDE,
    });
    return row ? toSource(row) : null;
  }

  async getSourceWithUsage(id: string): Promise<SourceWithUsage | null> {
    const row = await prisma.source.findUnique({
      where: { id },
      include: {
        ...SOURCE_INCLUDE,
        _count: { select: { seriesSources: true } },
      },
    });
    if (!row) return null;
    const usage = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT count(DISTINCT COALESCE(period_id,phase_id,entity_id)) FROM historical_citations WHERE source_id=${id}::uuid`;
    return {
      ...toSourceWithUsage(row),
      historicalUsageCount: Number(usage[0]!.count),
    };
  }

  async createSource(data: CreateSourceData): Promise<boolean> {
    const pages = await readSourcePdfPages(data.fileAssetId);
    return prisma.$transaction(async (tx) => {
      const result = await tx.source.createMany({
        data: [data],
        skipDuplicates: true,
      });
      if (result.count > 0) {
        const source = await tx.source.findUniqueOrThrow({
          where: { id: data.id },
        });
        await tx.sourceRevision.create({
          data: {
            sourceId: source.id,
            version: source.version,
            snapshot: jsonSnapshot(source),
            fileAssetId: source.fileAssetId,
            createdById: source.createdById,
          },
        });
        if (pages) await insertSourcePages(tx, source.id, source.version, pages);
        await writeAudit(tx, {
          actorId: data.createdById,
          action: "source.created",
          resourceType: "source",
          resourceId: source.id,
          changes: { after: jsonSnapshot(source) },
          ipAddress: null,
        });
      }
      if (result.count > 0 && data.fileAssetId)
        await tx.mediaAsset.update({
          where: { id: data.fileAssetId },
          data: { detachedAt: null },
        });
      return result.count > 0;
    }, { timeout: env.SOURCE_PDF_TIMEOUT_MS });
  }

  async findSourceIdByIsbn(isbn: string | null): Promise<string | null> {
    const row = await prisma.source.findFirst({
      where: { isbn },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async findSourceIdByIsbnExcept(
    isbn: string,
    exceptId: string,
  ): Promise<string | null> {
    const row = await prisma.source.findFirst({
      where: { isbn, id: { not: exceptId } },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async findSourceIdByFileAsset(
    assetId: string,
    exceptId?: string,
  ): Promise<string | null> {
    const row = await prisma.source.findFirst({
      where: {
        fileAssetId: assetId,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  findMediaAsset(id: string): Promise<SourceFileCandidate | null> {
    return prisma.mediaAsset.findUnique({
      where: { id },
      select: { id: true, kind: true, status: true, uploadedById: true },
    });
  }

  async requireSource(id: string): Promise<Source> {
    const row = await prisma.source.findUniqueOrThrow({
      where: { id },
      include: SOURCE_INCLUDE,
    });
    return toSource(row);
  }

  async updateSource(
    id: string,
    data: PatchSourceData,
    actorId?: string,
  ): Promise<Source> {
    const pages = data.fileAssetId ? await readSourcePdfPages(data.fileAssetId) : null;
    const row = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM sources WHERE id=${id}::uuid FOR UPDATE`;
      const before = await tx.source.findUniqueOrThrow({ where: { id } });
      const { baseVersion, ...patch } = data;
      if (baseVersion !== undefined && before.version !== baseVersion)
        throw new DomainError(
          409,
          "STALE_WRITE",
          "Nguồn đã thay đổi; vui lòng tải lại",
        );
      if (data.fileAssetId !== undefined) {
        const current = await tx.source.findUniqueOrThrow({
          where: { id },
          select: { fileAssetId: true },
        });
        if (current.fileAssetId && current.fileAssetId !== data.fileAssetId) {
          await tx.mediaAsset.update({
            where: { id: current.fileAssetId },
            data: { detachedAt: new Date() },
          });
        }
        if (data.fileAssetId)
          await tx.mediaAsset.update({
            where: { id: data.fileAssetId },
            data: { detachedAt: null },
          });
      }
      const updated = await tx.source.update({
        where: { id },
        data: {
          ...patch,
          version: { increment: 1 },
          verificationStatus: "PENDING",
          verifiedVersion: null,
          verifiedAt: null,
          verifiedById: null,
          verificationNote: null,
        },
        include: SOURCE_INCLUDE,
      });
      if (pages) {
        await insertSourcePages(tx, id, updated.version, pages);
      } else if (updated.fileAssetId && updated.fileAssetId === before.fileAssetId) {
        await tx.$executeRaw`
          INSERT INTO source_pages (source_id, version, page, text)
          SELECT source_id, ${updated.version}, page, text FROM source_pages
          WHERE source_id = ${id}::uuid AND version = ${before.version}
        `;
      }
      await tx.sourceRevision.create({
        data: {
          sourceId: id,
          version: updated.version,
          snapshot: jsonSnapshot(updated),
          fileAssetId: updated.fileAssetId,
          createdById: actorId ?? before.createdById,
        },
      });
      await writeAudit(tx, {
        actorId: actorId ?? before.createdById,
        action: "source.updated",
        resourceType: "source",
        resourceId: id,
        changes: { before: jsonSnapshot(before), after: jsonSnapshot(updated) },
        ipAddress: null,
      });
      return updated;
    }, { timeout: env.SOURCE_PDF_TIMEOUT_MS });
    return toSource(row);
  }

  async setSourceArchivedAt(
    id: string,
    archivedAt: Date | null,
    baseVersion?: number,
    actorId?: string,
  ): Promise<Source> {
    const row = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM sources WHERE id=${id}::uuid FOR UPDATE`;
      const before = await tx.source.findUniqueOrThrow({ where: { id } });
      if (baseVersion !== undefined && before.version !== baseVersion)
        throw new DomainError(409, "STALE_WRITE", "Nguồn đã thay đổi");
      const updated = await tx.source.update({
        where: { id },
        data: {
          archivedAt,
          version: { increment: 1 },
          verificationStatus: "PENDING",
          verifiedVersion: null,
          verifiedAt: null,
          verifiedById: null,
        },
        include: SOURCE_INCLUDE,
      });
      if (updated.fileAssetId) {
        await tx.$executeRaw`
          INSERT INTO source_pages (source_id, version, page, text)
          SELECT source_id, ${updated.version}, page, text FROM source_pages
          WHERE source_id = ${id}::uuid AND version = ${before.version}
        `;
      }
      await tx.sourceRevision.create({
        data: {
          sourceId: id,
          version: updated.version,
          snapshot: jsonSnapshot(updated),
          fileAssetId: updated.fileAssetId,
          createdById: actorId ?? before.createdById,
        },
      });
      await writeAudit(tx, {
        actorId: actorId ?? before.createdById,
        action: archivedAt ? "source.archived" : "source.restored",
        resourceType: "source",
        resourceId: id,
        changes: { before: jsonSnapshot(before), after: jsonSnapshot(updated) },
        ipAddress: null,
      });
      return updated;
    });
    return toSource(row);
  }

  // --- historical entities ----------------------------------------------------

  async listEntities(
    query: HistoricalEntityListQuery,
  ): Promise<{ items: HistoricalEntity[]; total: number }> {
    const where = {
      ...(query.type ? { entityType: query.type } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { aliases: { has: query.q } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.historicalEntity.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { name: "asc" },
      }),
      prisma.historicalEntity.count({ where }),
    ]);
    return { items: rows.map(toHistoricalEntity), total };
  }

  async findSimilarEntities(
    query: SimilarHistoricalEntityQuery,
  ): Promise<HistoricalEntity[]> {
    const rows = await prisma.historicalEntity.findMany({
      where: {
        ...(query.type ? { entityType: query.type } : {}),
        OR: [
          { name: { contains: query.name, mode: "insensitive" as const } },
          { aliases: { has: query.name } },
        ],
      },
      take: 10,
      orderBy: { name: "asc" },
    });
    return rows.map(toHistoricalEntity);
  }

  async getEntity(id: string): Promise<HistoricalEntity | null> {
    const row = await prisma.historicalEntity.findUnique({ where: { id } });
    return row ? toHistoricalEntity(row) : null;
  }

  /** Slug-unique insert unit of work: null means the slug is taken (retry loop). */
  async tryInsertWithSlug(
    slug: string,
    data: CreateHistoricalEntityData,
  ): Promise<string | null> {
    const result = await prisma.historicalEntity.createMany({
      data: [{ ...data, slug }],
      skipDuplicates: true,
    });
    if (!result.count) return null;
    const row = await prisma.historicalEntity.findUniqueOrThrow({
      where: { slug },
      select: { id: true },
    });
    return row.id;
  }

  async requireEntity(id: string): Promise<HistoricalEntity> {
    const row = await prisma.historicalEntity.findUniqueOrThrow({
      where: { id },
    });
    return toHistoricalEntity(row);
  }

  async updateEntity(
    id: string,
    data: PatchHistoricalEntityData,
  ): Promise<HistoricalEntity> {
    const row = await prisma.historicalEntity.update({ where: { id }, data });
    return toHistoricalEntity(row);
  }
}
