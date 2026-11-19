import { Hono, type MiddlewareHandler } from "hono";
import { zValidator } from "@hono/zod-validator";
import { TopQuizzesQuerySchema, TopQuizzesResponseSchema } from "@repo/shared";
import { requireAuth } from "../auth/auth.middleware";
import { throwOnInvalid } from "../../core/middleware";
import type { AppEnv } from "../../types";
import { TopQuizzesService } from "./top-quizzes.service";

export function createTopQuizzesRoute(service: Pick<TopQuizzesService, "list"> = new TopQuizzesService(), guard: MiddlewareHandler<AppEnv> = requireAuth): Hono<AppEnv> {
  return new Hono<AppEnv>().use("*", guard).get("/top-quizzes", zValidator("query", TopQuizzesQuerySchema, throwOnInvalid), async (c) => {
    c.header("Cache-Control", "private, no-store");
    return c.json(TopQuizzesResponseSchema.parse(await service.list(c.get("session")!.user.id, c.req.valid("query"))));
  });
}
