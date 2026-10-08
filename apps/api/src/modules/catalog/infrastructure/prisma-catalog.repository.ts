import {
  prisma,
  Prisma,
  type HistoricalEntity as PrismaHistoricalEntity,
  type Source as PrismaSource,
} from "@repo/db";
import type {
  HistoricalEntity,
  HistoricalPeriod,
  Source,
  SourceWithUsage,
  Topic,
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

type SourceRowWithUsage = Prisma.SourceGetPayload<{
  include: { _count: { select: { episodeSources: true } } };
}>;

/** Field order mirrors the Prisma model so JSON payloads keep their key order. */
function toSource(row: PrismaSource): Source {
  return {
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
  };
}

function toSourceWithUsage(row: SourceRowWithUsage): SourceWithUsage {
  const source = toSource(row);
  return { ...source, usageCount: row._count.episodeSources };
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

function toHistoricalPeriod(row: {
  id: string;
  slug: string;
  name: string;
  startYear: number | null;
  endYear: number | null;
}): HistoricalPeriod {
  return { id: row.id, slug: row.slug, name: row.name, startYear: row.startYear, endYear: row.endYear };
}

export class PrismaCatalogRepository implements TaxonomyRepository, SourceRepository, HistoricalEntityRepository {
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
    const rows = await prisma.historicalPeriod.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true, startYear: true, endYear: true },
    });
    return rows.map(toHistoricalPeriod);
  }

  // --- sources ---------------------------------------------------------------

  async listSources(query: SourceListQuery): Promise<{ items: Source[]; total: number }> {
    const where = {
      ...(query.includeArchived ? {} : { archivedAt: null }),
      ...(query.tier ? { tier: query.tier } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" as const } },
              { originalTitle: { contains: query.q, mode: "insensitive" as const } },
              { author: { contains: query.q, mode: "insensitive" as const } },
              { isbn: query.normalizedIsbn ?? null },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.source.findMany({ where, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { title: "asc" } }),
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
          ...(query.author ? [{ author: { contains: query.author, mode: "insensitive" as const } }] : []),
          ...(query.isbn !== undefined ? [{ isbn: query.isbn }] : []),
        ],
      },
      take: 10,
      orderBy: { title: "asc" },
    });
    return rows.map(toSource);
  }

  async getSource(id: string): Promise<Source | null> {
    const row = await prisma.source.findUnique({ where: { id } });
    return row ? toSource(row) : null;
  }

  async getSourceWithUsage(id: string): Promise<SourceWithUsage | null> {
    const row = await prisma.source.findUnique({
      where: { id },
      include: { _count: { select: { episodeSources: true } } },
    });
    return row ? toSourceWithUsage(row) : null;
  }

  async createSource(data: CreateSourceData): Promise<boolean> {
    const result = await prisma.source.createMany({ data: [data], skipDuplicates: true });
    return result.count > 0;
  }

  async findSourceIdByIsbn(isbn: string | null): Promise<string | null> {
    const row = await prisma.source.findFirst({ where: { isbn }, select: { id: true } });
    return row?.id ?? null;
  }

  async findSourceIdByIsbnExcept(isbn: string, exceptId: string): Promise<string | null> {
    const row = await prisma.source.findFirst({ where: { isbn, id: { not: exceptId } }, select: { id: true } });
    return row?.id ?? null;
  }

  async requireSource(id: string): Promise<Source> {
    const row = await prisma.source.findUniqueOrThrow({ where: { id } });
    return toSource(row);
  }

  async updateSource(id: string, data: PatchSourceData): Promise<Source> {
    const row = await prisma.source.update({ where: { id }, data });
    return toSource(row);
  }

  async setSourceArchivedAt(id: string, archivedAt: Date | null): Promise<Source> {
    const row = await prisma.source.update({ where: { id }, data: { archivedAt } });
    return toSource(row);
  }

  // --- historical entities ----------------------------------------------------

  async listEntities(query: HistoricalEntityListQuery): Promise<{ items: HistoricalEntity[]; total: number }> {
    const where = {
      ...(query.type ? { entityType: query.type } : {}),
      ...(query.q
        ? { OR: [{ name: { contains: query.q, mode: "insensitive" as const } }, { aliases: { has: query.q } }] }
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

  async findSimilarEntities(query: SimilarHistoricalEntityQuery): Promise<HistoricalEntity[]> {
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
  async tryInsertWithSlug(slug: string, data: CreateHistoricalEntityData): Promise<string | null> {
    const result = await prisma.historicalEntity.createMany({ data: [{ ...data, slug }], skipDuplicates: true });
    if (!result.count) return null;
    const row = await prisma.historicalEntity.findUniqueOrThrow({ where: { slug }, select: { id: true } });
    return row.id;
  }

  async requireEntity(id: string): Promise<HistoricalEntity> {
    const row = await prisma.historicalEntity.findUniqueOrThrow({ where: { id } });
    return toHistoricalEntity(row);
  }

  async updateEntity(id: string, data: PatchHistoricalEntityData): Promise<HistoricalEntity> {
    const row = await prisma.historicalEntity.update({ where: { id }, data });
    return toHistoricalEntity(row);
  }
}
