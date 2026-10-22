import {
  primaryEventFields,
  publishWithHistoricalEvidence,
} from "./historical-evidence";
import { jsonSnapshot } from "../../catalog/infrastructure/prisma-historical-catalog.repository";
import { prisma, Prisma, type DbClient } from "@repo/db";
import type { Session } from "../../auth";
import { writeAudit } from "../../../core/audit";
import { DomainError } from "../../../core/errors/domain-error";
import { insertWithUniqueSlug } from "../../../core/slug";
import type {
  AppendEpisodeInput,
  AttachAudioInput,
  CreateSeriesDraftInput,
  CreateSeriesInput,
  EpisodePatch,
  EpisodeRepository,
  SeriesRepository,
  UpdateEntityTagInput,
  UpdateSeriesInput,
  UpsertNarrationInput,
} from "../domain/content.repository";
import type {
  ContentStatus,
  EpisodeNarrationDetailEntity,
  SeriesReviewSourceEntity,
  SeriesSourceWithSourceEntity,
  EpisodeWithSeriesEntity,
  MediaAssetEntity,
  NarrationType,
  SeriesDetailEntity,
  SeriesListItemEntity,
} from "../domain/content.entity";

/**
 * Prisma adapters for the content module — the only place in this module that
 * touches @repo/db. Domain entities mirror the Prisma rows structurally, so
 * rows are returned directly without per-field mappers.
 */

// --- transaction-aware standalone helpers --------------------------------------

/** Bare unique-slug draft creation (no audit, no cover bookkeeping). */
export async function createSeriesDraft(
  db: DbClient,
  input: CreateSeriesDraftInput,
) {
  let createdId = "";
  await insertWithUniqueSlug(input.slug ?? input.title, async (slug) => {
    const rows = await db.series.createMany({
      data: [{ ...input, slug, status: "DRAFT" }],
      skipDuplicates: true,
    });
    if (rows.count === 0) return false;
    createdId = (
      await db.series.findUniqueOrThrow({
        where: { slug },
        select: { id: true },
      })
    ).id;
    return true;
  });
  return db.series.findUniqueOrThrow({ where: { id: createdId } });
}

/** Unique-slug episode inserts + narration rows; runs on the passed client so callers keep one transaction. */
export async function appendEpisodes(
  db: DbClient,
  seriesId: string,
  episodes: AppendEpisodeInput[],
) {
  await db.$queryRaw`SELECT id FROM series WHERE id=${seriesId}::uuid FOR UPDATE`;
  const primary = await db.series.findUniqueOrThrow({
    where: { id: seriesId },
  });
  const aggregate = await db.episode.aggregate({
    where: { seriesId, deletedAt: null },
    _max: { sortOrder: true },
  });
  const created = [];
  for (const [index, input] of episodes.entries()) {
    let episodeId = "";
    await insertWithUniqueSlug(input.slug ?? input.title, async (slug) => {
      const rows = await db.episode.createMany({
        data: [
          {
            seriesId,
            title: input.title,
            slug,
            sortOrder: (aggregate._max.sortOrder ?? 0) + index + 1,
          },
        ],
        skipDuplicates: true,
      });
      if (rows.count === 0) return false;
      episodeId = (
        await db.episode.findUniqueOrThrow({
          where: { slug },
          select: { id: true },
        })
      ).id;
      return true;
    });
    const narration = await db.episodeNarration.create({
      data: { episodeId, narrationType: "THIRD_PERSON" },
    });
    if (primary.primaryHistoricalEventId)
      await db.episodeEntityTag.create({
        data: {
          episodeId,
          entityId: primary.primaryHistoricalEventId,
          status: "CONFIRMED",
          origin: "MODERATOR",
          confirmedById: primary.ownerId,
          confirmedAt: new Date(),
        },
      });
    created.push({ episodeId, narrationId: narration.id, title: input.title });
  }
  await db.series.update({
    where: { id: seriesId },
    data: { updatedAt: new Date() },
  });
  return created;
}

async function lockEpisodeAndSeries(
  tx: Prisma.TransactionClient,
  episodeId: string,
) {
  const episode = await tx.episode.findUniqueOrThrow({
    where: { id: episodeId },
  });
  await tx.$queryRaw`SELECT id FROM series WHERE id=${episode.seriesId}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM episodes WHERE id=${episodeId}::uuid FOR UPDATE`;
  await tx.series.update({
    where: { id: episode.seriesId },
    data: { updatedAt: new Date() },
  });
  await tx.episode.update({
    where: { id: episodeId },
    data: { updatedAt: new Date(), contentRevision: { increment: 1 } },
  });
}
// --- include payloads (verbatim from the former route files) --------------------

const seriesListInclude = {
  coverImageAsset: true,
  coverLandscapeAsset: true,
  episodes: { where: { deletedAt: null }, select: { status: true } },
} satisfies Prisma.SeriesInclude;

const sourceInclude = {
  sourceRevision: { include: { fileAsset: true } },
  source: {
    select: {
      version: true,
      verificationStatus: true,
      id: true,
      tier: true,
      title: true,
      author: true,
      publicationYear: true,
      url: true,
      fileAsset: {
        select: { publicId: true, kind: true, version: true, format: true },
      },
    },
  },
} satisfies Prisma.SeriesSourceInclude;

const seriesDetailInclude = {
  topic: { select: { id: true, name: true } },
  historicalPhase: {
    select: {
      id: true,
      name: true,
      period: { select: { id: true, name: true } },
    },
  },
  owner: { select: { id: true, name: true } },
  coverImageAsset: true,
  coverLandscapeAsset: true,
  episodes: {
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" as const },
    include: {
      narrations: { include: { audioAsset: true } },
      attachments: { where: { mediaAsset: { kind: "IMAGE", status: "READY", deletedAt: null } }, orderBy: { createdAt: "desc" as const }, take: 1, include: { mediaAsset: true } },
    },
  },
  sources: { orderBy: { sortOrder: "asc" as const }, include: sourceInclude },
} satisfies Prisma.SeriesInclude;

const episodeInclude = {
  series: true,
  narrations: {
    include: {
      narratorEntity: { select: { id: true, name: true } },
      audioAsset: true,
    },
  },
  attachments: {
    orderBy: { createdAt: "asc" as const },
    include: { mediaAsset: true },
  },
  entityTags: {
    include: { entity: { select: { id: true, entityType: true, name: true } } },
  },
} satisfies Prisma.EpisodeInclude;

const entityTagInclude = {
  entity: { select: { id: true, entityType: true, name: true } },
} satisfies Prisma.EpisodeEntityTagInclude;
const narrationInclude = {
  narratorEntity: { select: { id: true, name: true } },
  audioAsset: true,
} satisfies Prisma.EpisodeNarrationInclude;
const episodeAttachmentInclude = {
  mediaAsset: true,
} satisfies Prisma.EpisodeAttachmentInclude;

// --- SeriesRepository ------------------------------------------------------------

export class PrismaSeriesRepository implements SeriesRepository {
  findSeriesById(id: string) {
    return prisma.series.findUnique({ where: { id } });
  }

  async getSeriesDetail(id: string): Promise<SeriesDetailEntity | null> {
    const series = await prisma.series.findUnique({
      where: { id },
      include: seriesDetailInclude,
    });
    return series ?? null;
  }

  async findSeriesUpdatedAt(id: string): Promise<Date | null> {
    const series = await prisma.series.findUnique({
      where: { id },
      select: { updatedAt: true },
    });
    return series?.updatedAt ?? null;
  }

  async seriesSlugConflict(slug: string, excludeId: string): Promise<boolean> {
    const conflict = await prisma.series.findFirst({
      where: { slug, id: { not: excludeId } },
      select: { id: true },
    });
    return Boolean(conflict);
  }

  async findMediaAsset(id: string): Promise<MediaAssetEntity | null> {
    return prisma.mediaAsset.findUnique({ where: { id } });
  }

  async isActiveReleaseCollaboratorForSeries(seriesId: string, moderatorId: string): Promise<boolean> {
    const assignment = await prisma.productionAssignment.findFirst({
      where: {
        moderatorId,
        removedAt: null,
        schedule: {
          status: { in: ["SCHEDULED", "READY_TO_PUBLISH", "PUBLISHING", "BLOCKED", "FAILED"] },
          episode: { seriesId },
        },
      },
      select: { moderatorId: true },
    });
    return Boolean(assignment);
  }

  async isActiveReleaseCollaboratorForEpisode(episodeId: string, moderatorId: string): Promise<boolean> {
    const assignment = await prisma.productionAssignment.findFirst({
      where: {
        moderatorId,
        removedAt: null,
        schedule: {
          episodeId,
          status: { in: ["SCHEDULED", "READY_TO_PUBLISH", "PUBLISHING", "BLOCKED", "FAILED"] },
        },
      },
      select: { moderatorId: true },
    });
    return Boolean(assignment);
  }

  async listSeries(filter: {
    ownerId: string | null;
    viewerId?: string | null;
    status: ContentStatus | "TRASH" | null;
    q: string | null;
    page: number;
    limit: number;
  }): Promise<{ items: SeriesListItemEntity[]; total: number }> {
    const where: Prisma.SeriesWhereInput = {
      ...(filter.viewerId
        ? {
            OR: [
              { ownerId: filter.viewerId },
              {
                episodes: {
                  some: {
                    releaseSchedules: {
                      some: {
                        status: { in: ["SCHEDULED", "READY_TO_PUBLISH", "PUBLISHING", "BLOCKED", "FAILED"] },
                        assignments: { some: { moderatorId: filter.viewerId, removedAt: null } },
                      },
                    },
                  },
                },
              },
            ],
          }
        : filter.ownerId
          ? { ownerId: filter.ownerId }
          : {}),
      ...(filter.status === "TRASH"
        ? { deletedAt: { not: null } }
        : {
            deletedAt: null,
            ...(filter.status ? { status: filter.status } : {}),
          }),
      ...(filter.q
        ? { title: { contains: filter.q, mode: "insensitive" } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.series.findMany({
        where,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        orderBy: { updatedAt: "desc" },
        include: seriesListInclude,
      }),
      prisma.series.count({ where }),
    ]);
    return { items: rows, total };
  }

  createSeriesDraft(input: CreateSeriesDraftInput) {
    return createSeriesDraft(prisma, input);
  }

  async createSeries(input: CreateSeriesInput) {
    const created = await prisma.$transaction(async (tx) => {
      const primary = await primaryEventFields(
        tx,
        input.primaryHistoricalEventId,
      );
      const row = await createSeriesDraft(tx, {
        ownerId: input.ownerId,
        title: input.title,
        slug: input.slug,
        description: input.description,
        topicId: input.topicId,
        historicalPhaseId: input.historicalPhaseId,
        startYear: input.startYear,
        endYear: input.endYear,
        coverImageAssetId: input.coverImageAssetId,
        ...primary,
      });
      if (row.coverImageAssetId)
        await tx.mediaAsset.update({
          where: { id: row.coverImageAssetId },
          data: { detachedAt: null },
        });
      if (row.coverLandscapeAssetId)
        await tx.mediaAsset.update({
          where: { id: row.coverLandscapeAssetId },
          data: { detachedAt: null },
        });
      await writeAudit(tx, {
        actorId: input.actorId,
        action: "series.created",
        resourceType: "series",
        resourceId: row.id,
        changes: { after: { title: row.title, slug: row.slug } },
        ipAddress: input.ipAddress,
      });
      return row;
    });
    return created;
  }

  async updateSeries(input: UpdateSeriesInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM series WHERE id=${input.id}::uuid FOR UPDATE`;
      const current = await tx.series.findUniqueOrThrow({
        where: { id: input.id },
      });
      if (current.updatedAt.getTime() !== input.before.updatedAt.getTime())
        throw new DomainError(409, "STALE_WRITE", "Series đã thay đổi");
      const primary = await primaryEventFields(
        tx,
        input.patch.primaryHistoricalEventId,
      );
      if (
        current.primaryHistoricalEventId &&
        input.patch.historicalPhaseId &&
        input.patch.primaryHistoricalEventId === undefined &&
        input.patch.historicalPhaseId !== current.historicalPhaseId
      )
        throw new DomainError(
          422,
          "VALIDATION_ERROR",
          "Giai đoạn phải theo sự kiện chính",
        );
      if (
        input.patch.coverImageAssetId !== undefined &&
        input.previousCoverImageAssetId &&
        input.previousCoverImageAssetId !== input.patch.coverImageAssetId
      ) {
        await tx.mediaAsset.update({
          where: { id: input.previousCoverImageAssetId },
          data: { detachedAt: new Date() },
        });
      }
      if (input.patch.coverImageAssetId)
        await tx.mediaAsset.update({
          where: { id: input.patch.coverImageAssetId },
          data: { detachedAt: null },
        });
      if (
        input.patch.coverLandscapeAssetId !== undefined &&
        input.previousCoverLandscapeAssetId &&
        input.previousCoverLandscapeAssetId !== input.patch.coverLandscapeAssetId
      ) {
        await tx.mediaAsset.update({
          where: { id: input.previousCoverLandscapeAssetId },
          data: { detachedAt: new Date() },
        });
      }
      if (input.patch.coverLandscapeAssetId)
        await tx.mediaAsset.update({
          where: { id: input.patch.coverLandscapeAssetId },
          data: { detachedAt: null },
        });
      await tx.series.update({
        where: { id: input.id },
        data: { ...input.patch, ...primary },
      });
      await writeAudit(tx, {
        actorId: input.actorId,
        action: "series.updated",
        resourceType: "series",
        resourceId: input.id,
        changes: {
          before: input.before as unknown as Prisma.InputJsonValue,
          after: input.after as Prisma.InputJsonValue,
        },
        ipAddress: input.ipAddress,
      });
    });
  }

  publishSeriesWithEvidence(actorId: string, id: string, baseUpdatedAt: Date) {
    return publishWithHistoricalEvidence(actorId, id, baseUpdatedAt, "series");
  }
  async resolveHistoricalCitation(seriesId: string, citationId: string) {
    const series = await prisma.series.findUniqueOrThrow({
      where: { id: seriesId },
    });
    const c = await prisma.historicalCitation.findUnique({
      where: { id: citationId },
    });
    if (!c || !c.entityId || c.entityId !== series.primaryHistoricalEventId)
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Trích dẫn phải thuộc sự kiện chính của series",
      );
    return {
      historicalCitationId: c.id,
      sourceId: c.sourceId,
      locator: c.locator,
      excerpt: c.excerpt,
    };
  }
  async publishSeries(id: string, publishedAt: Date): Promise<void> {
    await prisma.series.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt },
    });
  }

  async hideSeries(id: string): Promise<void> {
    await prisma.series.update({ where: { id }, data: { status: "HIDDEN" } });
  }

  async trashSeries(
    id: string,
    statusBeforeDelete: ContentStatus,
  ): Promise<void> {
    await prisma.series.update({
      where: { id },
      data: { deletedAt: new Date(), statusBeforeDelete },
    });
  }

  async restoreSeries(
    id: string,
    restoredStatus: ContentStatus,
  ): Promise<void> {
    await prisma.series.update({
      where: { id },
      data: {
        deletedAt: null,
        status: restoredStatus,
        statusBeforeDelete: null,
      },
    });
  }

  async historicalPhaseExists(id: string): Promise<boolean> {
    return Boolean(
      await prisma.historicalPhase.findFirst({
        where: { id, isActive: true },
        select: { id: true },
      }),
    );
  }

  async listSeriesSources(
    seriesId: string,
  ): Promise<SeriesSourceWithSourceEntity[]> {
    return prisma.seriesSource.findMany({
      where: { seriesId },
      orderBy: { sortOrder: "asc" },
      include: sourceInclude,
    });
  }

  async listReviewSources(seriesId: string): Promise<SeriesReviewSourceEntity[]> {
    const rows = await prisma.seriesSource.findMany({
      where: { seriesId },
      orderBy: { sortOrder: "asc" },
      select: {
        sortOrder: true,
        source: { select: { id: true, title: true, url: true, fileAssetId: true, version: true, verificationStatus: true, verifiedVersion: true } },
      },
    });
    // One source may be attached at several locators; the AI reads each source once.
    const seen = new Set<string>();
    return rows.flatMap(({ sortOrder, source }) => {
      if (seen.has(source.id)) return [];
      seen.add(source.id);
      return [{
        sourceId: source.id,
        title: source.title,
        url: source.url,
        hasFile: source.fileAssetId !== null,
        version: source.version,
        verificationStatus: source.verificationStatus,
        verifiedVersion: source.verifiedVersion,
        sortOrder,
      }];
    });
  }

  async createSeriesSource(
    seriesId: string,
    input: {
      sourceId: string;
      locator: string;
      excerpt?: string | null;
      historicalCitationId?: string;
    },
  ): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM series WHERE id=${seriesId}::uuid FOR UPDATE`;
      const series = await tx.series.findUniqueOrThrow({
        where: { id: seriesId },
      });
      const c = input.historicalCitationId
        ? await tx.historicalCitation.findUnique({
            where: { id: input.historicalCitationId },
          })
        : null;
      if (
        input.historicalCitationId &&
        (!c ||
          c.entityId !== series.primaryHistoricalEventId ||
          c.sourceId !== input.sourceId ||
          c.locator !== input.locator)
      )
        throw new DomainError(
          422,
          "VALIDATION_ERROR",
          "Trích dẫn không còn thuộc sự kiện chính",
        );
      await tx.$queryRaw`SELECT id FROM sources WHERE id=${input.sourceId}::uuid FOR UPDATE`;
      const source = await tx.source.findUnique({
        where: { id: input.sourceId },
      });
      if (!source || source.archivedAt)
        throw new DomainError(422, "VALIDATION_ERROR", "Nguồn không khả dụng");
      const revision = c
        ? await tx.sourceRevision.findUniqueOrThrow({
            where: { id: c.sourceRevisionId },
          })
        : await tx.sourceRevision.upsert({
            where: {
              sourceId_version: {
                sourceId: source.id,
                version: source.version,
              },
            },
            create: {
              sourceId: source.id,
              version: source.version,
              snapshot: jsonSnapshot(source),
              fileAssetId: source.fileAssetId,
              createdById: source.createdById,
            },
            update: {},
          });
      const max = await tx.seriesSource.aggregate({
        where: { seriesId },
        _max: { sortOrder: true },
      });
      const created = await tx.seriesSource.createMany({
        data: [
          {
            seriesId,
            ...input,
            sourceRevisionId: revision.id,
            sortOrder: (max._max.sortOrder ?? 0) + 1,
          },
        ],
        skipDuplicates: true,
      });
      if (created.count)
        await tx.series.update({
          where: { id: seriesId },
          data: { updatedAt: new Date() },
        });
      return created.count > 0;
    });
  }

  async findCreatedSeriesSource(
    seriesId: string,
    sourceId: string,
    locator: string,
  ): Promise<SeriesSourceWithSourceEntity> {
    return prisma.seriesSource.findFirstOrThrow({
      where: { seriesId, sourceId, locator },
      include: sourceInclude,
    });
  }

  async findSeriesSource(seriesId: string, childId: string) {
    return prisma.seriesSource.findFirst({ where: { id: childId, seriesId } });
  }

  async updateSeriesSource(
    childId: string,
    patch: { locator?: string; excerpt?: string | null },
  ): Promise<SeriesSourceWithSourceEntity> {
    return prisma.$transaction(async (tx) => {
      const old = await tx.seriesSource.findUniqueOrThrow({
        where: { id: childId },
      });
      await tx.$queryRaw`SELECT id FROM series WHERE id=${old.seriesId}::uuid FOR UPDATE`;
      if (old.historicalCitationId)
        throw new DomainError(
          422,
          "VALIDATION_ERROR",
          "Gỡ và chọn lại trích dẫn lịch sử thay vì sửa vị trí của danh mục",
        );
      const row = await tx.seriesSource.update({
        where: { id: childId },
        data: patch,
        include: sourceInclude,
      });
      await tx.series.update({
        where: { id: old.seriesId },
        data: { updatedAt: new Date() },
      });
      return row;
    });
  }

  async countSeriesSources(seriesId: string): Promise<number> {
    return prisma.seriesSource.count({ where: { seriesId } });
  }

  async deleteSeriesSource(seriesId: string, childId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM series WHERE id=${seriesId}::uuid FOR UPDATE`;
      await tx.seriesSource.deleteMany({ where: { id: childId, seriesId } });
      await tx.series.update({
        where: { id: seriesId },
        data: { updatedAt: new Date() },
      });
    });
  }

  async listSeriesSourceIds(seriesId: string): Promise<string[]> {
    const rows = await prisma.seriesSource.findMany({
      where: { seriesId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async reorderSeriesSources(orderedIds: string[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const first = await tx.seriesSource.findUnique({
        where: { id: orderedIds[0] },
      });
      if (!first) return;
      await tx.$queryRaw`SELECT id FROM series WHERE id=${first.seriesId}::uuid FOR UPDATE`;
      for (const [index, id] of orderedIds.entries())
        await tx.seriesSource.update({
          where: { id },
          data: { sortOrder: index + 1 },
        });
      await tx.series.update({
        where: { id: first.seriesId },
        data: { updatedAt: new Date() },
      });
    });
  }
}

// --- EpisodeRepository -----------------------------------------------------------

export class PrismaEpisodeRepository implements EpisodeRepository {
  async findEpisodeWithSeries(
    id: string,
  ): Promise<EpisodeWithSeriesEntity | null> {
    const episode = await prisma.episode.findUnique({
      where: { id },
      include: { series: true },
    });
    return episode ?? null;
  }

  async getEpisodeWorkspace(id: string) {
    const episode = await prisma.episode.findUnique({
      where: { id },
      include: episodeInclude,
    });
    return episode ?? null;
  }

  async findEpisodeUpdatedAt(id: string): Promise<Date | null> {
    const episode = await prisma.episode.findUnique({
      where: { id },
      select: { updatedAt: true },
    });
    return episode?.updatedAt ?? null;
  }

  async episodeSlugConflict(slug: string, excludeId: string): Promise<boolean> {
    const conflict = await prisma.episode.findFirst({
      where: { slug, id: { not: excludeId } },
      select: { id: true },
    });
    return Boolean(conflict);
  }

  async listActiveEpisodeIds(seriesId: string): Promise<string[]> {
    const rows = await prisma.episode.findMany({
      where: { seriesId, deletedAt: null },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  appendEpisodes(seriesId: string, inputs: AppendEpisodeInput[]) {
    return prisma.$transaction((tx) => appendEpisodes(tx, seriesId, inputs));
  }

  async reorderEpisodes(orderedIds: string[], seriesId: string): Promise<void> {
    await prisma.$transaction([
      ...orderedIds.map((episodeId, index) =>
        prisma.episode.update({
          where: { id: episodeId },
          data: { sortOrder: index + 1 },
        }),
      ),
      prisma.series.update({
        where: { id: seriesId },
        data: { updatedAt: new Date() },
      }),
    ]);
  }

  async updateEpisode(id: string, patch: EpisodePatch): Promise<void> {
    await prisma.episode.update({
      where: { id },
      data: { ...patch, contentRevision: { increment: 1 } },
    });
  }

  publishEpisodeWithEvidence(actorId: string | null, id: string, baseUpdatedAt: Date) {
    return publishWithHistoricalEvidence(actorId, id, baseUpdatedAt, "episode");
  }
  async publishEpisode(id: string, publishedAt: Date): Promise<void> {
    await prisma.episode.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt },
    });
  }

  async hideEpisode(id: string): Promise<void> {
    await prisma.episode.update({ where: { id }, data: { status: "HIDDEN" } });
  }

  async trashEpisode(
    id: string,
    statusBeforeDelete: ContentStatus,
  ): Promise<void> {
    await prisma.episode.update({
      where: { id },
      data: { deletedAt: new Date(), statusBeforeDelete },
    });
  }

  async restoreEpisode(
    id: string,
    restoredStatus: ContentStatus,
  ): Promise<void> {
    await prisma.episode.update({
      where: { id },
      data: {
        deletedAt: null,
        status: restoredStatus,
        statusBeforeDelete: null,
      },
    });
  }

  async listEpisodeAttachments(episodeId: string) {
    return prisma.episodeAttachment.findMany({
      where: { episodeId, mediaAsset: { kind: "DOCUMENT" } },
      orderBy: { createdAt: "asc" },
      include: episodeAttachmentInclude,
    });
  }

  async setEpisodePoster(episodeId: string, assetId: string | null, fileName: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await lockEpisodeAndSeries(tx, episodeId);
      if (assetId) {
        const asset = await tx.mediaAsset.findUnique({ where: { id: assetId } });
        if (!asset || asset.kind !== "IMAGE" || asset.status !== "READY" || asset.deletedAt) throw new DomainError(422, "VALIDATION_ERROR", "Ảnh poster chưa sẵn sàng. Vui lòng tải lại ảnh.");
        const used = await tx.episodeAttachment.findUnique({ where: { mediaAssetId: assetId } });
        if (used && used.episodeId !== episodeId) throw new DomainError(409, "ASSET_IN_USE", "Ảnh đã gắn với tập khác. Vui lòng tải một ảnh mới.");
      }
      const previous = await tx.episodeAttachment.findMany({ where: { episodeId, mediaAsset: { kind: "IMAGE" } } });
      const removed = previous.filter((value) => value.mediaAssetId !== assetId);
      if (removed.length) {
        await tx.episodeAttachment.deleteMany({ where: { id: { in: removed.map((value) => value.id) } } });
        await tx.mediaAsset.updateMany({ where: { id: { in: removed.map((value) => value.mediaAssetId) }, seriesCover: { none: {} }, seriesCoverLandscape: { none: {} } }, data: { detachedAt: new Date() } });
      }
      if (assetId && !previous.some((value) => value.mediaAssetId === assetId)) {
        await tx.mediaAsset.update({ where: { id: assetId }, data: { detachedAt: null } });
        await tx.episodeAttachment.create({ data: { episodeId, mediaAssetId: assetId, fileName } });
      }
    });
  }

  async findEpisodeAttachment(episodeId: string, attachmentId: string) {
    return prisma.episodeAttachment.findFirst({
      where: { id: attachmentId, episodeId },
      include: episodeAttachmentInclude,
    });
  }

  async findEpisodeAttachmentUsingAsset(assetId: string) {
    return prisma.episodeAttachment.findUnique({
      where: { mediaAssetId: assetId },
      include: episodeAttachmentInclude,
    });
  }

  async attachEpisodeDocument(input: {
    episodeId: string;
    mediaAssetId: string;
    fileName: string;
  }) {
    return prisma.$transaction(async (tx) => {
      await lockEpisodeAndSeries(tx, input.episodeId);
      await tx.mediaAsset.update({
        where: { id: input.mediaAssetId },
        data: { detachedAt: null },
      });
      return tx.episodeAttachment.create({
        data: input,
        include: episodeAttachmentInclude,
      });
    });
  }

  async detachEpisodeDocument(attachmentId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const attachment = await tx.episodeAttachment.findUniqueOrThrow({
        where: { id: attachmentId },
      });
      await lockEpisodeAndSeries(tx, attachment.episodeId);
      await tx.episodeAttachment.delete({ where: { id: attachmentId } });
      await tx.mediaAsset.update({
        where: { id: attachment.mediaAssetId },
        data: { detachedAt: new Date() },
      });
    });
  }

  async findNarrationByType(
    episodeId: string,
    narrationType: NarrationType,
  ): Promise<EpisodeNarrationDetailEntity | null> {
    const narration = await prisma.episodeNarration.findUnique({
      where: { episodeId_narrationType: { episodeId, narrationType } },
      include: narrationInclude,
    });
    return narration ?? null;
  }

  async findNarrationUpdatedAt(id: string): Promise<Date | null> {
    const narration = await prisma.episodeNarration.findUnique({
      where: { id },
      select: { updatedAt: true },
    });
    return narration?.updatedAt ?? null;
  }

  async upsertNarration(
    input: UpsertNarrationInput,
  ): Promise<EpisodeNarrationDetailEntity> {
    return prisma.$transaction(async (tx) => {
      await lockEpisodeAndSeries(tx, input.episodeId);
      if (input.narratorEntityId) {
        await tx.$queryRaw`SELECT id FROM historical_entities WHERE id=${input.narratorEntityId}::uuid FOR UPDATE`;
        const entity = await tx.historicalEntity.findFirst({
          where: {
            id: input.narratorEntityId,
            deletedAt: null,
            entityType: "FIGURE",
          },
        });
        if (!entity)
          throw new DomainError(
            422,
            "VALIDATION_ERROR",
            "Người kể không tồn tại hoặc đã bị xóa",
          );
      }
      return tx.episodeNarration.upsert({
        where: {
          episodeId_narrationType: {
            episodeId: input.episodeId,
            narrationType: input.narrationType,
          },
        },
        create: {
          episodeId: input.episodeId,
          narrationType: input.narrationType,
          scriptContent: input.scriptContent,
          scriptDocument:
            input.scriptDocument === null
              ? Prisma.DbNull
              : (input.scriptDocument as Prisma.InputJsonValue | undefined),
          narratorEntityId: input.narratorEntityId,
          scriptUpdatedAt: new Date(),
        },
        update: {
          scriptContent: input.scriptContent,
          scriptDocument:
            input.scriptDocument === null
              ? Prisma.DbNull
              : (input.scriptDocument as Prisma.InputJsonValue | undefined),
          narratorEntityId: input.narratorEntityId,
          scriptUpdatedAt: new Date(),
        },
        include: narrationInclude,
      });
    });
  }

  async findNarrationUsingAsset(assetId: string, excludeNarrationId: string) {
    return prisma.episodeNarration.findFirst({
      where: { audioAssetId: assetId, id: { not: excludeNarrationId } },
    });
  }

  async attachAudio(
    narrationId: string,
    input: AttachAudioInput,
  ): Promise<EpisodeNarrationDetailEntity> {
    await prisma.$transaction(async (tx) => {
      const narration = await tx.episodeNarration.findUniqueOrThrow({
        where: { id: narrationId },
      });
      await lockEpisodeAndSeries(tx, narration.episodeId);
      if (
        input.previousAudioAssetId &&
        input.previousAudioAssetId !== input.assetId
      )
        await tx.mediaAsset.update({
          where: { id: input.previousAudioAssetId },
          data: { detachedAt: new Date() },
        });
      await tx.mediaAsset.update({
        where: { id: input.assetId },
        data: { detachedAt: null },
      });
      await tx.episodeNarration.update({
        where: { id: narrationId },
        data: {
          audioAssetId: input.assetId,
          audioAnalysis: input.analysis as Prisma.InputJsonValue | undefined,
          audioAttachedAt: new Date(),
        },
      });
    });
    return prisma.episodeNarration.findUniqueOrThrow({
      where: { id: narrationId },
      include: narrationInclude,
    });
  }

  async detachAudio(
    narrationId: string,
    audioAssetId: string | null,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const narration = await tx.episodeNarration.findUniqueOrThrow({
        where: { id: narrationId },
      });
      await lockEpisodeAndSeries(tx, narration.episodeId);
      if (audioAssetId)
        await tx.mediaAsset.update({
          where: { id: audioAssetId },
          data: { detachedAt: new Date() },
        });
      await tx.episodeNarration.update({
        where: { id: narrationId },
        data: { audioAssetId: null, audioAttachedAt: null },
      });
    });
  }

  async deleteNarration(
    narrationId: string,
    audioAssetId: string | null,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const narration = await tx.episodeNarration.findUniqueOrThrow({
        where: { id: narrationId },
      });
      await lockEpisodeAndSeries(tx, narration.episodeId);
      if (audioAssetId)
        await tx.mediaAsset.update({
          where: { id: audioAssetId },
          data: { detachedAt: new Date() },
        });
      await tx.episodeNarration.delete({ where: { id: narrationId } });
    });
  }

  async findHistoricalEntity(id: string) {
    return prisma.historicalEntity.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async listEpisodeEntityTags(episodeId: string) {
    return prisma.episodeEntityTag.findMany({
      where: { episodeId },
      include: entityTagInclude,
    });
  }

  async upsertEpisodeEntityTag(
    episodeId: string,
    entityId: string,
    confirmedById: string,
  ) {
    return prisma.$transaction(async (tx) => {
      await lockEpisodeAndSeries(tx, episodeId);
      await tx.$queryRaw`SELECT id FROM historical_entities WHERE id=${entityId}::uuid FOR UPDATE`;
      if (
        !(await tx.historicalEntity.findFirst({
          where: { id: entityId, deletedAt: null },
        }))
      )
        throw new DomainError(
          422,
          "VALIDATION_ERROR",
          "Thực thể lịch sử không tồn tại hoặc đã bị xóa",
        );
      await tx.episodeEntityTag.createMany({
        data: [
          {
            episodeId,
            entityId,
            status: "CONFIRMED",
            origin: "MODERATOR",
            confirmedById,
            confirmedAt: new Date(),
          },
        ],
        skipDuplicates: true,
      });
      return tx.episodeEntityTag.findUniqueOrThrow({
        where: { episodeId_entityId: { episodeId, entityId } },
        include: entityTagInclude,
      });
    });
  }

  async findEpisodeEntityTag(episodeId: string, childId: string) {
    return prisma.episodeEntityTag.findFirst({
      where: { id: childId, episodeId },
    });
  }

  async updateEpisodeEntityTag(childId: string, patch: UpdateEntityTagInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.episodeEntityTag.findUniqueOrThrow({
        where: { id: childId },
      });
      await lockEpisodeAndSeries(tx, existing.episodeId);
      return tx.episodeEntityTag.update({
        where: { id: childId },
        data: {
          status: patch.status,
          confirmedById: patch.confirmedById,
          confirmedAt: patch.confirmedAt,
        },
        include: entityTagInclude,
      });
    });
  }

  async deleteEpisodeEntityTag(
    episodeId: string,
    childId: string,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await lockEpisodeAndSeries(tx, episodeId);
      await tx.episodeEntityTag.deleteMany({
        where: { id: childId, episodeId },
      });
    });
  }
}
