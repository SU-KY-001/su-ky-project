import { Prisma, prisma } from "@repo/db";
import { ListeningHistoryQuerySchema, PublicSeriesListQuerySchema, UpdateListeningProgressRequestSchema } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { DomainError } from "../../../core/errors/domain-error";
import { rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { attachSession, requireAuth } from "../../auth";
import type { MediaStorageGateway } from "../../media";
import type { ListeningService } from "../listening.service";

const slugParam = z.object({ slug: z.string().min(1) });
const narrationParam = z.object({ narrationId: z.string().uuid() });

export function createPublicListeningRoute(service: ListeningService, storage: MediaStorageGateway) {
  return new Hono<AppEnv>()
    .use("*", attachSession)
    .get("/series", zValidator("query", PublicSeriesListQuerySchema, throwOnInvalid), async (c) => {
      const { page, limit, topicId, historicalPeriodId, fromYear, toYear, q } = c.req.valid("query");
      const where: Prisma.SeriesWhereInput = { status: "PUBLISHED", deletedAt: null,
        ...(topicId ? { topicId } : {}), ...(historicalPeriodId ? { historicalPeriodId } : {}),
        ...(toYear !== undefined ? { startYear: { lte: toYear } } : {}), ...(fromYear !== undefined ? { endYear: { gte: fromYear } } : {}),
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      };
      const [rows, total] = await Promise.all([prisma.series.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { publishedAt: "desc" }, include: { coverImageAsset: true, _count: { select: { episodes: { where: { status: "PUBLISHED", deletedAt: null } } } } } }), prisma.series.count({ where })]);
      const items = rows.map((series) => ({ id: series.id, slug: series.slug, title: series.title, description: series.description, startYear: series.startYear, endYear: series.endYear, cover: series.coverImageAsset ? { url: storage.deliveryUrl(series.coverImageAsset) } : null, episodeCount: series._count.episodes, publishedAt: series.publishedAt }));
      return c.json({ items, page, limit, total });
    })
    .get("/series/:slug", zValidator("param", slugParam, throwOnInvalid), async (c) => {
      const series = await prisma.series.findFirst({ where: { slug: c.req.valid("param").slug, status: "PUBLISHED", deletedAt: null }, include: { coverImageAsset: true, episodes: { where: { status: "PUBLISHED", deletedAt: null }, orderBy: { sortOrder: "asc" }, include: { narrations: { include: { audioAsset: true } } } } } });
      if (!series) throw new DomainError(404, "NOT_FOUND", "Series not found");
      const session = c.get("session");
      const progress = session ? await prisma.listeningProgress.findMany({ where: { userId: session.user.id, episodeId: { in: series.episodes.map((episode) => episode.id) } } }) : [];
      return c.json({ id: series.id, slug: series.slug, title: series.title, description: series.description, startYear: series.startYear, endYear: series.endYear, cover: series.coverImageAsset ? { url: storage.deliveryUrl(series.coverImageAsset) } : null,
        episodes: series.episodes.map((episode) => ({ id: episode.id, slug: episode.slug, title: episode.title, sortOrder: episode.sortOrder, narrations: episode.narrations.map((narration) => ({ id: narration.id, type: narration.narrationType, durationMs: narration.audioAsset?.durationMs ?? null, available: narration.audioAsset?.status === "READY" })), viewer: session ? { isCompleted: progress.some((item) => item.episodeId === episode.id && item.completedAt), progress: progress.filter((item) => item.episodeId === episode.id).map((item) => ({ narrationId: item.narrationId, positionMs: item.positionMs, completedAt: item.completedAt })) } : null })) });
    })
    .get("/episodes/:slug", zValidator("param", slugParam, throwOnInvalid), async (c) => {
      const episode = await prisma.episode.findFirst({ where: { slug: c.req.valid("param").slug, status: "PUBLISHED", deletedAt: null, series: { status: "PUBLISHED", deletedAt: null } }, include: { series: { include: { coverImageAsset: true, episodes: { where: { status: "PUBLISHED", deletedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, title: true } } } }, narrations: { include: { narratorEntity: { select: { id: true, name: true } }, audioAsset: true } }, sources: { orderBy: { sortOrder: "asc" }, include: { source: true } }, entityTags: { where: { status: "CONFIRMED" }, include: { entity: { select: { id: true, entityType: true, name: true } } } }, quiz: { select: { id: true } } } });
      if (!episode) throw new DomainError(404, "NOT_FOUND", "Episode not found");
      const index = episode.series.episodes.findIndex((item) => item.id === episode.id);
      const session = c.get("session");
      const saved = session ? await prisma.listeningProgress.findMany({ where: { userId: session.user.id, episodeId: episode.id }, include: { audioAsset: true } }) : [];
      return c.json({ id: episode.id, slug: episode.slug, title: episode.title, description: episode.description, publishedAt: episode.publishedAt,
        series: { id: episode.series.id, slug: episode.series.slug, title: episode.series.title, startYear: episode.series.startYear, endYear: episode.series.endYear, cover: episode.series.coverImageAsset ? { url: storage.deliveryUrl(episode.series.coverImageAsset) } : null },
        narrations: episode.narrations.map((item) => ({ id: item.id, type: item.narrationType, narrator: item.narratorEntity, durationMs: item.audioAsset?.durationMs ?? null, available: item.audioAsset?.status === "READY" })),
        sources: episode.sources.map((item) => ({ title: item.source.title, author: item.source.author, tier: item.source.tier, locator: item.locator, url: item.source.url })), entities: episode.entityTags.map((item) => item.entity),
        previousEpisode: index > 0 ? episode.series.episodes[index - 1] : null, nextEpisode: index >= 0 && index < episode.series.episodes.length - 1 ? episode.series.episodes[index + 1] : null, hasQuiz: Boolean(episode.quiz),
        viewer: session ? { isCompleted: saved.some((item) => item.completedAt), progress: saved.map((item) => ({ narrationId: item.narrationId, positionMs: item.positionMs, percent: Math.min(100, item.playedSeconds / Math.ceil((item.audioAsset.durationMs ?? 1) / 1000) * 100), completedAt: item.completedAt })) } : null });
    })
    .get("/narrations/:narrationId/playback", requireAuth, zValidator("param", narrationParam, throwOnInvalid), async (c) => {
      c.header("Cache-Control", "private, no-store");
      return c.json(await service.playback(c.req.valid("param").narrationId, c.get("session")!.user.id));
    });
}

export function createMeListeningRoute(service: ListeningService) {
  return new Hono<AppEnv>()
    .use("*", requireAuth)
    .get("/listening-progress/:narrationId", zValidator("param", narrationParam, throwOnInvalid), async (c) => c.json(await service.getProgress(c.req.valid("param").narrationId, c.get("session")!.user.id)))
    .put("/listening-progress/:narrationId", rateLimit("listening_progress"), zValidator("param", narrationParam, throwOnInvalid), zValidator("json", UpdateListeningProgressRequestSchema, throwOnInvalid), async (c) => c.json(await service.updateProgress(c.req.valid("param").narrationId, c.get("session")!.user.id, c.req.valid("json"))))
    .get("/listening-history", zValidator("query", ListeningHistoryQuerySchema, throwOnInvalid), async (c) => {
      const userId = c.get("session")!.user.id; const { page, limit, status } = c.req.valid("query");
      const rows = await prisma.listeningProgress.findMany({ where: { userId }, orderBy: { lastListenedAt: "desc" }, include: { audioAsset: true, episode: { include: { series: true } } } });
      const grouped = new Map<string, typeof rows[number]>(); for (const row of rows) if (!grouped.has(row.episodeId)) grouped.set(row.episodeId, row);
      const all = [...grouped.values()].map((row) => { const episodeRows = rows.filter((item) => item.episodeId === row.episodeId); const isCompleted = episodeRows.some((item) => item.completedAt); const available = row.episode.status === "PUBLISHED" && !row.episode.deletedAt && row.episode.series.status === "PUBLISHED" && !row.episode.series.deletedAt; return { episode: { id: row.episode.id, slug: row.episode.slug, title: row.episode.title, available, series: { slug: row.episode.series.slug, title: row.episode.series.title } }, lastListenedAt: row.lastListenedAt, lastNarrationId: row.narrationId, lastPositionMs: row.positionMs, percent: Math.max(...episodeRows.map((item) => Math.min(100, item.playedSeconds / Math.ceil((item.audioAsset.durationMs ?? 1) / 1000) * 100))), isCompleted }; }).filter((item) => status === "all" || (status === "completed" ? item.isCompleted : !item.isCompleted));
      return c.json({ items: all.slice((page - 1) * limit, page * limit), page, limit, total: all.length });
    });
}
