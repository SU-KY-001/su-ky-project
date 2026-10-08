import { ListeningHistoryQuerySchema, PublicSeriesListQuerySchema, UpdateListeningProgressRequestSchema } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { attachSession, requireAuth } from "../../auth";
import type { ListeningService } from "../application/listening.service";

const slugParam = z.object({ slug: z.string().min(1) });
const narrationParam = z.object({ narrationId: z.string().uuid() });

export function createPublicListeningRoute(service: ListeningService) {
  return new Hono<AppEnv>()
    .use("*", attachSession)
    .get("/series", zValidator("query", PublicSeriesListQuerySchema, throwOnInvalid), async (c) => c.json(await service.listSeries(c.req.valid("query"))))
    .get("/series/:slug", zValidator("param", slugParam, throwOnInvalid), async (c) => c.json(await service.getSeriesDetail(c.req.valid("param").slug, c.get("session")?.user.id ?? null)))
    .get("/episodes/:slug", zValidator("param", slugParam, throwOnInvalid), async (c) => c.json(await service.getEpisodeDetail(c.req.valid("param").slug, c.get("session")?.user.id ?? null)))
    .get("/narrations/:narrationId/playback", requireAuth, zValidator("param", narrationParam, throwOnInvalid), async (c) => {
      c.header("Cache-Control", "private, no-store");
      return c.json(await service.playback(c.req.valid("param").narrationId, c.get("session")!.user.id));
    });
}

export function createMeListeningRoute(service: ListeningService) {
  return new Hono<AppEnv>()
    .use("*", requireAuth)
    .get("/listening-progress/:narrationId", zValidator("param", narrationParam, throwOnInvalid), async (c) => c.json(await service.getProgress(c.req.valid("param").narrationId, c.get("session")!.user.id)))
    .put("/listening-progress/:narrationId", rateLimit("listening_progress"), zValidator("param", narrationParam, throwOnInvalid), zValidator("json", UpdateListeningProgressRequestSchema, throwOnInvalid), async (c) => c.json(await service.updateProgress(c.req.valid("param").narrationId, c.get("session")!.user.id, c.req.valid("json"))))
    .get("/listening-history", zValidator("query", ListeningHistoryQuerySchema, throwOnInvalid), async (c) => c.json(await service.getHistory(c.get("session")!.user.id, c.req.valid("query"))));
}
