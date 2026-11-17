import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { ActivateQuizDraftSchema, QUIZ_IMPORT_LIMITS, SaveQuizDraftSchema } from "@repo/shared";
import { bodyLimit } from "hono/body-limit";
import { DomainError } from "../../core/errors/domain-error";
import { rateLimit, throwOnInvalid } from "../../core/middleware";
import type { AppEnv } from "../../types";
import { requireAuth, requireRole } from "../auth";
import { quizAuthoringService as service } from "./quiz-authoring.service";
import { handleQuizImportPreview } from "./quiz-import/preview-handler";
const param = z.object({ episodeId: z.string().uuid() });
export const quizAuthoringRoute = new Hono<AppEnv>()
  .use("/quiz-import/preview", requireAuth, requireRole("moderator"))
  .use("/quiz-workspaces", requireAuth, requireRole("moderator"))
  .use("/episodes/:episodeId/quiz-workspace", requireAuth, requireRole("moderator"))
  .use("/episodes/:episodeId/quiz-workspace/activate", requireAuth, requireRole("moderator"))
  .post("/quiz-import/preview", rateLimit("write"), bodyLimit({ maxSize: QUIZ_IMPORT_LIMITS.bytes + 64 * 1024, onError: () => { throw new DomainError(413, "PAYLOAD_TOO_LARGE", "Tài liệu tối đa 5 MB."); } }), handleQuizImportPreview)
  .get("/quiz-workspaces", async c => c.json(await service.list(c.get("session")!.user.id)))
  .get("/episodes/:episodeId/quiz-workspace", zValidator("param", param, throwOnInvalid), async c =>
    c.json(await service.read(c.req.valid("param").episodeId, c.get("session")!.user.id)))
  .put("/episodes/:episodeId/quiz-workspace", rateLimit("write"), zValidator("param", param, throwOnInvalid), zValidator("json", SaveQuizDraftSchema, throwOnInvalid), async c => {
    const { revision, data } = c.req.valid("json");
    return c.json(await service.save(c.req.valid("param").episodeId, c.get("session")!.user.id, revision, data));
  })
  .post("/episodes/:episodeId/quiz-workspace/activate", rateLimit("write"), zValidator("param", param, throwOnInvalid), zValidator("json", ActivateQuizDraftSchema, throwOnInvalid), async c =>
    c.json(await service.activate(c.req.valid("param").episodeId, c.get("session")!.user.id, c.req.valid("json").revision)));
