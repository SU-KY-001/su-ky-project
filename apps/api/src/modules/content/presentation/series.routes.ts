import { Prisma, prisma, type ContentStatus } from "@repo/db";
import { CreateSeriesSchema, EpisodeOrderSchema, PatchSeriesSchema, SeriesQuerySchema } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { writeAudit, requestIpAddress } from "../../../core/audit";
import { DomainError } from "../../../core/errors/domain-error";
import { idempotency, rateLimit, throwOnInvalid } from "../../../core/middleware";
import { insertWithUniqueSlug } from "../../../core/slug";
import type { AppEnv } from "../../../types";
import { requireAuth, requireRole } from "../../auth";
import type { MediaStorageGateway } from "../../media/application/media-storage";
import { assertBaseUpdatedAt, assertWritable, loadSeriesForRead } from "../application/content-access";
import { createSeriesDraft } from "../application/content-writer";

const idParam = z.object({ id: z.string().uuid() });
const seriesInclude = {
  topic: { select: { id: true, name: true } }, historicalPeriod: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } }, coverImageAsset: true,
  episodes: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" as const }, include: { narrations: { include: { audioAsset: true } }, _count: { select: { sources: true } } } },
  workflowRuns: { where: { status: { in: ["PENDING", "RUNNING", "WAITING_FOR_HUMAN"] } }, orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.SeriesInclude;

type IncludedSeries = Prisma.SeriesGetPayload<{ include: typeof seriesInclude }>;

function seriesChecklist(series: IncludedSeries) {
  const items = [
    { key: "TOPIC", ok: Boolean(series.topicId) }, { key: "HISTORICAL_PERIOD", ok: Boolean(series.historicalPeriodId) },
    { key: "YEAR_RANGE", ok: series.startYear != null && series.endYear != null && series.startYear <= series.endYear },
    { key: "HAS_PUBLISHED_EPISODE", ok: series.episodes.some((episode) => episode.status === "PUBLISHED") },
  ];
  return { ready: items.every((item) => item.ok), items };
}

function mapSeriesDetail(series: IncludedSeries, storage?: MediaStorageGateway) {
  return {
    id: series.id, title: series.title, slug: series.slug, description: series.description, status: series.status,
    isDeleted: Boolean(series.deletedAt), lock: series.adminLockedAt ? { lockedAt: series.adminLockedAt, lockedBy: series.adminLockedById } : null,
    topic: series.topic, historicalPeriod: series.historicalPeriod, startYear: series.startYear, endYear: series.endYear,
    cover: series.coverImageAsset ? { assetId: series.coverImageAsset.id, url: storage?.deliveryUrl(series.coverImageAsset) ?? null } : null,
    owner: series.owner, publishedAt: series.publishedAt, updatedAt: series.updatedAt, publishChecklist: seriesChecklist(series),
    episodes: series.episodes.map((episode) => {
      const third = episode.narrations.find((item) => item.narrationType === "THIRD_PERSON");
      return { id: episode.id, title: episode.title, slug: episode.slug, sortOrder: episode.sortOrder, status: episode.status,
        progress: { hasSource: episode._count.sources > 0, hasThirdPersonScript: Boolean(third?.scriptContent?.trim()), hasThirdPersonAudio: third?.audioAsset?.status === "READY", isPublished: episode.status === "PUBLISHED" } };
    }),
    pendingAiRuns: series.workflowRuns.map((run) => ({ runId: run.id, status: run.status, awaitingStep: run.status === "WAITING_FOR_HUMAN" ? run.currentStep : null, createdAt: run.createdAt })),
  };
}

async function fullSeries(id: string) {
  const series = await prisma.series.findUnique({ where: { id }, include: seriesInclude });
  if (!series) throw new DomainError(404, "NOT_FOUND", "Series not found");
  return series;
}

export function createSeriesRoute(storage?: MediaStorageGateway) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .get("/", zValidator("query", SeriesQuerySchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const { page, limit, status, q, ownerId } = c.req.valid("query");
      const where: Prisma.SeriesWhereInput = {
        ...(session.user.role === "admin" ? (ownerId ? { ownerId } : {}) : { ownerId: session.user.id }),
        ...(status === "TRASH" ? { deletedAt: { not: null } } : { deletedAt: null, ...(status ? { status } : {}) }),
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      };
      const [rows, total] = await Promise.all([
        prisma.series.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { updatedAt: "desc" }, include: { coverImageAsset: true, episodes: { where: { deletedAt: null }, select: { status: true } } } }),
        prisma.series.count({ where }),
      ]);
      const items = rows.map((series) => ({ id: series.id, title: series.title, slug: series.slug, status: series.status, isDeleted: Boolean(series.deletedAt),
        lock: series.adminLockedAt ? { lockedAt: series.adminLockedAt, lockedBy: series.adminLockedById } : null,
        cover: series.coverImageAsset ? { assetId: series.coverImageAsset.id, url: storage?.deliveryUrl(series.coverImageAsset) ?? null } : null,
        startYear: series.startYear, endYear: series.endYear,
        episodeCounts: { published: series.episodes.filter((episode) => episode.status === "PUBLISHED").length, total: series.episodes.length }, updatedAt: series.updatedAt }));
      return c.json({ items, page, limit, total });
    })
    .post("/", idempotency(), rateLimit("write"), zValidator("json", CreateSeriesSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const input = c.req.valid("json");
      if (input.coverImageAssetId) {
        const asset = await prisma.mediaAsset.findUnique({ where: { id: input.coverImageAssetId } });
        if (!asset || asset.kind !== "IMAGE" || asset.status !== "READY" || (session.user.role !== "admin" && asset.uploadedById !== session.user.id)) {
          throw new DomainError(422, "VALIDATION_ERROR", "Cover image asset is not usable");
        }
      }
      const series = await prisma.$transaction(async (tx) => {
        const created = await createSeriesDraft(tx, { ownerId: session.user.id, ...input });
        if (created.coverImageAssetId) await tx.mediaAsset.update({ where: { id: created.coverImageAssetId }, data: { detachedAt: null } });
        await writeAudit(tx, { actorId: session.user.id, action: "series.created", resourceType: "series", resourceId: created.id, changes: { after: { title: created.title, slug: created.slug } }, ipAddress: requestIpAddress(c.req.raw.headers) });
        return created;
      });
      c.header("Location", `/api/studio/series/${series.id}`);
      return c.json(mapSeriesDetail(await fullSeries(series.id), storage), 201);
    })
    .get("/:id", zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const id = c.req.valid("param").id;
      await loadSeriesForRead(prisma, session, id);
      return c.json(mapSeriesDetail(await fullSeries(id), storage));
    })
    .patch("/:id", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), zValidator("json", PatchSeriesSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const id = c.req.valid("param").id;
      const current = await loadSeriesForRead(prisma, session, id);
      assertWritable(session, current);
      const { baseUpdatedAt, ...input } = c.req.valid("json");
      await assertBaseUpdatedAt(prisma, "series", id, baseUpdatedAt);
      if (input.slug !== undefined && current.status !== "DRAFT") throw new DomainError(409, "SLUG_LOCKED", "Published or hidden series slug cannot change");
      if (input.slug !== undefined) {
        input.slug = await insertWithUniqueSlug(input.slug, async (candidate) => {
          const conflict = await prisma.series.findFirst({ where: { slug: candidate, id: { not: id } }, select: { id: true } });
          return !conflict;
        });
      }
      if (input.coverImageAssetId) {
        const asset = await prisma.mediaAsset.findUnique({ where: { id: input.coverImageAssetId } });
        if (!asset || asset.kind !== "IMAGE" || asset.status !== "READY" || (session.user.role !== "admin" && asset.uploadedById !== session.user.id)) throw new DomainError(422, "VALIDATION_ERROR", "Cover image asset is not usable");
      }
      await prisma.$transaction(async (tx) => {
        if (current.coverImageAssetId && current.coverImageAssetId !== input.coverImageAssetId) await tx.mediaAsset.update({ where: { id: current.coverImageAssetId }, data: { detachedAt: new Date() } });
        if (input.coverImageAssetId) await tx.mediaAsset.update({ where: { id: input.coverImageAssetId }, data: { detachedAt: null } });
        await tx.series.update({ where: { id }, data: input });
        await writeAudit(tx, { actorId: session.user.id, action: "series.updated", resourceType: "series", resourceId: id, changes: { before: current as unknown as Prisma.InputJsonValue, after: input as Prisma.InputJsonValue }, ipAddress: requestIpAddress(c.req.raw.headers) });
      });
      return c.json(mapSeriesDetail(await fullSeries(id), storage));
    })
    .post("/:id/publish", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id;
      const current = await loadSeriesForRead(prisma, session, id); assertWritable(session, current);
      const series = await fullSeries(id); const checklist = seriesChecklist(series);
      if (!checklist.ready) throw new DomainError(422, "SERIES_NOT_PUBLISHABLE", "Series does not meet publishing requirements");
      if (series.status !== "PUBLISHED") await prisma.series.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: series.publishedAt ?? new Date() } });
      return c.json(mapSeriesDetail(await fullSeries(id), storage));
    })
    .post("/:id/hide", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id; const current = await loadSeriesForRead(prisma, session, id); assertWritable(session, current);
      if (current.status === "DRAFT") throw new DomainError(409, "INVALID_STATE_TRANSITION", "Only published series can be hidden");
      if (current.status !== "HIDDEN") await prisma.series.update({ where: { id }, data: { status: "HIDDEN" } });
      return c.json(mapSeriesDetail(await fullSeries(id), storage));
    })
    .delete("/:id", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id; const current = await loadSeriesForRead(prisma, session, id);
      if (current.deletedAt) return c.body(null, 204);
      assertWritable(session, current);
      await prisma.series.update({ where: { id }, data: { deletedAt: new Date(), statusBeforeDelete: current.status } });
      return c.body(null, 204);
    })
    .post("/:id/restore", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id; const current = await loadSeriesForRead(prisma, session, id);
      if (session.user.role !== "admin" && current.adminLockedAt) throw new DomainError(403, "CONTENT_LOCKED", "Content is locked by an administrator");
      if (current.deletedAt) await prisma.series.update({ where: { id }, data: { deletedAt: null, status: current.statusBeforeDelete ?? "DRAFT", statusBeforeDelete: null } });
      return c.json(mapSeriesDetail(await fullSeries(id), storage));
    })
    .put("/:id/episode-order", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), zValidator("json", EpisodeOrderSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id; const current = await loadSeriesForRead(prisma, session, id); assertWritable(session, current);
      const { episodeIds, baseUpdatedAt } = c.req.valid("json"); await assertBaseUpdatedAt(prisma, "series", id, baseUpdatedAt);
      const existing = await prisma.episode.findMany({ where: { seriesId: id, deletedAt: null }, select: { id: true } });
      if (new Set(existing.map((item) => item.id)).size !== episodeIds.length || episodeIds.some((episodeId) => !existing.some((item) => item.id === episodeId))) throw new DomainError(422, "EPISODE_ORDER_MISMATCH", "Episode order must contain every active episode exactly once");
      await prisma.$transaction([...episodeIds.map((episodeId, index) => prisma.episode.update({ where: { id: episodeId }, data: { sortOrder: index + 1 } })), prisma.series.update({ where: { id }, data: { updatedAt: new Date() } })]);
      return c.json(mapSeriesDetail(await fullSeries(id), storage).episodes);
    });
}
