import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { QuizAuthoringService } from "../src/modules/gamification/quiz-authoring.service";
import { GamificationService } from "../src/modules/gamification/gamification.service";
import { detachedMediaWhere } from "../src/core/jobs/maintenance-jobs";
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
    const data = { ...draft.data, title: "Quiz đã duyệt", description: "Ôn tập chiến dịch", referenceText: "Tài liệu riêng của quiz.", questions: [question] };
    const initialComplete = await service.save(episodeId, userId, 1, data);
    await expect(service.save(episodeId, userId, initialComplete.revision, { ...data, posterAssetId: "7c1dfbb7-6e58-4be5-9c17-c9d9a3106a2c" })).rejects.toThrow("Ảnh quiz");
    const image = await prisma.mediaAsset.create({ data: { kind: "IMAGE", status: "READY", publicId: `quiz-test-${userId}`, uploadedById: userId } });
    const withPoster = await service.save(episodeId, userId, initialComplete.revision, { ...data, posterAssetId: image.id });
    expect(withPoster.data.posterAssetId).toBe(image.id);
    expect(await prisma.mediaAsset.count({ where: { id: image.id, ...detachedMediaWhere(new Date(Date.now() + 60_000)) } })).toBe(0);
    const complete = await service.save(episodeId, userId, withPoster.revision, { ...data, posterAssetId: null });
    expect((await service.activate(episodeId, userId, complete.revision)).active).toBe(true);
    expect(await prisma.quiz.findUniqueOrThrow({ where: { episodeId } })).toMatchObject({ title: "Quiz đã duyệt", description: "Ôn tập chiến dịch" });
    const quiz = await new GamificationService().getStudioQuiz(episodeId, userId);
    expect(quiz.questions[0].timeLimit).toBe(20);
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
    const saved = await service.save(episodeId, userId, workspace.revision, { ...workspace.data, title: "Tên chưa công khai", questions: [{ ...question, text: "Câu đã sửa" }] });
    expect(saved.attemptCount).toBe(1); expect(saved.active).toBe(false);
    await expect(service.activate(episodeId, userId, saved.revision)).rejects.toThrow("đã có lượt làm");
    expect((await new GamificationService().getStudioQuiz(episodeId, userId)).questions[0].text).toBe(question.text);
    expect((await prisma.quiz.findUniqueOrThrow({ where: { episodeId } })).title).toBe("Quiz đã duyệt");
  });
  it("lists only the active metadata of published episodes", async () => {
    const episode = await prisma.episode.findUniqueOrThrow({ where: { id: episodeId } });
    const catalog = new GamificationService();
    expect((await catalog.listPublishedQuizzes({ page: 1, limit: 12, episodeSlug: episode.slug })).items).toHaveLength(0);
    await prisma.series.update({ where: { id: episode.seriesId }, data: { status: "PUBLISHED" } });
    await prisma.episode.update({ where: { id: episodeId }, data: { status: "PUBLISHED" } });
    const result = await catalog.listPublishedQuizzes({ page: 1, limit: 12, episodeSlug: episode.slug });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ title: "Quiz đã duyệt", description: "Ôn tập chiến dịch", questionCount: 1, plays: 1 });
    expect(result.items[0]?.hasCompleted).toBeNull();
    expect((await catalog.listPublishedQuizzes({ page: 1, limit: 12, episodeSlug: episode.slug }, userId)).items[0]?.hasCompleted).toBe(true);
    expect((await catalog.listPublishedQuizzes({ page: 1, limit: 12, episodeSlug: episode.slug }, "another-user")).items[0]?.hasCompleted).toBe(false);
    expect((await catalog.listPublishedQuizzes({ page: 1, limit: 12, episodeSlug: episode.slug, topicId: "7c1dfbb7-6e58-4be5-9c17-c9d9a3106a2c" })).items).toHaveLength(0);
  });
});
