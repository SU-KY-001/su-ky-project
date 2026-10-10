import { prisma, Prisma, type DbClient } from "@repo/db";
import type { Session } from "../../auth";
import { writeAudit } from "../../../core/audit";
import { DomainError } from "../../../core/errors/domain-error";
import { insertWithUniqueSlug } from "../../../core/slug";
import type {
  AppendEpisodeInput,
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
export async function createSeriesDraft(db: DbClient, input: CreateSeriesDraftInput) {
  let createdId = "";
  await insertWithUniqueSlug(input.slug ?? input.title, async (slug) => {
    const rows = await db.series.createMany({ data: [{ ...input, slug, status: "DRAFT" }], skipDuplicates: true });
    if (rows.count === 0) return false;
    createdId = (await db.series.findUniqueOrThrow({ where: { slug }, select: { id: true } })).id;
    return true;
  });
  return db.series.findUniqueOrThrow({ where: { id: createdId } });
}

/** Unique-slug episode inserts + narration rows; runs on the passed client so callers keep one transaction. */
export async function appendEpisodes(
  db: DbClient,
  seriesId: string,
  episodes: AppendEpisodeInput[]
) {
  const aggregate = await db.episode.aggregate({ where: { seriesId, deletedAt: null }, _max: { sortOrder: true } });
  const created = [];
  for (const [index, input] of episodes.entries()) {
    let episodeId = "";
    await insertWithUniqueSlug(input.slug ?? input.title, async (slug) => {
      const rows = await db.episode.createMany({ data: [{ seriesId, title: input.title, slug, sortOrder: (aggregate._max.sortOrder ?? 0) + index + 1 }], skipDuplicates: true });
      if (rows.count === 0) return false;
      episodeId = (await db.episode.findUniqueOrThrow({ where: { slug }, select: { id: true } })).id;
      return true;
    });
    const narration = await db.episodeNarration.create({ data: { episodeId, narrationType: "THIRD_PERSON" } });
    created.push({ episodeId, narrationId: narration.id, title: input.title });
  }
  return created;
}

// --- include payloads (verbatim from the former route files) --------------------

const seriesListInclude = { coverImageAsset: true, episodes: { where: { deletedAt: null }, select: { status: true } } } satisfies Prisma.SeriesInclude;

const sourceInclude = {
  source: { select: { id: true, tier: true, title: true, author: true, publicationYear: true, url: true, fileAsset: { select: { publicId: true, kind: true, version: true, format: true } } } },
} satisfies Prisma.SeriesSourceInclude;

const seriesDetailInclude = {
  topic: { select: { id: true, name: true } },
  historicalPhase: { select: { id: true, name: true, period: { select: { id: true, name: true } } } },
  owner: { select: { id: true, name: true } }, coverImageAsset: true,
  episodes: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" as const }, include: { narrations: { include: { audioAsset: true } } } },
  sources: { orderBy: { sortOrder: "asc" as const }, include: sourceInclude },
} satisfies Prisma.SeriesInclude;

const episodeInclude = {
  series: true,
  narrations: { include: { narratorEntity: { select: { id: true, name: true } }, audioAsset: true } },
  entityTags: { include: { entity: { select: { id: true, entityType: true, name: true } } } },
} satisfies Prisma.EpisodeInclude;

const entityTagInclude = { entity: { select: { id: true, entityType: true, name: true } } } satisfies Prisma.EpisodeEntityTagInclude;
const narrationInclude = { narratorEntity: { select: { id: true, name: true } }, audioAsset: true } satisfies Prisma.EpisodeNarrationInclude;

// --- SeriesRepository ------------------------------------------------------------

export class PrismaSeriesRepository implements SeriesRepository {
  findSeriesById(id: string) {
    return prisma.series.findUnique({ where: { id } });
  }

  async getSeriesDetail(id: string): Promise<SeriesDetailEntity | null> {
    const series = await prisma.series.findUnique({ where: { id }, include: seriesDetailInclude });
    return series ?? null;
  }

  async findSeriesUpdatedAt(id: string): Promise<Date | null> {
    const series = await prisma.series.findUnique({ where: { id }, select: { updatedAt: true } });
    return series?.updatedAt ?? null;
  }

  async seriesSlugConflict(slug: string, excludeId: string): Promise<boolean> {
    const conflict = await prisma.series.findFirst({ where: { slug, id: { not: excludeId } }, select: { id: true } });
    return Boolean(conflict);
  }

  async findMediaAsset(id: string): Promise<MediaAssetEntity | null> {
    return prisma.mediaAsset.findUnique({ where: { id } });
  }

  async listSeries(filter: { ownerId: string | null; status: ContentStatus | "TRASH" | null; q: string | null; page: number; limit: number }): Promise<{ items: SeriesListItemEntity[]; total: number }> {
    const where: Prisma.SeriesWhereInput = {
      ...(filter.ownerId ? { ownerId: filter.ownerId } : {}),
      ...(filter.status === "TRASH" ? { deletedAt: { not: null } } : { deletedAt: null, ...(filter.status ? { status: filter.status } : {}) }),
      ...(filter.q ? { title: { contains: filter.q, mode: "insensitive" } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.series.findMany({ where, skip: (filter.page - 1) * filter.limit, take: filter.limit, orderBy: { updatedAt: "desc" }, include: seriesListInclude }),
      prisma.series.count({ where }),
    ]);
    return { items: rows, total };
  }

  createSeriesDraft(input: CreateSeriesDraftInput) {
    return createSeriesDraft(prisma, input);
  }

  async createSeries(input: CreateSeriesInput) {
    const created = await prisma.$transaction(async (tx) => {
      const row = await createSeriesDraft(tx, { ownerId: input.ownerId, title: input.title, slug: input.slug, description: input.description, topicId: input.topicId, historicalPhaseId: input.historicalPhaseId, startYear: input.startYear, endYear: input.endYear, coverImageAssetId: input.coverImageAssetId });
      if (row.coverImageAssetId) await tx.mediaAsset.update({ where: { id: row.coverImageAssetId }, data: { detachedAt: null } });
      await writeAudit(tx, { actorId: input.actorId, action: "series.created", resourceType: "series", resourceId: row.id, changes: { after: { title: row.title, slug: row.slug } }, ipAddress: input.ipAddress });
      return row;
    });
    return created;
  }

  async updateSeries(input: UpdateSeriesInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      if (input.previousCoverImageAssetId && input.previousCoverImageAssetId !== input.patch.coverImageAssetId) {
        await tx.mediaAsset.update({ where: { id: input.previousCoverImageAssetId }, data: { detachedAt: new Date() } });
      }
      if (input.patch.coverImageAssetId) await tx.mediaAsset.update({ where: { id: input.patch.coverImageAssetId }, data: { detachedAt: null } });
      await tx.series.update({ where: { id: input.id }, data: input.patch });
      await writeAudit(tx, { actorId: input.actorId, action: "series.updated", resourceType: "series", resourceId: input.id, changes: { before: input.before as unknown as Prisma.InputJsonValue, after: input.after as Prisma.InputJsonValue }, ipAddress: input.ipAddress });
    });
  }

  async publishSeries(id: string, publishedAt: Date): Promise<void> {
    await prisma.series.update({ where: { id }, data: { status: "PUBLISHED", publishedAt } });
  }

  async hideSeries(id: string): Promise<void> {
    await prisma.series.update({ where: { id }, data: { status: "HIDDEN" } });
  }

  async trashSeries(id: string, statusBeforeDelete: ContentStatus): Promise<void> {
    await prisma.series.update({ where: { id }, data: { deletedAt: new Date(), statusBeforeDelete } });
  }

  async restoreSeries(id: string, restoredStatus: ContentStatus): Promise<void> {
    await prisma.series.update({ where: { id }, data: { deletedAt: null, status: restoredStatus, statusBeforeDelete: null } });
  }

  async historicalPhaseExists(id: string): Promise<boolean> {
    return Boolean(await prisma.historicalPhase.findFirst({ where: { id, isActive: true }, select: { id: true } }));
  }

  async listSeriesSources(seriesId: string): Promise<SeriesSourceWithSourceEntity[]> {
    return prisma.seriesSource.findMany({ where: { seriesId }, orderBy: { sortOrder: "asc" }, include: sourceInclude });
  }

  async createSeriesSource(seriesId: string, input: { sourceId: string; locator: string; excerpt?: string | null }): Promise<boolean> {
    const max = await prisma.seriesSource.aggregate({ where: { seriesId }, _max: { sortOrder: true } });
    const created = await prisma.seriesSource.createMany({ data: [{ seriesId, ...input, sortOrder: (max._max.sortOrder ?? 0) + 1 }], skipDuplicates: true });
    return created.count > 0;
  }

  async findCreatedSeriesSource(seriesId: string, sourceId: string, locator: string): Promise<SeriesSourceWithSourceEntity> {
    return prisma.seriesSource.findFirstOrThrow({ where: { seriesId, sourceId, locator }, include: sourceInclude });
  }

  async findSeriesSource(seriesId: string, childId: string) {
    return prisma.seriesSource.findFirst({ where: { id: childId, seriesId } });
  }

  async updateSeriesSource(childId: string, patch: { locator?: string; excerpt?: string | null }): Promise<SeriesSourceWithSourceEntity> {
    return prisma.seriesSource.update({ where: { id: childId }, data: patch, include: sourceInclude });
  }

  async countSeriesSources(seriesId: string): Promise<number> {
    return prisma.seriesSource.count({ where: { seriesId } });
  }

  async deleteSeriesSource(seriesId: string, childId: string): Promise<void> {
    await prisma.seriesSource.deleteMany({ where: { id: childId, seriesId } });
  }

  async listSeriesSourceIds(seriesId: string): Promise<string[]> {
    const rows = await prisma.seriesSource.findMany({ where: { seriesId }, select: { id: true } });
    return rows.map((row) => row.id);
  }

  async reorderSeriesSources(orderedIds: string[]): Promise<void> {
    await prisma.$transaction(orderedIds.map((sourceId, index) => prisma.seriesSource.update({ where: { id: sourceId }, data: { sortOrder: index + 1 } })));
  }
}

// --- EpisodeRepository -----------------------------------------------------------

export class PrismaEpisodeRepository implements EpisodeRepository {
  async findEpisodeWithSeries(id: string): Promise<EpisodeWithSeriesEntity | null> {
    const episode = await prisma.episode.findUnique({ where: { id }, include: { series: true } });
    return episode ?? null;
  }

  async getEpisodeWorkspace(id: string) {
    const episode = await prisma.episode.findUnique({ where: { id }, include: episodeInclude });
    return episode ?? null;
  }

  async findEpisodeUpdatedAt(id: string): Promise<Date | null> {
    const episode = await prisma.episode.findUnique({ where: { id }, select: { updatedAt: true } });
    return episode?.updatedAt ?? null;
  }

  async episodeSlugConflict(slug: string, excludeId: string): Promise<boolean> {
    const conflict = await prisma.episode.findFirst({ where: { slug, id: { not: excludeId } }, select: { id: true } });
    return Boolean(conflict);
  }

  async listActiveEpisodeIds(seriesId: string): Promise<string[]> {
    const rows = await prisma.episode.findMany({ where: { seriesId, deletedAt: null }, select: { id: true } });
    return rows.map((row) => row.id);
  }

  appendEpisodes(seriesId: string, inputs: AppendEpisodeInput[]) {
    return prisma.$transaction((tx) => appendEpisodes(tx, seriesId, inputs));
  }

  async reorderEpisodes(orderedIds: string[], seriesId: string): Promise<void> {
    await prisma.$transaction([...orderedIds.map((episodeId, index) => prisma.episode.update({ where: { id: episodeId }, data: { sortOrder: index + 1 } })), prisma.series.update({ where: { id: seriesId }, data: { updatedAt: new Date() } })]);
  }

  async updateEpisode(id: string, patch: EpisodePatch): Promise<void> {
    await prisma.episode.update({ where: { id }, data: patch });
  }

  async publishEpisode(id: string, publishedAt: Date): Promise<void> {
    await prisma.episode.update({ where: { id }, data: { status: "PUBLISHED", publishedAt } });
  }

  async hideEpisode(id: string): Promise<void> {
    await prisma.episode.update({ where: { id }, data: { status: "HIDDEN" } });
  }

  async trashEpisode(id: string, statusBeforeDelete: ContentStatus): Promise<void> {
    await prisma.episode.update({ where: { id }, data: { deletedAt: new Date(), statusBeforeDelete } });
  }

  async restoreEpisode(id: string, restoredStatus: ContentStatus): Promise<void> {
    await prisma.episode.update({ where: { id }, data: { deletedAt: null, status: restoredStatus, statusBeforeDelete: null } });
  }

  async findNarrationByType(episodeId: string, narrationType: NarrationType): Promise<EpisodeNarrationDetailEntity | null> {
    const narration = await prisma.episodeNarration.findUnique({ where: { episodeId_narrationType: { episodeId, narrationType } }, include: narrationInclude });
    return narration ?? null;
  }

  async findNarrationUpdatedAt(id: string): Promise<Date | null> {
    const narration = await prisma.episodeNarration.findUnique({ where: { id }, select: { updatedAt: true } });
    return narration?.updatedAt ?? null;
  }

  async upsertNarration(input: UpsertNarrationInput): Promise<EpisodeNarrationDetailEntity> {
    return prisma.episodeNarration.upsert({
      where: { episodeId_narrationType: { episodeId: input.episodeId, narrationType: input.narrationType } },
      create: { episodeId: input.episodeId, narrationType: input.narrationType, scriptContent: input.scriptContent, narratorEntityId: input.narratorEntityId, scriptUpdatedAt: new Date() },
      update: { scriptContent: input.scriptContent, narratorEntityId: input.narratorEntityId, scriptUpdatedAt: new Date() },
      include: narrationInclude,
    });
  }

  async findNarrationUsingAsset(assetId: string, excludeNarrationId: string) {
    return prisma.episodeNarration.findFirst({ where: { audioAssetId: assetId, id: { not: excludeNarrationId } } });
  }

  async attachAudio(narrationId: string, input: { previousAudioAssetId: string | null; assetId: string }): Promise<EpisodeNarrationDetailEntity> {
    await prisma.$transaction(async (tx) => {
      if (input.previousAudioAssetId && input.previousAudioAssetId !== input.assetId) await tx.mediaAsset.update({ where: { id: input.previousAudioAssetId }, data: { detachedAt: new Date() } });
      await tx.mediaAsset.update({ where: { id: input.assetId }, data: { detachedAt: null } });
      await tx.episodeNarration.update({ where: { id: narrationId }, data: { audioAssetId: input.assetId, audioAttachedAt: new Date() } });
    });
    return prisma.episodeNarration.findUniqueOrThrow({ where: { id: narrationId }, include: narrationInclude });
  }

  async detachAudio(narrationId: string, audioAssetId: string | null): Promise<void> {
    await prisma.$transaction(async (tx) => {
      if (audioAssetId) await tx.mediaAsset.update({ where: { id: audioAssetId }, data: { detachedAt: new Date() } });
      await tx.episodeNarration.update({ where: { id: narrationId }, data: { audioAssetId: null, audioAttachedAt: null } });
    });
  }

  async deleteNarration(narrationId: string, audioAssetId: string | null): Promise<void> {
    await prisma.$transaction(async (tx) => {
      if (audioAssetId) await tx.mediaAsset.update({ where: { id: audioAssetId }, data: { detachedAt: new Date() } });
      await tx.episodeNarration.delete({ where: { id: narrationId } });
    });
  }

  async findHistoricalEntity(id: string) {
    return prisma.historicalEntity.findUnique({ where: { id } });
  }

  async listEpisodeEntityTags(episodeId: string) {
    return prisma.episodeEntityTag.findMany({ where: { episodeId }, include: entityTagInclude });
  }

  async upsertEpisodeEntityTag(episodeId: string, entityId: string, confirmedById: string) {
    await prisma.episodeEntityTag.createMany({ data: [{ episodeId, entityId, status: "CONFIRMED", origin: "MODERATOR", confirmedById, confirmedAt: new Date() }], skipDuplicates: true });
    return prisma.episodeEntityTag.findUniqueOrThrow({ where: { episodeId_entityId: { episodeId, entityId } }, include: entityTagInclude });
  }

  async findEpisodeEntityTag(episodeId: string, childId: string) {
    return prisma.episodeEntityTag.findFirst({ where: { id: childId, episodeId } });
  }

  async updateEpisodeEntityTag(childId: string, patch: UpdateEntityTagInput) {
    return prisma.episodeEntityTag.update({ where: { id: childId }, data: { status: patch.status, confirmedById: patch.confirmedById, confirmedAt: patch.confirmedAt }, include: entityTagInclude });
  }

  async deleteEpisodeEntityTag(episodeId: string, childId: string): Promise<void> {
    await prisma.episodeEntityTag.deleteMany({ where: { id: childId, episodeId } });
  }
}
