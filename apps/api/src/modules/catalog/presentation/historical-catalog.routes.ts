import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  BaseVersionSchema,
  HistoricalCatalogQuerySchema,
  CreateHistoricalPeriodSchema,
  PatchHistoricalPeriodSchema,
  CreateHistoricalPhaseSchema,
  PatchHistoricalPhaseSchema,
  HistoricalEntityInputSchema,
  PatchHistoricalEntitySchema,
  fromLegacyYearRange,
} from "@repo/shared";
import type { AppEnv } from "../../../types";
import { requireAdmin, requireAuth, requireRole } from "../../auth";
import {
  idempotency,
  rateLimit,
  throwOnInvalid,
} from "../../../core/middleware";
import type { HistoricalCatalogService } from "../application/historical-catalog.service";
import type { createHistoricalPresenter } from "../application/historical-catalog.mappers";
import type { CatalogReviewService } from "../application/catalog-review.service";
const idSchema = z.object({ id: z.string().uuid() });
type Presenter = ReturnType<typeof createHistoricalPresenter>;
export function createHistoricalCatalogRoutes(
  service: HistoricalCatalogService,
  present: Presenter,
  review: CatalogReviewService,
) {
  const periods = new Hono<AppEnv>()
    .get(
      "/",
      zValidator("query", HistoricalCatalogQuerySchema, throwOnInvalid),
      async (c) => {
        const q = c.req.valid("query");
        const result = await service.listNodes("period", q);
        const items = await Promise.all(
          result.items.map(async (p) => ({
            ...p,
            phases: q.includePhases
              ? (
                  await service.listNodes("phase", {
                    page: 1,
                    limit: 32767,
                    periodId: p.id,
                  })
                ).items
              : [],
          })),
        );
        return c.json({ ...result, items });
      },
    )
    .post(
      "/",
      requireAdmin,
      idempotency(),
      rateLimit("write"),
      zValidator("json", CreateHistoricalPeriodSchema, throwOnInvalid),
      async (c) => {
        const n = await service.createNode(
          actor(c.get("session")!),
          "period",
          c.req.valid("json"),
        );
        c.header("Location", `/api/studio/historical-periods/${n.id}`);
        return c.json(await present("period", n.id), 201);
      },
    )
    .get("/:id", zValidator("param", idSchema, throwOnInvalid), async (c) =>
      c.json(await present("period", c.req.valid("param").id)),
    )
    .patch(
      "/:id",
      requireAdmin,
      rateLimit("write"),
      zValidator("param", idSchema, throwOnInvalid),
      zValidator("json", PatchHistoricalPeriodSchema, throwOnInvalid),
      async (c) => {
        const n = await service.patchNode(
          actor(c.get("session")!),
          "period",
          c.req.valid("param").id,
          c.req.valid("json"),
        );
        return c.json(await present("period", n.id));
      },
    )
    .delete(
      "/:id",
      requireAdmin,
      rateLimit("write"),
      zValidator("param", idSchema, throwOnInvalid),
      zValidator("json", BaseVersionSchema, throwOnInvalid),
      async (c) => {
        await service.deleteNode(
          actor(c.get("session")!),
          "period",
          c.req.valid("param").id,
          c.req.valid("json").baseVersion,
        );
        return c.body(null, 204);
      },
    )
    .post(
      "/:id/restore",
      requireAdmin,
      rateLimit("write"),
      zValidator("param", idSchema, throwOnInvalid),
      zValidator("json", BaseVersionSchema, throwOnInvalid),
      async (c) => {
        const n = await service.restoreNode(
          actor(c.get("session")!),
          "period",
          c.req.valid("param").id,
          c.req.valid("json").baseVersion,
        );
        return c.json(await present("period", n.id));
      },
    );
  const phases = new Hono<AppEnv>()
    .get(
      "/",
      zValidator("query", HistoricalCatalogQuerySchema, throwOnInvalid),
      async (c) =>
        c.json(await service.listNodes("phase", c.req.valid("query"))),
    )
    .post(
      "/",
      idempotency(),
      rateLimit("write"),
      zValidator("json", CreateHistoricalPhaseSchema, throwOnInvalid),
      async (c) => {
        const n = await service.createNode(
          actor(c.get("session")!),
          "phase",
          c.req.valid("json"),
        );
        c.header("Location", `/api/studio/historical-phases/${n.id}`);
        return c.json(await present("phase", n.id), 201);
      },
    )
    .get("/:id", zValidator("param", idSchema, throwOnInvalid), async (c) =>
      c.json(await present("phase", c.req.valid("param").id)),
    )
    .patch(
      "/:id",
      rateLimit("write"),
      zValidator("param", idSchema, throwOnInvalid),
      zValidator("json", PatchHistoricalPhaseSchema, throwOnInvalid),
      async (c) => {
        const n = await service.patchNode(
          actor(c.get("session")!),
          "phase",
          c.req.valid("param").id,
          c.req.valid("json"),
        );
        return c.json(await present("phase", n.id));
      },
    )
    .delete(
      "/:id",
      rateLimit("write"),
      zValidator("param", idSchema, throwOnInvalid),
      zValidator("json", BaseVersionSchema, throwOnInvalid),
      async (c) => {
        await service.deleteNode(
          actor(c.get("session")!),
          "phase",
          c.req.valid("param").id,
          c.req.valid("json").baseVersion,
        );
        return c.body(null, 204);
      },
    )
    .post(
      "/:id/restore",
      rateLimit("write"),
      zValidator("param", idSchema, throwOnInvalid),
      zValidator("json", BaseVersionSchema, throwOnInvalid),
      async (c) => {
        const n = await service.restoreNode(
          actor(c.get("session")!),
          "phase",
          c.req.valid("param").id,
          c.req.valid("json").baseVersion,
        );
        return c.json(await present("phase", n.id));
      },
    );
  const entities = new Hono<AppEnv>()
    .get(
      "/",
      zValidator("query", HistoricalCatalogQuerySchema, throwOnInvalid),
      async (c) => {
        const result = await service.listNodes("entity", c.req.valid("query"));
        return c.json({
          ...result,
          items: await Promise.all(
            result.items.map((n) => present("entity", n.id, false)),
          ),
        });
      },
    )
    .post(
      "/",
      idempotency(),
      rateLimit("write"),
      zValidator("json", HistoricalEntityInputSchema, throwOnInvalid),
      async (c) => {
        const body = c.req.valid("json");
        const n = await service.createNode(actor(c.get("session")!), "entity", {
          ...body,
          time:
            body.time ??
            fromLegacyYearRange(
              {
                startYear: body.startYear ?? null,
                endYear: body.endYear ?? null,
              },
              "CLOSED",
            ),
        });
        c.header("Location", `/api/studio/historical-entities/${n.id}`);
        return c.json(await present("entity", n.id), 201);
      },
    )
    .get("/:id", zValidator("param", idSchema, throwOnInvalid), async (c) =>
      c.json(await present("entity", c.req.valid("param").id)),
    )
    .patch(
      "/:id",
      rateLimit("write"),
      zValidator("param", idSchema, throwOnInvalid),
      zValidator("json", PatchHistoricalEntitySchema, throwOnInvalid),
      async (c) => {
        const n = await service.patchNode(
          actor(c.get("session")!),
          "entity",
          c.req.valid("param").id,
          c.req.valid("json"),
        );
        return c.json(await present("entity", n.id));
      },
    )
    .delete(
      "/:id",
      rateLimit("write"),
      zValidator("param", idSchema, throwOnInvalid),
      zValidator("json", BaseVersionSchema, throwOnInvalid),
      async (c) => {
        await service.deleteNode(
          actor(c.get("session")!),
          "entity",
          c.req.valid("param").id,
          c.req.valid("json").baseVersion,
        );
        return c.body(null, 204);
      },
    )
    .post(
      "/:id/restore",
      rateLimit("write"),
      zValidator("param", idSchema, throwOnInvalid),
      zValidator("json", BaseVersionSchema, throwOnInvalid),
      async (c) => {
        const n = await service.restoreNode(
          actor(c.get("session")!),
          "entity",
          c.req.valid("param").id,
          c.req.valid("json").baseVersion,
        );
        return c.json(await present("entity", n.id));
      },
    );
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .route("/historical-periods", periods)
    .route("/historical-phases", phases)
    .route("/historical-entities", entities)
    .get("/historical-summary", async (c) => c.json(await review.summary()));
}
function actor(session: NonNullable<AppEnv["Variables"]["session"]>) {
  return { userId: session.user.id, role: session.user.role };
}
