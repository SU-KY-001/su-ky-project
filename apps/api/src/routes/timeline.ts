import { Hono } from "hono";
import { prisma } from "@repo/db";

export const timelineRoute = new Hono()
  .get("/", async (c) => {
    const periods = await prisma.period.findMany({
      orderBy: { orderIndex: "asc" },
      include: {
        _count: {
          select: { episodes: true, series: true },
        },
      },
    });

    return c.json({
      success: true,
      data: periods.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        startYear: p.startYear,
        endYear: p.endYear,
        description: p.description,
        orderIndex: p.orderIndex,
        episodesCount: p._count.episodes,
        seriesCount: p._count.series,
      })),
      meta: {
        total: periods.length,
        timestamp: new Date().toISOString(),
      },
    });
  })
  .get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const period = await prisma.period.findUnique({
      where: { slug },
      include: {
        episodes: {
          select: {
            id: true,
            title: true,
            slug: true,
            durationSeconds: true,
            summary: true,
            playCount: true,
            publishedAt: true,
          },
        },
        series: true,
      },
    });

    if (!period) {
      const reqId = c.get("requestId") ?? c.req.header("X-Request-Id") ?? "unknown";
      return c.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Period with slug '${slug}' not found`,
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
      data: period,
    });
  });
