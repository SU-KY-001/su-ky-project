import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { ActivateQuizDraftSchema, SaveQuizDraftSchema, QuizImportDocumentSchema, QuizImportPreviewSchema } from "@repo/shared";
import { bodyLimit } from "hono/body-limit";
import { DomainError } from "../../core/errors/domain-error";
import { extractQuizDocument, QUIZ_DOCUMENT_BYTES } from "./quiz-document";
import { rateLimit, throwOnInvalid } from "../../core/middleware";
import type { AppEnv } from "../../types";
import { requireAuth, requireRole } from "../auth";
import { quizAuthoringService as service } from "./quiz-authoring.service";
import { handleQuizImportPreview } from "./quiz-import/preview-handler";
const param = z.object({ episodeId: z.string().uuid() });
export const quizAuthoringRoute = new Hono<AppEnv>()
  .use("/quiz-import/extract", requireAuth, requireRole("moderator"))
  .use("/quiz-import/preview", requireAuth, requireRole("moderator"))
  .use("/quiz-workspaces", requireAuth, requireRole("moderator"))
  .use("/episodes/:episodeId/quiz-workspace", requireAuth, requireRole("moderator"))
  .use("/episodes/:episodeId/quiz-workspace/activate", requireAuth, requireRole("moderator"))
  .post("/quiz-import/preview", rateLimit("write"), bodyLimit({ maxSize: QUIZ_DOCUMENT_BYTES + 64 * 1024, onError: () => { throw new DomainError(413, "PAYLOAD_TOO_LARGE", "Tài liệu tối đa 5 MB."); } }), handleQuizImportPreview)
  .post("/quiz-import/extract", rateLimit("write"), bodyLimit({ maxSize: QUIZ_DOCUMENT_BYTES + 64 * 1024, onError: () => { throw new DomainError(413, "PAYLOAD_TOO_LARGE", "Tài liệu tối đa 5 MB."); } }), async c => {
    let body: Record<string, string | File>;
    try { body = await c.req.parseBody(); } catch { throw new DomainError(422, "VALIDATION_ERROR", "Không đọc được tệp tải lên."); }
    if (!(body.file instanceof File)) throw new DomainError(422, "VALIDATION_ERROR", "Vui lòng chọn một tài liệu để đọc.");
    c.header("Cache-Control", "no-store");
    return c.json(QuizImportDocumentSchema.parse(await extractQuizDocument(body.file)));
  })
  .get("/quiz-workspaces", async c => c.json(await service.list(c.get("session")!.user.id)))
  .get("/episodes/:episodeId/quiz-workspace", zValidator("param", param, throwOnInvalid), async c =>
    c.json(await service.read(c.req.valid("param").episodeId, c.get("session")!.user.id)))
  .put("/episodes/:episodeId/quiz-workspace", rateLimit("write"), zValidator("param", param, throwOnInvalid), zValidator("json", SaveQuizDraftSchema, throwOnInvalid), async c => {
    const { revision, data } = c.req.valid("json");
    return c.json(await service.save(c.req.valid("param").episodeId, c.get("session")!.user.id, revision, data));
  })
  .post("/episodes/:episodeId/quiz-workspace/activate", rateLimit("write"), zValidator("param", param, throwOnInvalid), zValidator("json", ActivateQuizDraftSchema, throwOnInvalid), async c =>
    c.json(await service.activate(c.req.valid("param").episodeId, c.get("session")!.user.id, c.req.valid("json").revision)));
