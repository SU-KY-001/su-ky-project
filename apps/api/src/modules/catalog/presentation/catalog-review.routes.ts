import { DomainError } from "../../../core/errors/domain-error";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  HistoricalEntityReviewSchema,
  SubmitHistoricalReviewSchema,
  SourceReviewSchema,
} from "@repo/shared";
import { requireAuth, requireRole } from "../../auth";
import { rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import type { CatalogReviewService } from "../application/catalog-review.service";
import type { createHistoricalPresenter } from "../application/historical-catalog.mappers";
import type { MediaStorageGateway } from "../../media";
import { mapSource } from "./catalog.routes";
const param = z.object({ id: z.string().uuid() });
export function createCatalogReviewRoutes(
  service: CatalogReviewService,
  present: ReturnType<typeof createHistoricalPresenter>,
  storage: MediaStorageGateway,
) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .post(
      "/sources/:id/review",
      rateLimit("write"),
      zValidator("param", param, throwOnInvalid),
      zValidator("json", SourceReviewSchema, throwOnInvalid),
      async (c) => {
        const u = c.get("session")!.user;
        return c.json(
          mapSource(
            await service.reviewSource(
              { userId: u.id, role: u.role },
              c.req.valid("param").id,
              c.req.valid("json"),
            ),
            storage,
          ),
        );
      },
    )
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
    )
    .post(
      "/historical-entities/:id/submit-review",
      rateLimit("write"),
      zValidator("param", param, throwOnInvalid),
      zValidator("json", SubmitHistoricalReviewSchema, throwOnInvalid),
      async (c) => {
        const u = c.get("session")!.user;
        const id = c.req.valid("param").id;
        await service.submitEntityReview(
          { userId: u.id, role: u.role },
          id,
          c.req.valid("json"),
        );
        return c.json(await present("entity", id));
      },
    )
    .post(
      "/historical-entities/:id/review",
      rateLimit("write"),
      zValidator("param", param, throwOnInvalid),
      zValidator("json", HistoricalEntityReviewSchema, throwOnInvalid),
      async (c) => {
        const u = c.get("session")!.user;
        const id = c.req.valid("param").id;
        await service.reviewEntity(
          { userId: u.id, role: u.role },
          id,
          c.req.valid("json"),
        );
        return c.json(await present("entity", id));
      },
    );
}
