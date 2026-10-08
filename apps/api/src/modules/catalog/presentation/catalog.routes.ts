import { prisma } from "@repo/db";
import {
  HistoricalEntityInputSchema, HistoricalEntityQuerySchema, PatchHistoricalEntitySchema,
  PatchSourceSchema, SourceInputSchema, SourceQuerySchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { DomainError } from "../../../core/errors/domain-error";
import { idempotency, rateLimit, throwOnInvalid } from "../../../core/middleware";
import { insertWithUniqueSlug } from "../../../core/slug";
import { requireAuth, requireRole } from "../../auth";
import type { AppEnv } from "../../../types";

const idParam = z.object({ id: z.string().uuid() });
const similarSourceQuery = z.object({ title: z.string().trim().min(1), author: z.string().trim().optional(), isbn: z.string().trim().optional() });
const similarEntityQuery = z.object({ name: z.string().trim().min(1), type: z.enum(["FIGURE", "EVENT"]).optional() });
const normalizeIsbn = (value?: string | null) => value?.replace(/[\s-]/g, "").toUpperCase() || null;


export const publicCatalogRoute = new Hono<AppEnv>()
  .get("/topics", async (c) => c.json({ items: await prisma.topic.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true } }) }))
  .get("/historical-periods", async (c) => c.json({ items: await prisma.historicalPeriod.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true, startYear: true, endYear: true } }) }));

export const studioCatalogRoute = new Hono<AppEnv>()
  .use("*", requireAuth, requireRole("moderator", "admin"))
  .get("/sources/similar", zValidator("query", similarSourceQuery, throwOnInvalid), async (c) => {
    const query = c.req.valid("query");
    const items = await prisma.source.findMany({ where: { archivedAt: null, OR: [
      { title: { contains: query.title, mode: "insensitive" } },
      ...(query.author ? [{ author: { contains: query.author, mode: "insensitive" as const } }] : []),
      ...(query.isbn ? [{ isbn: normalizeIsbn(query.isbn) }] : []),
    ] }, take: 10, orderBy: { title: "asc" } });
    return c.json({ items });
  })
  .get("/sources", zValidator("query", SourceQuerySchema, throwOnInvalid), async (c) => {
    const { page, limit, q, tier, includeArchived } = c.req.valid("query");
    const where = { ...(includeArchived ? {} : { archivedAt: null }), ...(tier ? { tier } : {}), ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" as const } }, { originalTitle: { contains: q, mode: "insensitive" as const } },
      { author: { contains: q, mode: "insensitive" as const } }, { isbn: normalizeIsbn(q) },
    ] } : {}) };
    const [items, total] = await Promise.all([
      prisma.source.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { title: "asc" } }),
      prisma.source.count({ where }),
    ]);
    return c.json({ items, page, limit, total });
  })
  .get("/sources/:id", zValidator("param", idParam, throwOnInvalid), async (c) => {
    const source = await prisma.source.findUnique({ where: { id: c.req.valid("param").id }, include: { _count: { select: { episodeSources: true } } } });
    if (!source) throw new DomainError(404, "NOT_FOUND", "Source not found");
    const { _count, ...item } = source;
    return c.json({ ...item, usageCount: _count.episodeSources });
  })
  .post("/sources", idempotency(), rateLimit("write"), zValidator("json", SourceInputSchema, throwOnInvalid), async (c) => {
    const session = c.get("session")!;
    const input = c.req.valid("json");
    const isbn = normalizeIsbn(input.isbn);
    const sourceId = crypto.randomUUID();
    const inserted = await prisma.source.createMany({ data: [{ id: sourceId, ...input, isbn, createdById: session.user.id }], skipDuplicates: true });
    if (!inserted.count) {
      const existing = await prisma.source.findFirst({ where: { isbn }, select: { id: true } });
      if (existing) throw new DomainError(409, "SOURCE_ISBN_TAKEN", `ISBN already belongs to source ${existing.id}`);
      throw new DomainError(409, "CONFLICT", "Source could not be created");
    }
    const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
    c.header("Location", `/api/studio/sources/${source.id}`);
    return c.json(source, 201);
  })
  .patch("/sources/:id", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), zValidator("json", PatchSourceSchema, throwOnInvalid), async (c) => {
    const session = c.get("session")!;
    const id = c.req.valid("param").id;
    const existing = await prisma.source.findUnique({ where: { id } });
    if (!existing || (session.user.role !== "admin" && existing.createdById !== session.user.id)) throw new DomainError(404, "NOT_FOUND", "Source not found");
    const input = c.req.valid("json");
    const isbn = input.isbn === undefined ? undefined : normalizeIsbn(input.isbn);
    if (isbn) {
      const duplicate = await prisma.source.findFirst({ where: { isbn, id: { not: id } }, select: { id: true } });
      if (duplicate) throw new DomainError(409, "SOURCE_ISBN_TAKEN", `ISBN already belongs to source ${duplicate.id}`);
    }
    return c.json(await prisma.source.update({ where: { id }, data: { ...input, isbn } }));
  })
  .post("/sources/:id/archive", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
    const id = c.req.valid("param").id;
    const session = c.get("session")!;
    const source = await prisma.source.findUnique({ where: { id } });
    if (!source || (session.user.role !== "admin" && source.createdById !== session.user.id)) throw new DomainError(404, "NOT_FOUND", "Source not found");
    return c.json(await prisma.source.update({ where: { id }, data: { archivedAt: source.archivedAt ?? new Date() } }));
  })
  .post("/sources/:id/unarchive", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
    const id = c.req.valid("param").id;
    const session = c.get("session")!;
    const source = await prisma.source.findUnique({ where: { id } });
    if (!source || (session.user.role !== "admin" && source.createdById !== session.user.id)) throw new DomainError(404, "NOT_FOUND", "Source not found");
    return c.json(await prisma.source.update({ where: { id }, data: { archivedAt: null } }));
  })
  .get("/historical-entities/similar", zValidator("query", similarEntityQuery, throwOnInvalid), async (c) => {
    const query = c.req.valid("query");
    return c.json({ items: await prisma.historicalEntity.findMany({ where: { ...(query.type ? { entityType: query.type } : {}), OR: [{ name: { contains: query.name, mode: "insensitive" } }, { aliases: { has: query.name } }] }, take: 10, orderBy: { name: "asc" } }) });
  })
  .get("/historical-entities", zValidator("query", HistoricalEntityQuerySchema, throwOnInvalid), async (c) => {
    const { page, limit, q, type } = c.req.valid("query");
    const where = { ...(type ? { entityType: type } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { aliases: { has: q } }] } : {}) };
    const [items, total] = await Promise.all([prisma.historicalEntity.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: "asc" } }), prisma.historicalEntity.count({ where })]);
    return c.json({ items, page, limit, total });
  })
  .get("/historical-entities/:id", zValidator("param", idParam, throwOnInvalid), async (c) => {
    const item = await prisma.historicalEntity.findUnique({ where: { id: c.req.valid("param").id } });
    if (!item) throw new DomainError(404, "NOT_FOUND", "Historical entity not found");
    return c.json(item);
  })
  .post("/historical-entities", idempotency(), rateLimit("write"), zValidator("json", HistoricalEntityInputSchema, throwOnInvalid), async (c) => {
    const session = c.get("session")!;
    const input = c.req.valid("json");
    let createdId = "";
    await insertWithUniqueSlug(input.name, async (slug) => {
      const result = await prisma.historicalEntity.createMany({ data: [{ ...input, slug, createdById: session.user.id }], skipDuplicates: true });
      if (!result.count) return false;
      createdId = (await prisma.historicalEntity.findUniqueOrThrow({ where: { slug }, select: { id: true } })).id;
      return true;
    });
    const item = await prisma.historicalEntity.findUniqueOrThrow({ where: { id: createdId } });
    c.header("Location", `/api/studio/historical-entities/${item.id}`);
    return c.json(item, 201);
  })
  .patch("/historical-entities/:id", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), zValidator("json", PatchHistoricalEntitySchema, throwOnInvalid), async (c) => {
    const session = c.get("session")!;
    const id = c.req.valid("param").id;
    const existing = await prisma.historicalEntity.findUnique({ where: { id } });
    if (!existing || (session.user.role !== "admin" && existing.createdById !== session.user.id)) throw new DomainError(404, "NOT_FOUND", "Historical entity not found");
    return c.json(await prisma.historicalEntity.update({ where: { id }, data: c.req.valid("json") }));
  });
