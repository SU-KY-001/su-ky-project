import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { GenerateQuizSchema } from "@repo/shared";
import type { AppEnv } from "../../../types";
import { requireAuth, requireRole } from "../../auth";
import { rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { QuizGenerationService } from "./quiz-generation.service";
export function createQuizGenerationRoute(service: QuizGenerationService) {
  return new Hono<AppEnv>().use("*", requireAuth, requireRole("moderator"))
    .post("/episodes/:episodeId/ai/quiz", rateLimit("ai_generate"),
      zValidator("param", z.object({ episodeId: z.string().uuid() }), throwOnInvalid),
      zValidator("json", GenerateQuizSchema, throwOnInvalid), async c =>
        c.json(await service.generate(c.get("session")!.user.id, c.req.valid("param").episodeId, c.req.valid("json"), c.req.raw.signal)));
}
