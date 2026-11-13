import { expect, test } from "bun:test";
import { prisma } from "@repo/db";
import { TopQuizzesService } from "../src/modules/gamification/top-quizzes.service";
import { assertTestDatabase, RUN_INTEGRATION } from "./support/integration";

test.skipIf(!RUN_INTEGRATION)("SQL top quiz counts all submissions, isolates owner and paginates stable ties", async () => {
  assertTestDatabase();
  const rollback = new Error("Rollback isolated top-quiz fixtures");
  try {
    await prisma.$transaction(async (tx) => {
      const ownerId = crypto.randomUUID();
      const otherId = crypto.randomUUID();
      await tx.user.createMany({ data: [ownerId, otherId].map((id) => ({ id, name: "Top quiz test", email: `${id}@test.example` })) });
      const series = await tx.series.create({ data: { ownerId, title: "Top quiz tests", slug: `top-${ownerId}`, status: "PUBLISHED" } });
      const quizIds = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000003"].map((suffix) => suffix.replace("00000000", ownerId.slice(0, 8)));
      for (const [index, quizId] of quizIds.entries()) {
        const episode = await tx.episode.create({ data: { seriesId: series.id, title: `Episode ${index}`, slug: `${ownerId}-${index}`, sortOrder: index, status: index === 2 ? "HIDDEN" : "PUBLISHED" } });
        await tx.quiz.create({ data: { id: quizId, episodeId: episode.id, questions: { create: { questionText: "Test question", sortOrder: 0 } } } });
        await tx.quizAttempt.createMany({ data: [false, true].map((passed) => ({ quizId, userId: ownerId, scorePercent: passed ? 100 : 0, isPassed: passed, answers: [], submittedAt: new Date("2026-11-01T00:00:00Z") })) });
        await tx.quizAttempt.createMany({ data: Array.from({ length: 3 }, () => ({ quizId, userId: otherId, scorePercent: 100, isPassed: true, answers: [] })) });
      }
      const adapter = { $transaction: async (fn: (transaction: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as NonNullable<ConstructorParameters<typeof TopQuizzesService>[0]>;
      const service = new TopQuizzesService(adapter);
      const first = await service.list(ownerId, { page: 1, limit: 2 });
      expect(first.total).toBe(3);
      expect(first.items.map((item) => item.quizId)).toEqual(quizIds.slice(0, 2));
      expect(first.items.map((item) => item.attemptCount)).toEqual([2, 2]);
      const second = await service.list(ownerId, { page: 2, limit: 2 });
      expect(second.items[0]?.available).toBe(false);
      expect(second.items[0]?.attemptCount).toBe(2);
      expect((await service.list(ownerId, { page: 3, limit: 2 })).items).toEqual([]);
      expect((await service.list(crypto.randomUUID(), { page: 1, limit: 4 })).total).toBe(0);
      await tx.quizAttempt.updateMany({ where: { quizId: quizIds[2], userId: ownerId }, data: { submittedAt: new Date("2026-11-02T00:00:00Z") } });
      expect((await service.list(ownerId, { page: 1, limit: 4 })).items[0]?.quizId).toBe(quizIds[2]);
      await tx.quizAttempt.create({ data: { quizId: quizIds[1]!, userId: ownerId, scorePercent: 0, isPassed: false, answers: [] } });
      const updated = await service.list(ownerId, { page: 1, limit: 4 });
      expect(updated.items[0]?.quizId).toBe(quizIds[1]);
      expect(updated.items[0]?.attemptCount).toBe(3);
      throw rollback;
    }, { timeout: 20000 });
  } catch (error) { if (error !== rollback) throw error; }
});
