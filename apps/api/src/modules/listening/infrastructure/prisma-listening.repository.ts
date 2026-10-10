import {
  Prisma,
  prisma,
  type PrismaClient,
  type Episode as PrismaEpisode,
  type EpisodeEntityTag as PrismaEpisodeEntityTag,
  type EpisodeNarration as PrismaNarration,
  type ListeningProgress as PrismaListeningProgress,
  type MediaAsset as PrismaMediaAsset,
  type Series as PrismaSeries,
  type SeriesSource as PrismaSeriesSource,
  type Source as PrismaSource,
} from "@repo/db";
import type {
  ApplyProgressCommand,
  ApplyProgressResult,
  ListeningRepository,
  PublicSeriesQuery,
} from "../domain/listening.repository";
import type {
  CompletionAward,
  EpisodeDetailEntity,
  EpisodeEntityTagEntity,
  EpisodeWithNarrations,
  HistoricalEntityType,
  ListeningProgressEntity,
  ListeningProgressWithAudio,
  ListeningProgressWithHistory,
  MediaAssetEntity,
  MissionProgressSummary,
  NarrationWithAudio,
  NarrationWithNarrator,
  SeriesDetailEntity,
  SeriesSourceWithSource,
  SeriesWithCoverAndCount,
  SourceEntity,
} from "../domain/listening.entity";

/* Row shapes exactly as the returns of the Prisma queries below. */
type PrismaNarrationWithAudio = PrismaNarration & { audioAsset: PrismaMediaAsset | null };
type PrismaEpisodeWithNarrations = PrismaEpisode & { narrations: PrismaNarrationWithAudio[] };
type PrismaSeriesWithCoverAndCount = PrismaSeries & {
  coverImageAsset: PrismaMediaAsset | null;
  _count: { episodes: number };
};
type PrismaSeriesSourceRow = PrismaSeriesSource & {
  source: PrismaSource & { fileAsset: PrismaMediaAsset | null };
};
type PrismaSeriesDetail = PrismaSeries & {
  coverImageAsset: PrismaMediaAsset | null;
  episodes: PrismaEpisodeWithNarrations[];
  sources: PrismaSeriesSourceRow[];
};
type PrismaNarrationWithNarrator = PrismaNarration & {
  narratorEntity: { id: string; entityType: string; name: string } | null;
  audioAsset: PrismaMediaAsset | null;
};
type PrismaSeriesDetailRef = PrismaSeries & {
  coverImageAsset: PrismaMediaAsset | null;
  episodes: { id: string; slug: string; title: string }[];
  sources: PrismaSeriesSourceRow[];
};
type PrismaEpisodeDetail = PrismaEpisode & {
  series: PrismaSeriesDetailRef;
  narrations: PrismaNarrationWithNarrator[];
  entityTags: (PrismaEpisodeEntityTag & { entity: { id: string; entityType: string; name: string } })[];
  quiz: { id: string } | null;
};
type PrismaProgressWithEpisode = PrismaListeningProgress & {
  audioAsset: PrismaMediaAsset;
  episode: PrismaEpisode & { series: PrismaSeries };
};

function toMediaAsset(row: PrismaMediaAsset): MediaAssetEntity {
  return {
    id: row.id, kind: row.kind, publicId: row.publicId, status: row.status, version: row.version,
    format: row.format, sizeBytes: row.sizeBytes, durationMs: row.durationMs,
    uploadedById: row.uploadedById, createdAt: row.createdAt, verifiedAt: row.verifiedAt,
    detachedAt: row.detachedAt, deletedAt: row.deletedAt,
  };
}

function toSeries(row: PrismaSeries) {
  return {
    id: row.id, ownerId: row.ownerId, topicId: row.topicId, historicalPhaseId: row.historicalPhaseId,
    title: row.title, slug: row.slug, description: row.description, coverImageAssetId: row.coverImageAssetId,
    startYear: row.startYear, endYear: row.endYear, status: row.status, statusBeforeDelete: row.statusBeforeDelete,
    adminLockedAt: row.adminLockedAt, adminLockedById: row.adminLockedById, publishedAt: row.publishedAt,
    deletedAt: row.deletedAt, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSeriesWithCoverAndCount(row: PrismaSeriesWithCoverAndCount): SeriesWithCoverAndCount {
  return { ...toSeries(row), coverImageAsset: row.coverImageAsset ? toMediaAsset(row.coverImageAsset) : null, _count: { episodes: row._count.episodes } };
}

function toEpisode(row: PrismaEpisode) {
  return {
    id: row.id, seriesId: row.seriesId, title: row.title, slug: row.slug, description: row.description,
    sortOrder: row.sortOrder, status: row.status, statusBeforeDelete: row.statusBeforeDelete,
    adminLockedAt: row.adminLockedAt, adminLockedById: row.adminLockedById, publishedAt: row.publishedAt,
    deletedAt: row.deletedAt, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toNarration(row: PrismaNarration) {
  return {
    id: row.id, episodeId: row.episodeId, narrationType: row.narrationType, narratorEntityId: row.narratorEntityId,
    scriptContent: row.scriptContent, audioAssetId: row.audioAssetId,
    scriptUpdatedAt: row.scriptUpdatedAt, audioAttachedAt: row.audioAttachedAt,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toNarrationWithAudio(row: PrismaNarrationWithAudio): NarrationWithAudio {
  return { ...toNarration(row), audioAsset: row.audioAsset ? toMediaAsset(row.audioAsset) : null };
}

function toEpisodeWithNarrations(row: PrismaEpisodeWithNarrations): EpisodeWithNarrations {
  return { ...toEpisode(row), narrations: row.narrations.map(toNarrationWithAudio) };
}

function toSeriesDetail(row: PrismaSeriesDetail): SeriesDetailEntity {
  return {
    ...toSeries(row),
    coverImageAsset: row.coverImageAsset ? toMediaAsset(row.coverImageAsset) : null,
    episodes: row.episodes.map(toEpisodeWithNarrations),
    sources: row.sources.map(toSeriesSource),
  };
}

function toSource(row: PrismaSource): SourceEntity {
  return {
    id: row.id, tier: row.tier, title: row.title, originalTitle: row.originalTitle, author: row.author,
    translator: row.translator, publisher: row.publisher, publicationYear: row.publicationYear,
    edition: row.edition, isbn: row.isbn, url: row.url, createdById: row.createdById,
    archivedAt: row.archivedAt, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toNarrationWithNarrator(row: PrismaNarrationWithNarrator): NarrationWithNarrator {
  const narratorEntity = row.narratorEntity
    ? { id: row.narratorEntity.id, entityType: row.narratorEntity.entityType as HistoricalEntityType, name: row.narratorEntity.name }
    : null;
  return {
    ...toNarration(row),
    audioAsset: row.audioAsset ? toMediaAsset(row.audioAsset) : null,
    narratorEntity,
  };
}

function toSeriesSource(row: PrismaSeriesSourceRow): SeriesSourceWithSource {
  const { fileAsset } = row.source;
  return {
    id: row.id, seriesId: row.seriesId, sourceId: row.sourceId, locator: row.locator, excerpt: row.excerpt, sortOrder: row.sortOrder, createdAt: row.createdAt,
    source: { ...toSource(row.source), fileAsset: fileAsset ? { publicId: fileAsset.publicId, kind: fileAsset.kind, version: fileAsset.version, format: fileAsset.format } : null },
  };
}

function toEntityTag(row: PrismaEpisodeEntityTag & { entity: { id: string; entityType: string; name: string } }): EpisodeEntityTagEntity & { entity: { id: string; entityType: HistoricalEntityType; name: string } } {
  return {
    id: row.id, episodeId: row.episodeId, entityId: row.entityId, status: row.status, origin: row.origin,
    confirmedById: row.confirmedById, confirmedAt: row.confirmedAt, createdAt: row.createdAt,
    entity: { id: row.entity.id, entityType: row.entity.entityType as HistoricalEntityType, name: row.entity.name },
  };
}

function toEpisodeDetail(row: PrismaEpisodeDetail): EpisodeDetailEntity {
  return {
    ...toEpisode(row),
    series: {
      ...toSeries(row.series),
      coverImageAsset: row.series.coverImageAsset ? toMediaAsset(row.series.coverImageAsset) : null,
      episodes: row.series.episodes,
      sources: row.series.sources.map(toSeriesSource),
    },
    narrations: row.narrations.map(toNarrationWithNarrator),
    entityTags: row.entityTags.map(toEntityTag),
    quiz: row.quiz,
  };
}

function toProgress(row: PrismaListeningProgress): ListeningProgressEntity {
  return {
    id: row.id, userId: row.userId, narrationId: row.narrationId, episodeId: row.episodeId,
    audioAssetId: row.audioAssetId, positionMs: row.positionMs, playedBitmap: new Uint8Array(row.playedBitmap),
    playedSeconds: row.playedSeconds, completedAt: row.completedAt, lastListenedAt: row.lastListenedAt,
  };
}

function toProgressWithAudio(row: PrismaListeningProgress & { audioAsset: PrismaMediaAsset }): ListeningProgressWithAudio {
  return { ...toProgress(row), audioAsset: toMediaAsset(row.audioAsset) };
}

function toProgressWithHistory(row: PrismaProgressWithEpisode): ListeningProgressWithHistory {
  return { ...toProgressWithAudio(row), episode: { ...toEpisode(row.episode), series: toSeries(row.episode.series) } };
}

const SERIES_SOURCE_INCLUDE = { source: { include: { fileAsset: true } } } satisfies Prisma.SeriesSourceInclude;

const PUBLIC_SERIES_WHERE = { status: "PUBLISHED" as const, deletedAt: null };

export class PrismaListeningRepository implements ListeningRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findPublicNarration(narrationId: string): Promise<NarrationWithAudio | null> {
    const row = await this.db.episodeNarration.findFirst({
      where: {
        id: narrationId,
        episode: { status: "PUBLISHED" as const, deletedAt: null, series: { status: "PUBLISHED" as const, deletedAt: null } },
        audioAsset: { status: "READY" as const },
      },
      include: { audioAsset: true },
    });
    return row ? toNarrationWithAudio(row) : null;
  }

  async findProgress(userId: string, narrationId: string): Promise<ListeningProgressEntity | null> {
    const row = await this.db.listeningProgress.findUnique({ where: { userId_narrationId: { userId, narrationId } } });
    return row ? toProgress(row) : null;
  }

  async findProgressWithAudio(userId: string, narrationId: string): Promise<ListeningProgressWithAudio | null> {
    const row = await this.db.listeningProgress.findUnique({ where: { userId_narrationId: { userId, narrationId } }, include: { audioAsset: true } });
    return row ? toProgressWithAudio(row) : null;
  }

  async applyProgress(command: ApplyProgressCommand): Promise<ApplyProgressResult> {
    const { userId, narrationId, episodeId, assetId, positionMs, bitmap, totalSeconds, now } = command;
    return this.db.$transaction(async (tx) => {
      await tx.listeningProgress.createMany({
        data: [{ userId, narrationId, episodeId, audioAssetId: assetId, playedBitmap: new Uint8Array(bitmap.length), lastListenedAt: now }],
        skipDuplicates: true,
      });
      // Serialized update: lock the row so concurrent progress syncs merge, not clobber.
      await tx.$queryRaw`SELECT id FROM listening_progress WHERE user_id = ${userId} AND narration_id = ${narrationId} FOR UPDATE`;
      const current = await tx.listeningProgress.findUniqueOrThrow({ where: { userId_narrationId: { userId, narrationId } } });
      const sameAsset = current.audioAssetId === assetId;
      const stored = sameAsset ? new Uint8Array(current.playedBitmap) : new Uint8Array(bitmap.length);
      const elapsedSeconds = sameAsset ? Math.max(0, (now.getTime() - current.lastListenedAt.getTime()) / 1000) : 0;
      const { bitmap: merged, playedSeconds } = command.merge(stored, command.budget(elapsedSeconds));
      const completedNow = !current.completedAt && playedSeconds >= Math.ceil(totalSeconds * command.completionRatio);
      const completedAt = current.completedAt ?? (completedNow ? now : null);
      await tx.listeningProgress.update({ where: { id: current.id }, data: { audioAssetId: assetId, positionMs, playedBitmap: new Uint8Array(merged), playedSeconds, completedAt, lastListenedAt: now } });
      const completion = completedNow ? await this.awardCompletion(tx, command) : null;
      return { positionMs, playedSeconds, completedAt, completion };
    });
  }

  async listPublicSeries(query: PublicSeriesQuery): Promise<{ items: SeriesWithCoverAndCount[]; total: number }> {
    const where: Prisma.SeriesWhereInput = {
      ...PUBLIC_SERIES_WHERE,
      ...(query.topicId ? { topicId: query.topicId } : {}),
      ...(query.historicalPhaseId ? { historicalPhaseId: query.historicalPhaseId } : {}),
      ...(query.periodId ? { historicalPhase: { periodId: query.periodId } } : {}),
      ...(query.toYear !== undefined ? { startYear: { lte: query.toYear } } : {}),
      ...(query.fromYear !== undefined ? { endYear: { gte: query.fromYear } } : {}),
      ...(query.q ? { title: { contains: query.q, mode: "insensitive" as const } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.series.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { publishedAt: "desc" as const },
        include: { coverImageAsset: true, _count: { select: { episodes: { where: { status: "PUBLISHED" as const, deletedAt: null } } } } },
      }),
      this.db.series.count({ where }),
    ]);
    return { items: rows.map(toSeriesWithCoverAndCount), total };
  }

  async findPublicSeriesBySlug(slug: string): Promise<SeriesDetailEntity | null> {
    const row = await this.db.series.findFirst({
      where: { slug, ...PUBLIC_SERIES_WHERE },
      include: {
        coverImageAsset: true,
        episodes: { where: { status: "PUBLISHED" as const, deletedAt: null }, orderBy: { sortOrder: "asc" }, include: { narrations: { include: { audioAsset: true } } } },
        sources: { orderBy: { sortOrder: "asc" }, include: SERIES_SOURCE_INCLUDE },
      },
    });
    return row ? toSeriesDetail(row) : null;
  }

  async findProgressByEpisodeIds(userId: string, episodeIds: string[]): Promise<ListeningProgressEntity[]> {
    if (episodeIds.length === 0) return [];
    const rows = await this.db.listeningProgress.findMany({ where: { userId, episodeId: { in: episodeIds } } });
    return rows.map(toProgress);
  }

  async findPublicEpisodeBySlug(slug: string): Promise<EpisodeDetailEntity | null> {
    const row = await this.db.episode.findFirst({
      where: { slug, status: "PUBLISHED" as const, deletedAt: null, series: PUBLIC_SERIES_WHERE },
      include: {
        series: { include: { coverImageAsset: true, episodes: { where: { status: "PUBLISHED" as const, deletedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, title: true } }, sources: { orderBy: { sortOrder: "asc" }, include: SERIES_SOURCE_INCLUDE } } },
        narrations: { include: { narratorEntity: { select: { id: true, entityType: true, name: true } }, audioAsset: true } },
        entityTags: { where: { status: "CONFIRMED" as const }, include: { entity: { select: { id: true, entityType: true, name: true } } } },
        quiz: { select: { id: true } },
      },
    });
    return row ? toEpisodeDetail(row) : null;
  }

  async findProgressForEpisode(userId: string, episodeId: string): Promise<ListeningProgressWithAudio[]> {
    const rows = await this.db.listeningProgress.findMany({ where: { userId, episodeId }, include: { audioAsset: true } });
    return rows.map(toProgressWithAudio);
  }

  async listListeningHistory(userId: string): Promise<ListeningProgressWithHistory[]> {
    const rows = await this.db.listeningProgress.findMany({
      where: { userId },
      orderBy: { lastListenedAt: "desc" },
      include: { audioAsset: true, episode: { include: { series: true } } },
    });
    return rows.map(toProgressWithHistory);
  }

  /** Awards episode-completion XP and counts the episode towards active weekly missions. */
  private async awardCompletion(db: Prisma.TransactionClient, command: ApplyProgressCommand): Promise<CompletionAward> {
    const { userId, episodeId, now, weekStartDate, xpPerEpisodeCompletion } = command;
    const created = await db.xpAward.createMany({ data: [{ userId, sourceType: "EPISODE_COMPLETION", sourceId: episodeId, xpAmount: xpPerEpisodeCompletion }], skipDuplicates: true });
    if (created.count) await db.user.update({ where: { id: userId }, data: { totalXp: { increment: xpPerEpisodeCompletion } } });
    const missions = await db.weeklyMission.findMany({ where: { activityType: "COMPLETE_EPISODE", weekStartDate, activatedAt: { lte: now } } });
    const updates: MissionProgressSummary[] = [];
    for (const mission of missions) {
      const userMission = await db.userWeeklyMission.upsert({ where: { weeklyMissionId_userId: { weeklyMissionId: mission.id, userId } }, create: { weeklyMissionId: mission.id, userId }, update: {} });
      const item = await db.userWeeklyMissionItem.createMany({ data: [{ userWeeklyMissionId: userMission.id, contentId: episodeId }], skipDuplicates: true });
      if (!item.count) continue;
      const progress = await db.userWeeklyMission.update({ where: { id: userMission.id }, data: { progressCount: { increment: 1 } } });
      let missionXp = 0;
      let completedMissionNow = false;
      if (!progress.completedAt && progress.progressCount >= mission.targetCount) {
        await db.userWeeklyMission.update({ where: { id: progress.id }, data: { completedAt: now } });
        const award = await db.xpAward.createMany({ data: [{ userId, sourceType: "WEEKLY_MISSION", sourceId: mission.id, xpAmount: mission.xpReward }], skipDuplicates: true });
        if (award.count) {
          missionXp = mission.xpReward;
          completedMissionNow = true;
          await db.user.update({ where: { id: userId }, data: { totalXp: { increment: mission.xpReward } } });
        }
      }
      updates.push({ id: mission.id, title: mission.title, progress: progress.progressCount, target: mission.targetCount, completedNow: completedMissionNow, xpAwarded: missionXp });
    }
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { totalXp: true } });
    return { xpAwarded: created.count ? xpPerEpisodeCompletion : 0, totalXp: user.totalXp, missions: updates };
  }
}
