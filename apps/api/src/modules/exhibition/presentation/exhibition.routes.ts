import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { CreateExhibitionSchema, ExhibitionListQuerySchema, ExhibitionPodcastQuerySchema, PublishExhibitionSchema, SaveExhibitionDraftSchema, UuidParamSchema, exhibitionTemplate } from "@repo/shared";
import { idempotency, rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { requireAuth, requireRole } from "../../auth";
import type { ExhibitionService } from "../application/exhibition.service";

export function createStudioExhibitionRoute(service: ExhibitionService) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator"))
    .use("*", async (c, next) => { c.header("Cache-Control", "private, no-store"); await next(); })
    .get("/exhibition-templates", c => c.json({ items: [exhibitionTemplate] }))
    .get("/exhibition-podcast-options", zValidator("query", ExhibitionPodcastQuerySchema, throwOnInvalid), async c => c.json(await service.podcastOptions(c.req.valid("query"))))
    .get("/exhibitions", zValidator("query", ExhibitionListQuerySchema, throwOnInvalid), async c => c.json(await service.list(c.get("session")!.user.id, c.req.valid("query"))))
    .post("/exhibitions", idempotency(), rateLimit("write"), zValidator("json", CreateExhibitionSchema, throwOnInvalid), async c => {
      const workspace = await service.create(c.get("session")!.user.id, c.req.valid("json").document);
      c.header("Location", `/api/studio/exhibitions/${workspace.id}`);
      return c.json(workspace, 201);
    })
    .get("/exhibitions/:id", zValidator("param", UuidParamSchema, throwOnInvalid), async c => c.json(await service.get(c.req.valid("param").id, c.get("session")!.user.id)))
    .post("/exhibitions/:id/publish", rateLimit("write"), zValidator("param", UuidParamSchema, throwOnInvalid), zValidator("json", PublishExhibitionSchema, throwOnInvalid), async c => c.json(await service.publish(c.req.valid("param").id, c.get("session")!.user.id, c.req.valid("json").baseRevision)))
    .put("/exhibitions/:id/draft", rateLimit("write"), zValidator("param", UuidParamSchema, throwOnInvalid), zValidator("json", SaveExhibitionDraftSchema, throwOnInvalid), async c => {
      const body = c.req.valid("json");
      return c.json(await service.saveDraft(c.req.valid("param").id, c.get("session")!.user.id, body.baseRevision, body.document));
    });
}

export function createPublicExhibitionRoute(service: ExhibitionService) {
  return new Hono<AppEnv>().get("/exhibitions/:slug", zValidator("param", z.object({ slug: z.string().min(1).max(280) }), throwOnInvalid), async c => c.json(await service.publicExhibition(c.req.valid("param").slug)));
}
