import { Hono } from "hono";
import { prisma } from "@repo/db";

export const seriesRoute = new Hono()
  .get("/", async (c) => {
    const series = await prisma.series.findMany({
      include: {
        period: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { episodes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      success: true,
      data: series.map((s) => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        description: s.description,
        coverImage: s.coverImage,
        category: s.category,
        period: s.period,
        episodesCount: s._count.episodes,
        createdAt: s.createdAt,
      })),
      meta: {
        total: series.length,
        timestamp: new Date().toISOString(),
      },
    });
  })
  .get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const series = await prisma.series.findUnique({
      where: { slug },
      include: {
        period: true,
        episodes: {
          orderBy: { orderNumber: "asc" },
          select: {
            id: true,
            title: true,
            slug: true,
            durationSeconds: true,
            summary: true,
            orderNumber: true,
            playCount: true,
            publishedAt: true,
          },
        },
      },
    });

    if (!series) {
      const reqId = c.get("requestId") ?? c.req.header("X-Request-Id") ?? "unknown";
      return c.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Series with slug '${slug}' not found`,
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
      data: series,
    });
  });
