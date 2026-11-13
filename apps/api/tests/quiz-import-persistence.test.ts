import { afterAll, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { prisma } from "@repo/db";
import { QuizImportPreviewSchema, toReadyQuizQuestions } from "@repo/shared";
import { QuizAuthoringService } from "../src/modules/gamification/quiz-authoring.service";
import { app } from "../src/app";
import { auth } from "../src/modules/auth";
import { MIXED_QUIZ } from "./support/quiz-import-fixtures";
import { assertTestDatabase, createModerator, makeSession, removeFixtures, RUN_INTEGRATION, uniqueSuffix } from "./support/integration";

describe.skipIf(!RUN_INTEGRATION)("quiz import preview to persisted mixed quiz", () => {
  const userId = `import-persistence-${uniqueSuffix()}`, service = new QuizAuthoringService();
  let episodeId = "";
  beforeAll(async () => {
    assertTestDatabase(); await createModerator(userId);
    const series = await prisma.series.create({ data: { ownerId: userId, title: "Quiz import acceptance", slug: userId } });
    const episode = await prisma.episode.create({ data: { seriesId: series.id, title: "Mixed question import", slug: userId, sortOrder: 0 } }); episodeId = episode.id;
  });
  afterAll(async () => { if (episodeId) await removeFixtures(userId); await prisma.rateLimitBucket.deleteMany({ where: { bucketKey: `write:${userId}` } }); });
  it("uses the actual guarded/rate-limited route and preserves types and answers after save/activate/read", async () => {
    const session = spyOn(auth.api, "getSession").mockResolvedValue(makeSession(userId, "moderator"));
    try {
      const form = new FormData(); form.set("file", new File([MIXED_QUIZ], "quiz.txt")); form.set("defaultTime", "30");
      const response = await app.request("/api/studio/quiz-import/preview", { method: "POST", body: form });
      expect(response.status).toBe(200);
      const preview = QuizImportPreviewSchema.parse(await response.json());
      expect(await prisma.quizWorkspaceDraft.count({ where: { episodeId } })).toBe(0); expect(await prisma.quiz.count({ where: { episodeId } })).toBe(0);
      const questions = toReadyQuizQuestions(preview);
      const saved = await service.save(episodeId, userId, 0, { title: "Mixed import", description: "", passScorePercent: 80, questions });
      expect((await service.read(episodeId, userId)).data.questions).toEqual(saved.data.questions);
      await expect(service.save(episodeId, userId, 0, saved.data)).rejects.toThrow("nơi khác");
      expect((await service.activate(episodeId, userId, saved.revision)).active).toBe(true);
      const active = await prisma.quiz.findUniqueOrThrow({ where: { episodeId }, include: { questions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { optionLabel: "asc" } } } } } });
      expect(active.questions.map(q => q.kind)).toEqual(["SINGLE", "MULTIPLE", "TEXT"]);
      expect(active.questions.map(q => q.options.filter(o => o.isCorrect).map(o => o.optionText))).toEqual([["Bốn"], ["Hai", "Ba"], ["Hà Nội", "Thành phố Hà Nội"]]);
      await expect(service.read(episodeId, "another-user")).rejects.toThrow("Không tìm thấy");
    } finally { session.mockRestore(); }
  });
  it("rejects requests above the existing write rate limit", async () => {
    const session = spyOn(auth.api, "getSession").mockResolvedValue(makeSession(userId, "moderator"));
    try {
      await prisma.rateLimitBucket.updateMany({ where: { bucketKey: `write:${userId}` }, data: { count: 120 } });
      const response = await app.request("/api/studio/quiz-import/preview", { method: "POST", body: new FormData() });
      expect(response.status).toBe(429); expect(response.headers.get("retry-after")).not.toBeNull();
    } finally { session.mockRestore(); }
  });
});
