import { CreateOutlineSchema, DraftSectionRequestSchema, RewriteRequestSchema } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { rateLimit, throwOnInvalid } from "../../../../core/middleware";
import type { AppEnv } from "../../../../types";
import { requireAuth, requireRole } from "../../../auth";
import type { ComposeService } from "../application/compose.service";

const episodeParam = z.object({ id: z.string().uuid() });

/**
 * Synchronous compose routes (spec-prompts-compose.md 2/4/5). `c.req.raw.signal` aborts the model call when the client
 * closes the dialog. Not idempotency-keyed: nothing is created, and repeating a call is bounded by `ai_generate`.
 */
export function createComposeRoute(service: ComposeService) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .post(
      "/episodes/:id/ai/outline",
      rateLimit("ai_generate"),
      zValidator("param", episodeParam, throwOnInvalid),
      zValidator("json", CreateOutlineSchema, throwOnInvalid),
      async (c) => c.json(await service.outline(c.get("session")!, c.req.valid("param").id, c.req.valid("json"), c.req.raw.signal)),
    )
    .post(
      "/episodes/:id/ai/draft-section",
      rateLimit("ai_generate"),
      zValidator("param", episodeParam, throwOnInvalid),
      zValidator("json", DraftSectionRequestSchema, throwOnInvalid),
      async (c) => c.json(await service.draftSection(c.get("session")!, c.req.valid("param").id, c.req.valid("json"), c.req.raw.signal)),
    )
    .post(
      "/episodes/:id/ai/rewrite",
      rateLimit("ai_generate"),
      zValidator("param", episodeParam, throwOnInvalid),
      zValidator("json", RewriteRequestSchema, throwOnInvalid),
      async (c) => c.json(await service.rewrite(c.get("session")!, c.req.valid("param").id, c.req.valid("json"), c.req.raw.signal)),
    );
}
