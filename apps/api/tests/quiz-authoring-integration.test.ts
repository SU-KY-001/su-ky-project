import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { QuizAuthoringService } from "../src/modules/gamification/quiz-authoring.service";
import { GamificationService } from "../src/modules/gamification/gamification.service";
import { assertTestDatabase, createModerator, removeFixtures, RUN_INTEGRATION, uniqueSuffix } from "./support/integration";

describe.skipIf(!RUN_INTEGRATION)("quiz authoring persisted lifecycle", () => {
  const userId = `quiz-authoring-${uniqueSuffix()}`;
  const service = new QuizAuthoringService();
  let episodeId = "";
  const question = { id: "q1", text: "Chiến dịch kéo dài bao nhiêu ngày?", options: ["36 ngày", "46 ngày", "56 ngày", "66 ngày"], correctIndex: 2,
    explanation: "Kịch bản ghi chiến dịch kéo dài 56 ngày đêm.", timeLimit: 20, evidence: null };
  beforeAll(async () => {
    assertTestDatabase(); await createModerator(userId);
    const series = await prisma.series.create({ data: { ownerId: userId, title: "Quiz integration", slug: userId } });
    const episode = await prisma.episode.create({ data: { seriesId: series.id, title: "Tập nháp", slug: userId, sortOrder: 0,
      narrations: { create: { narrationType: "THIRD_PERSON", scriptContent: "Chiến dịch kéo dài 56 ngày đêm." } } } }); episodeId = episode.id;
  });
  afterAll(async () => { if (episodeId) await removeFixtures(userId); });
  it("rejects access by another user", async () => { await expect(service.read(episodeId, "other-user")).rejects.toThrow("Không tìm thấy"); });
  it("persists incomplete work, detects revision conflicts and activates only complete questions", async () => {
    const empty = await service.read(episodeId, userId);
    expect(empty.script).toBeNull(); expect(empty.revision).toBe(0);
    const draft = await service.save(episodeId, userId, 0, empty.data);
    expect(draft.revision).toBe(1); expect(draft.active).toBe(false);
    expect((await service.read(episodeId, userId)).data).toEqual(empty.data);
    await expect(service.save(episodeId, userId, 0, empty.data)).rejects.toThrow("nơi khác");
    await expect(service.activate(episodeId, userId, 1)).rejects.toThrow();
    expect(await prisma.quiz.count({ where: { episodeId } })).toBe(0);
    const data = { ...draft.data, title: "Quiz đã duyệt", referenceText: "Tài liệu riêng của quiz.", questions: [question] };
    const complete = await service.save(episodeId, userId, 1, data);
    expect((await service.activate(episodeId, userId, complete.revision)).active).toBe(true);
    const quiz = await new GamificationService().getStudioQuiz(episodeId, userId);
    expect(quiz.questions[0].options.filter(o => o.isCorrect)).toHaveLength(1);
    expect((await service.read(episodeId, userId)).data.referenceText).toBe("Tài liệu riêng của quiz.");
    await prisma.episodeNarration.updateMany({ where: { episodeId }, data: { scriptContent: "Nội dung kịch bản đã thay đổi." } });
    expect((await service.read(episodeId, userId)).data.referenceText).toBe("Tài liệu riêng của quiz.");
    expect((await service.activate(episodeId, userId, complete.revision)).active).toBe(true);
  });
  it("preserves attempted quizzes while allowing a private draft", async () => {
    const workspace = await service.read(episodeId, userId);
    const quiz = await prisma.quiz.findUniqueOrThrow({ where: { episodeId } });
    await prisma.quizAttempt.create({ data: { userId, quizId: quiz.id, scorePercent: 100, isPassed: true, answers: [] } });
    const saved = await service.save(episodeId, userId, workspace.revision, { ...workspace.data, questions: [{ ...question, text: "Câu đã sửa" }] });
    expect(saved.attemptCount).toBe(1); expect(saved.active).toBe(false);
    await expect(service.activate(episodeId, userId, saved.revision)).rejects.toThrow("đã có lượt làm");
    expect((await new GamificationService().getStudioQuiz(episodeId, userId)).questions[0].text).toBe(question.text);
  });
});
