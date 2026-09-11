import { Hono } from "hono";
import { prisma } from "@repo/db";

export const figuresRoute = new Hono()
  .get("/", async (c) => {
    const dynasty = c.req.query("dynasty");

    const figures = await prisma.figure.findMany({
      where: dynasty ? { dynasty: { contains: dynasty, mode: "insensitive" } } : undefined,
      orderBy: { birthYear: "asc" },
    });

    return c.json({
      success: true,
      data: figures,
      meta: {
        total: figures.length,
        timestamp: new Date().toISOString(),
      },
    });
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const figure = await prisma.figure.findUnique({
      where: { id },
    });

    if (!figure) {
      const reqId = c.get("requestId") ?? c.req.header("X-Request-Id") ?? "unknown";
      return c.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Figure with id '${id}' not found`,
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
      data: figure,
    });
  });
