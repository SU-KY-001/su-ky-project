import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HistoricalCatalogQuerySchema } from "@repo/shared";
import { throwOnInvalid } from "../../../core/middleware";
import type { PublicHistoricalService } from "../application/public-historical.service";
export function createPublicHistoricalRoutes(service: PublicHistoricalService) {
  return new Hono()
    .get(
      "/historical-events",
      zValidator(
        "query",
        HistoricalCatalogQuerySchema.extend({
          phaseId: z.string().uuid().optional(),
        }),
        throwOnInvalid,
      ),
      async (c) => {
        const q = c.req.valid("query");
        return c.json(
          await service.listEvents({
            ...q,
            historicalPhaseId: q.phaseId ?? q.historicalPhaseId,
          }),
        );
      },
    )
    .get(
      "/historical-events/:slug",
      zValidator(
        "param",
        z.object({ slug: z.string().min(1) }),
        throwOnInvalid,
      ),
      async (c) => c.json(await service.getEvent(c.req.valid("param").slug)),
    );
}
