import { Prisma, prisma } from "@repo/db";
import {
  AttachAudioSchema, CreateEntityTagSchema, CreateEpisodeSchema, CreateEpisodeSourceSchema,
  EpisodeSourceOrderSchema, NarrationTypeSchema, PatchEntityTagSchema, PatchEpisodeSchema,
  PatchEpisodeSourceSchema, PutNarrationSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { DomainError } from "../../../core/errors/domain-error";
import { idempotency, rateLimit, throwOnInvalid } from "../../../core/middleware";
import { insertWithUniqueSlug } from "../../../core/slug";
import type { AppEnv } from "../../../types";
import { requireAuth, requireRole } from "../../auth";
import type { MediaStorageGateway } from "../../media/application/media-storage";
import { assertBaseUpdatedAt, assertWritable, loadEpisodeForRead, loadSeriesForRead } from "../application/content-access";
import { mapEntityTag, mapEpisodeSource, mapNarration } from "../application/content-mappers";
import { appendEpisodes } from "../application/content-writer";

const idParam = z.object({ id: z.string().uuid() });
const seriesParam = z.object({ seriesId: z.string().uuid() });
const narrationParam = z.object({ id: z.string().uuid(), type: NarrationTypeSchema });
const childParam = z.object({ id: z.string().uuid(), childId: z.string().uuid() });

const episodeInclude = {
  series: true,
  narrations: { include: { narratorEntity: { select: { id: true, name: true } }, audioAsset: true } },
  sources: { orderBy: { sortOrder: "asc" as const }, include: { source: { select: { id: true, tier: true, title: true, author: true, publicationYear: true, url: true } } } },
  entityTags: { include: { entity: { select: { id: true, entityType: true, name: true } } } },
} satisfies Prisma.EpisodeInclude;
type IncludedEpisode = Prisma.EpisodeGetPayload<{ include: typeof episodeInclude }>;

function episodeChecklist(episode: IncludedEpisode) {
  const third = episode.narrations.find((item) => item.narrationType === "THIRD_PERSON");
  const items = [
    { key: "BASIC_INFO", ok: Boolean(episode.title.trim()) }, { key: "HAS_SOURCE", ok: episode.sources.length > 0 },
    { key: "THIRD_PERSON_SCRIPT", ok: Boolean(third?.scriptContent?.trim()) }, { key: "THIRD_PERSON_AUDIO", ok: third?.audioAsset?.status === "READY" },
  ];
  const warnings: Array<{ key: string; count?: number }> = [];
  if (episode.series.status !== "PUBLISHED") warnings.push({ key: "SERIES_NOT_PUBLISHED" });
  const unconfirmed = episode.entityTags.filter((tag) => tag.status !== "CONFIRMED").length;
  if (unconfirmed) warnings.push({ key: "ENTITY_TAGS_UNCONFIRMED", count: unconfirmed });
  return { ready: items.every((item) => item.ok), items, warnings };
}

async function fullEpisode(id: string) {
  const episode = await prisma.episode.findUnique({ where: { id }, include: episodeInclude });
  if (!episode) throw new DomainError(404, "NOT_FOUND", "Episode not found");
  return episode;
}

async function mapWorkspace(episode: IncludedEpisode, storage?: MediaStorageGateway) {
  return {
    id: episode.id, seriesId: episode.seriesId, seriesTitle: episode.series.title, seriesStatus: episode.series.status,
    title: episode.title, slug: episode.slug, description: episode.description, sortOrder: episode.sortOrder, status: episode.status,
    isDeleted: Boolean(episode.deletedAt), lock: episode.adminLockedAt ? { lockedAt: episode.adminLockedAt, lockedBy: episode.adminLockedById } : null,
    publishedAt: episode.publishedAt, updatedAt: episode.updatedAt,
    narrations: await Promise.all(episode.narrations.map((item) => mapNarration(item, storage))),
    sources: episode.sources.map(mapEpisodeSource), entityTags: episode.entityTags.map(mapEntityTag), publishChecklist: episodeChecklist(episode),
  };
}

export function createEpisodeRoute(storage?: MediaStorageGateway) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .post("/series/:seriesId/episodes", idempotency(), rateLimit("write"), zValidator("param", seriesParam, throwOnInvalid), zValidator("json", CreateEpisodeSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const seriesId = c.req.valid("param").seriesId;
      const series = await loadSeriesForRead(prisma, session, seriesId); assertWritable(session, series);
      const [created] = await prisma.$transaction((tx) => appendEpisodes(tx, seriesId, [c.req.valid("json")]));
      c.header("Location", `/api/studio/episodes/${created!.episodeId}`);
      return c.json(await mapWorkspace(await fullEpisode(created!.episodeId), storage), 201);
    })
    .get("/episodes/:id", zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id; await loadEpisodeForRead(prisma, session, id);
      return c.json(await mapWorkspace(await fullEpisode(id), storage));
    })
    .patch("/episodes/:id", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), zValidator("json", PatchEpisodeSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id; const current = await loadEpisodeForRead(prisma, session, id); assertWritable(session, current.series, current);
      const { baseUpdatedAt, ...input } = c.req.valid("json"); await assertBaseUpdatedAt(prisma, "episode", id, baseUpdatedAt);
      if (input.slug !== undefined && current.status !== "DRAFT") throw new DomainError(409, "SLUG_LOCKED", "Published or hidden episode slug cannot change");
      if (input.slug !== undefined) {
        input.slug = await insertWithUniqueSlug(input.slug, async (candidate) => {
          const conflict = await prisma.episode.findFirst({ where: { slug: candidate, id: { not: id } }, select: { id: true } });
          return !conflict;
        });
      }
      await prisma.episode.update({ where: { id }, data: input });
      return c.json(await mapWorkspace(await fullEpisode(id), storage));
    })
    .post("/episodes/:id/publish", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id; const current = await loadEpisodeForRead(prisma, session, id); assertWritable(session, current.series, current);
      const episode = await fullEpisode(id); if (!episodeChecklist(episode).ready) throw new DomainError(422, "EPISODE_NOT_PUBLISHABLE", "Episode does not meet publishing requirements");
      if (episode.status !== "PUBLISHED") await prisma.episode.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: episode.publishedAt ?? new Date() } });
      return c.json(await mapWorkspace(await fullEpisode(id), storage));
    })
    .post("/episodes/:id/hide", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id; const current = await loadEpisodeForRead(prisma, session, id); assertWritable(session, current.series, current);
      if (current.status === "DRAFT") throw new DomainError(409, "INVALID_STATE_TRANSITION", "Only published episodes can be hidden");
      if (current.status !== "HIDDEN") await prisma.episode.update({ where: { id }, data: { status: "HIDDEN" } });
      return c.json(await mapWorkspace(await fullEpisode(id), storage));
    })
    .delete("/episodes/:id", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id; const current = await loadEpisodeForRead(prisma, session, id);
      if (current.deletedAt) return c.body(null, 204);
      assertWritable(session, current.series, current);
      await prisma.episode.update({ where: { id }, data: { deletedAt: new Date(), statusBeforeDelete: current.status } });
      return c.body(null, 204);
    })
    .post("/episodes/:id/restore", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id; const current = await loadEpisodeForRead(prisma, session, id);
      if (current.series.deletedAt) throw new DomainError(409, "PARENT_IN_TRASH", "Restore the parent series first");
      if (session.user.role !== "admin" && (current.series.adminLockedAt || current.adminLockedAt)) throw new DomainError(403, "CONTENT_LOCKED", "Content is locked by an administrator");
      if (current.deletedAt) await prisma.episode.update({ where: { id }, data: { deletedAt: null, status: current.statusBeforeDelete ?? "DRAFT", statusBeforeDelete: null } });
      return c.json(await mapWorkspace(await fullEpisode(id), storage));
    })
    .get("/episodes/:id/narrations/:type", zValidator("param", narrationParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const { id, type } = c.req.valid("param"); await loadEpisodeForRead(prisma, session, id);
      const narration = await prisma.episodeNarration.findUnique({ where: { episodeId_narrationType: { episodeId: id, narrationType: type } }, include: { narratorEntity: { select: { id: true, name: true } }, audioAsset: true } });
      if (!narration) throw new DomainError(404, "NOT_FOUND", "Narration not found"); return c.json(await mapNarration(narration, storage));
    })
    .put("/episodes/:id/narrations/:type", rateLimit("write"), zValidator("param", narrationParam, throwOnInvalid), zValidator("json", PutNarrationSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const { id, type } = c.req.valid("param"); const episode = await loadEpisodeForRead(prisma, session, id); assertWritable(session, episode.series, episode);
      const { baseUpdatedAt, scriptContent, narratorEntityId } = c.req.valid("json");
      const current = await prisma.episodeNarration.findUnique({ where: { episodeId_narrationType: { episodeId: id, narrationType: type } } });
      if (current) await assertBaseUpdatedAt(prisma, "narration", current.id, baseUpdatedAt);
      if (type === "THIRD_PERSON" && episode.status === "PUBLISHED" && !scriptContent?.trim()) throw new DomainError(409, "REQUIRED_FOR_PUBLISHED", "Published episodes require a third-person script");
      if (type === "FIRST_PERSON") {
        if (!narratorEntityId) throw new DomainError(422, "VALIDATION_ERROR", "First-person narration requires a narrator");
        const entity = await prisma.historicalEntity.findUnique({ where: { id: narratorEntityId } });
        if (!entity || entity.entityType !== "FIGURE") throw new DomainError(422, "VALIDATION_ERROR", "Narrator must be a historical figure");
      }
      const narration = await prisma.episodeNarration.upsert({ where: { episodeId_narrationType: { episodeId: id, narrationType: type } }, create: { episodeId: id, narrationType: type, scriptContent, narratorEntityId: type === "FIRST_PERSON" ? narratorEntityId : null, scriptUpdatedAt: new Date() }, update: { scriptContent, narratorEntityId: type === "FIRST_PERSON" ? narratorEntityId : null, scriptUpdatedAt: new Date() }, include: { narratorEntity: { select: { id: true, name: true } }, audioAsset: true } });
      return c.json(await mapNarration(narration, storage));
    })
    .delete("/episodes/:id/narrations/FIRST_PERSON", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id; const episode = await loadEpisodeForRead(prisma, session, id); assertWritable(session, episode.series, episode);
      const narration = await prisma.episodeNarration.findUnique({ where: { episodeId_narrationType: { episodeId: id, narrationType: "FIRST_PERSON" } } });
      if (!narration) return c.body(null, 204);
      await prisma.$transaction(async (tx) => { if (narration.audioAssetId) await tx.mediaAsset.update({ where: { id: narration.audioAssetId }, data: { detachedAt: new Date() } }); await tx.episodeNarration.delete({ where: { id: narration.id } }); });
      return c.body(null, 204);
    })
    .get("/episodes/:id/narrations/:type/ai-original", zValidator("param", narrationParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const { id, type } = c.req.valid("param"); await loadEpisodeForRead(prisma, session, id);
      const narration = await prisma.episodeNarration.findUnique({ where: { episodeId_narrationType: { episodeId: id, narrationType: type } }, include: { scriptPublication: true } });
      if (!narration?.scriptPublication || !narration.scriptPublicationEpisodeNo) throw new DomainError(404, "NOT_FOUND", "AI original is not available");
      const segment = narration.scriptPublication.finalScript.split("\n\n---\n\n")[narration.scriptPublicationEpisodeNo - 1];
      const content = segment?.slice(segment.indexOf("\n\n") + 2);
      if (!content) throw new DomainError(404, "NOT_FOUND", "AI original is not available"); return c.json({ scriptContent: content });
    })
    .put("/episodes/:id/narrations/:type/audio", rateLimit("write"), zValidator("param", narrationParam, throwOnInvalid), zValidator("json", AttachAudioSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const { id, type } = c.req.valid("param"); const episode = await loadEpisodeForRead(prisma, session, id); assertWritable(session, episode.series, episode);
      const input = c.req.valid("json"); const asset = await prisma.mediaAsset.findUnique({ where: { id: input.assetId } });
      if (!asset || asset.kind !== "AUDIO" || asset.status !== "READY" || (session.user.role !== "admin" && asset.uploadedById !== session.user.id)) throw new DomainError(422, "VALIDATION_ERROR", "Audio asset is not usable");
      const narration = await prisma.episodeNarration.findUnique({ where: { episodeId_narrationType: { episodeId: id, narrationType: type } } });
      if (!narration) throw new DomainError(404, "NOT_FOUND", "Narration not found");
      const used = await prisma.episodeNarration.findFirst({ where: { audioAssetId: asset.id, id: { not: narration.id } } }); if (used) throw new DomainError(409, "ASSET_IN_USE", "Audio asset is already attached");
      if (episode.status === "PUBLISHED" && narration.audioAssetId && narration.audioAssetId !== asset.id && !input.confirmReplacePublished) throw new DomainError(409, "REPLACE_CONFIRMATION_REQUIRED", "Confirm replacing published audio");
      await prisma.$transaction(async (tx) => { if (narration.audioAssetId && narration.audioAssetId !== asset.id) await tx.mediaAsset.update({ where: { id: narration.audioAssetId }, data: { detachedAt: new Date() } }); await tx.mediaAsset.update({ where: { id: asset.id }, data: { detachedAt: null } }); await tx.episodeNarration.update({ where: { id: narration.id }, data: { audioAssetId: asset.id, audioProvider: input.provider, audioAttachedAt: new Date() } }); });
      const updated = await prisma.episodeNarration.findUniqueOrThrow({ where: { id: narration.id }, include: { narratorEntity: { select: { id: true, name: true } }, audioAsset: true } }); return c.json(await mapNarration(updated, storage));
    })
    .delete("/episodes/:id/narrations/:type/audio", rateLimit("write"), zValidator("param", narrationParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const { id, type } = c.req.valid("param"); const episode = await loadEpisodeForRead(prisma, session, id); assertWritable(session, episode.series, episode);
      const narration = await prisma.episodeNarration.findUnique({ where: { episodeId_narrationType: { episodeId: id, narrationType: type } } }); if (!narration) throw new DomainError(404, "NOT_FOUND", "Narration not found");
      if (episode.status === "PUBLISHED" && type === "THIRD_PERSON") throw new DomainError(409, "REQUIRED_FOR_PUBLISHED", "Published episodes require third-person audio");
      await prisma.$transaction(async (tx) => { if (narration.audioAssetId) await tx.mediaAsset.update({ where: { id: narration.audioAssetId }, data: { detachedAt: new Date() } }); await tx.episodeNarration.update({ where: { id: narration.id }, data: { audioAssetId: null, audioProvider: null, audioAttachedAt: null } }); }); return c.body(null, 204);
    })
    .get("/episodes/:id/sources", zValidator("param", idParam, throwOnInvalid), async (c) => { const session = c.get("session")!; const id = c.req.valid("param").id; await loadEpisodeForRead(prisma, session, id); const items = await prisma.episodeSource.findMany({ where: { episodeId: id }, orderBy: { sortOrder: "asc" }, include: { source: { select: { id: true, tier: true, title: true, author: true, publicationYear: true, url: true } } } }); return c.json({ items: items.map(mapEpisodeSource) }); })
    .post("/episodes/:id/sources", idempotency(), rateLimit("write"), zValidator("param", idParam, throwOnInvalid), zValidator("json", CreateEpisodeSourceSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!; const id = c.req.valid("param").id; const episode = await loadEpisodeForRead(prisma, session, id); assertWritable(session, episode.series, episode); const input = c.req.valid("json");
      const max = await prisma.episodeSource.aggregate({ where: { episodeId: id }, _max: { sortOrder: true } }); const created = await prisma.episodeSource.createMany({ data: [{ episodeId: id, ...input, origin: "MODERATOR", sortOrder: (max._max.sortOrder ?? 0) + 1 }], skipDuplicates: true });
      if (!created.count) throw new DomainError(409, "EPISODE_SOURCE_DUPLICATE", "Source is already attached at this locator"); const item = await prisma.episodeSource.findFirstOrThrow({ where: { episodeId: id, sourceId: input.sourceId, locator: input.locator }, include: { source: { select: { id: true, tier: true, title: true, author: true, publicationYear: true, url: true } } } }); c.header("Location", `/api/studio/episodes/${id}/sources/${item.id}`); return c.json(mapEpisodeSource(item), 201);
    })
    .patch("/episodes/:id/sources/:childId", rateLimit("write"), zValidator("param", childParam, throwOnInvalid), zValidator("json", PatchEpisodeSourceSchema, throwOnInvalid), async (c) => {
      const { id, childId } = c.req.valid("param");
      const session = c.get("session")!;
      const episode = await loadEpisodeForRead(prisma, session, id);
      assertWritable(session, episode.series, episode);
      const existing = await prisma.episodeSource.findFirst({ where: { id: childId, episodeId: id } });
      if (!existing) throw new DomainError(404, "NOT_FOUND", "Episode source not found");
      const item = await prisma.episodeSource.update({ where: { id: childId }, data: c.req.valid("json"), include: { source: { select: { id: true, tier: true, title: true, author: true, publicationYear: true, url: true } } } });
      return c.json(mapEpisodeSource(item));
    })
    .delete("/episodes/:id/sources/:childId", rateLimit("write"), zValidator("param", childParam, throwOnInvalid), async (c) => { const { id, childId } = c.req.valid("param"); const session = c.get("session")!; const episode = await loadEpisodeForRead(prisma, session, id); assertWritable(session, episode.series, episode); if (episode.status === "PUBLISHED" && await prisma.episodeSource.count({ where: { episodeId: id } }) <= 1) throw new DomainError(409, "REQUIRED_FOR_PUBLISHED", "Published episodes require a source"); await prisma.episodeSource.deleteMany({ where: { id: childId, episodeId: id } }); return c.body(null, 204); })
    .put("/episodes/:id/sources/order", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), zValidator("json", EpisodeSourceOrderSchema, throwOnInvalid), async (c) => { const id = c.req.valid("param").id; const session = c.get("session")!; const episode = await loadEpisodeForRead(prisma, session, id); assertWritable(session, episode.series, episode); const ids = c.req.valid("json").episodeSourceIds; const rows = await prisma.episodeSource.findMany({ where: { episodeId: id }, select: { id: true } }); if (ids.length !== rows.length || ids.some((value) => !rows.some((row) => row.id === value))) throw new DomainError(422, "EPISODE_ORDER_MISMATCH", "Source order must contain every source exactly once"); await prisma.$transaction(ids.map((sourceId, index) => prisma.episodeSource.update({ where: { id: sourceId }, data: { sortOrder: index + 1 } }))); return c.json({ items: await prisma.episodeSource.findMany({ where: { episodeId: id }, orderBy: { sortOrder: "asc" }, include: { source: { select: { id: true, tier: true, title: true, author: true, publicationYear: true, url: true } } } }) }); })
    .get("/episodes/:id/entity-tags", zValidator("param", idParam, throwOnInvalid), async (c) => { const id = c.req.valid("param").id; await loadEpisodeForRead(prisma, c.get("session")!, id); const items = await prisma.episodeEntityTag.findMany({ where: { episodeId: id }, include: { entity: { select: { id: true, entityType: true, name: true } } } }); return c.json({ items: items.map(mapEntityTag) }); })
    .post("/episodes/:id/entity-tags", idempotency(), rateLimit("write"), zValidator("param", idParam, throwOnInvalid), zValidator("json", CreateEntityTagSchema, throwOnInvalid), async (c) => { const id = c.req.valid("param").id; const session = c.get("session")!; const episode = await loadEpisodeForRead(prisma, session, id); assertWritable(session, episode.series, episode); const entityId = c.req.valid("json").entityId; await prisma.episodeEntityTag.createMany({ data: [{ episodeId: id, entityId, status: "CONFIRMED", origin: "MODERATOR", confirmedById: session.user.id, confirmedAt: new Date() }], skipDuplicates: true }); const item = await prisma.episodeEntityTag.findUniqueOrThrow({ where: { episodeId_entityId: { episodeId: id, entityId } }, include: { entity: { select: { id: true, entityType: true, name: true } } } }); return c.json(mapEntityTag(item), 200); })
    .patch("/episodes/:id/entity-tags/:childId", rateLimit("write"), zValidator("param", childParam, throwOnInvalid), zValidator("json", PatchEntityTagSchema, throwOnInvalid), async (c) => {
      const { id, childId } = c.req.valid("param");
      const session = c.get("session")!;
      const episode = await loadEpisodeForRead(prisma, session, id);
      assertWritable(session, episode.series, episode);
      const existing = await prisma.episodeEntityTag.findFirst({ where: { id: childId, episodeId: id } });
      if (!existing) throw new DomainError(404, "NOT_FOUND", "Entity tag not found");
      const status = c.req.valid("json").status;
      const item = await prisma.episodeEntityTag.update({ where: { id: childId }, data: { status, confirmedById: status === "CONFIRMED" ? session.user.id : null, confirmedAt: status === "CONFIRMED" ? new Date() : null }, include: { entity: { select: { id: true, entityType: true, name: true } } } });
      return c.json(mapEntityTag(item));
    })
    .delete("/episodes/:id/entity-tags/:childId", rateLimit("write"), zValidator("param", childParam, throwOnInvalid), async (c) => { const { id, childId } = c.req.valid("param"); const session = c.get("session")!; const episode = await loadEpisodeForRead(prisma, session, id); assertWritable(session, episode.series, episode); await prisma.episodeEntityTag.deleteMany({ where: { id: childId, episodeId: id } }); return c.body(null, 204); });
}
