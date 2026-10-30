import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { ActivateQuizDraftSchema, SaveQuizDraftSchema } from "@repo/shared";
import { rateLimit, throwOnInvalid } from "../../core/middleware";
import type { AppEnv } from "../../types";
import { requireAuth, requireRole } from "../auth";
import { quizAuthoringService as service } from "./quiz-authoring.service";
const param = z.object({ episodeId: z.string().uuid() });
export const quizAuthoringRoute = new Hono<AppEnv>()
  .use("*", requireAuth, requireRole("moderator"))
  .get("/quiz-workspaces", async c => c.json(await service.list(c.get("session")!.user.id)))
  .get("/episodes/:episodeId/quiz-workspace", zValidator("param", param, throwOnInvalid), async c =>
    c.json(await service.read(c.req.valid("param").episodeId, c.get("session")!.user.id)))
  .put("/episodes/:episodeId/quiz-workspace", rateLimit("write"), zValidator("param", param, throwOnInvalid), zValidator("json", SaveQuizDraftSchema, throwOnInvalid), async c => {
    const { revision, data } = c.req.valid("json");
    return c.json(await service.save(c.req.valid("param").episodeId, c.get("session")!.user.id, revision, data));
  })
  .post("/episodes/:episodeId/quiz-workspace/activate", rateLimit("write"), zValidator("param", param, throwOnInvalid), zValidator("json", ActivateQuizDraftSchema, throwOnInvalid), async c =>
    c.json(await service.activate(c.req.valid("param").episodeId, c.get("session")!.user.id, c.req.valid("json").revision)));
