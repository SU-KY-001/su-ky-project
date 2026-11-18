import { DomainError } from "../../../core/errors/domain-error";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, requireRole } from "../../auth";
import { throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import type { CatalogReviewService } from "../application/catalog-review.service";
import type { createHistoricalPresenter } from "../application/historical-catalog.mappers";
const param = z.object({ id: z.string().uuid() });
export function createCatalogReviewRoutes(
  service: CatalogReviewService,
  present: ReturnType<typeof createHistoricalPresenter>,
) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .get(
      "/sources/:id/revisions",
      zValidator("param", param, throwOnInvalid),
      async (c) => {
        const id = c.req.valid("param").id;
        if (!(await service.repository.getSource(id)))
          throw new DomainError(404, "NOT_FOUND", "Source not found");
        return c.json({
          items: await service.repository.revisions("source", id),
        });
      },
    )
    .get(
      "/historical-entities/:id/revisions",
      zValidator("param", param, throwOnInvalid),
      async (c) => {
        const id = c.req.valid("param").id;
        await service.catalog.getNode("entity", id);
        return c.json({
          items: await service.repository.revisions("entity", id),
        });
      },
    );
}
