import { Hono, type MiddlewareHandler } from "hono";
import { zValidator } from "@hono/zod-validator";
import { PodcastRankingQuerySchema, PodcastRankingResponseSchema } from "@repo/shared";
import { requireAuth } from "../../auth/auth.middleware";
import { throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { PodcastRankingService } from "../application/podcast-ranking.service";

export function createPodcastRankingRoute(service: Pick<PodcastRankingService, "list"> = new PodcastRankingService(), guard: MiddlewareHandler<AppEnv> = requireAuth): Hono<AppEnv> {
  return new Hono<AppEnv>().use("*", guard).get("/top-podcasts", zValidator("query", PodcastRankingQuerySchema, throwOnInvalid), async (c) => {
    c.header("Cache-Control", "private, no-store");
    return c.json(PodcastRankingResponseSchema.parse(await service.list(c.get("session")!.user.id, c.req.valid("query"))));
  });
}
