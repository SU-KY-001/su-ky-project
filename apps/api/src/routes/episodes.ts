import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma, type Prisma } from "@repo/db";
import { EpisodeFilterQuerySchema } from "@repo/shared";

export const episodesRoute = new Hono<{ Variables: { requestId: string } }>()
  .get(
    "/",
    zValidator("query", EpisodeFilterQuerySchema, (result, c) => {
      if (!result.success) {
        const reqId = c.get("requestId") ?? c.req.header("X-Request-Id") ?? "unknown";
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid query parameters",
              details: result.error.flatten(),
            },
            meta: {
              requestId: reqId,
              timestamp: new Date().toISOString(),
            },
          },
          400
        );
      }
    }),
    async (c) => {
    const { period, category, search, page, limit } = c.req.valid("query");

    const where: Prisma.EpisodeWhereInput = {};

    if (period) {
      where.period = { slug: period };
    }

    if (category) {
      where.series = { category };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, episodes] = await Promise.all([
      prisma.episode.count({ where }),
      prisma.episode.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: "desc" },
        include: {
          period: {
            select: { id: true, name: true, slug: true },
          },
          series: {
            select: { id: true, title: true, slug: true, category: true },
          },
          _count: {
            select: { citations: true },
          },
        },
      }),
    ]);

    return c.json({
      success: true,
      data: episodes.map((ep) => ({
        id: ep.id,
        title: ep.title,
        slug: ep.slug,
        audioUrl: ep.audioUrl,
        durationSeconds: ep.durationSeconds,
        summary: ep.summary,
        orderNumber: ep.orderNumber,
        playCount: ep.playCount,
        publishedAt: ep.publishedAt,
        period: ep.period,
        series: ep.series,
        citationsCount: ep._count.citations,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        timestamp: new Date().toISOString(),
      },
    });
  })
  .get("/:slug", async (c) => {
    const slug = c.req.param("slug");

    const episode = await prisma.episode.findUnique({
      where: { slug },
      include: {
        series: true,
        period: true,
        citations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!episode) {
      const reqId = c.get("requestId") ?? c.req.header("X-Request-Id") ?? "unknown";
      return c.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Episode with slug '${slug}' not found`,
          },
          meta: {
            requestId: reqId,
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: episode,
    });
  })
  .post("/:slug/play", async (c) => {
    const slug = c.req.param("slug");

    try {
      const updated = await prisma.episode.update({
        where: { slug },
        data: {
          playCount: { increment: 1 },
        },
        select: { id: true, slug: true, playCount: true },
      });

      return c.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      const reqId = c.get("requestId") ?? c.req.header("X-Request-Id") ?? "unknown";
      const isRecordNotFound = typeof err === "object" && err !== null && "code" in err && err.code === "P2025";
      if (isRecordNotFound) {
        return c.json(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Episode with slug '${slug}' not found`,
            },
            meta: {
              requestId: reqId,
              timestamp: new Date().toISOString(),
            },
          },
          404
        );
      }
      throw err;
    }
  });
