import { Prisma, prisma } from "@repo/db";
import type { SubmitQuizAttemptInput, UpsertQuizInput } from "@repo/shared";
import { getSystemConfig } from "../../core/config/system-config";
import { DomainError } from "../../core/errors/domain-error";

import {
  recordMissionActivity,
  mondayInVietnam,
  WEEK_MS,
} from "../../core/weekly-mission";

const quizInclude = {
  questions: {
    orderBy: { sortOrder: "asc" as const },
    include: { options: { orderBy: { optionLabel: "asc" as const } } },
  },
} satisfies Prisma.QuizInclude;

const PUBLISHED_EPISODE = {
  status: "PUBLISHED" as const,
  deletedAt: null,
  series: { status: "PUBLISHED" as const, deletedAt: null },
};

function publicQuiz(
  quiz: Prisma.QuizGetPayload<{ include: typeof quizInclude }>,
) {
  return {
    id: quiz.id,
    episodeId: quiz.episodeId,
    passScorePercent: quiz.passScorePercent,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      text: question.questionText,
      sortOrder: question.sortOrder,
      options: question.options.map((option) => ({
        id: option.id,
        label: option.optionLabel.trim(),
        text: option.optionText,
      })),
    })),
  };
}

export class GamificationService {
  async getStudioQuiz(episodeId: string, moderatorId: string) {
    await this.assertOwnedEpisode(episodeId, moderatorId);
    const quiz = await prisma.quiz.findUnique({
      where: { episodeId },
      include: quizInclude,
    });
    if (!quiz) throw new DomainError(404, "NOT_FOUND", "Tập chưa có quiz");
    return {
      ...publicQuiz(quiz),
      questions: quiz.questions.map((question) => ({
        id: question.id,
        text: question.questionText,
        explanation: question.explanation,
        sortOrder: question.sortOrder,
        options: question.options.map((option) => ({
          id: option.id,
          label: option.optionLabel.trim(),
          text: option.optionText,
          isCorrect: option.isCorrect,
        })),
      })),
    };
  }

  async upsertQuiz(
    episodeId: string,
    moderatorId: string,
    input: UpsertQuizInput,
  ) {
    await this.assertOwnedEpisode(episodeId, moderatorId);
    return prisma.$transaction(async (db) => {
      const existing = await db.quiz.findUnique({
        where: { episodeId },
        select: { id: true },
      });
      if (existing) {
        if (await db.quizAttempt.count({ where: { quizId: existing.id } })) {
          throw new DomainError(
            409,
            "CONFLICT",
            "Không thể thay câu hỏi sau khi quiz đã có lượt làm",
          );
        }
        await db.quizQuestion.deleteMany({ where: { quizId: existing.id } });
      }
      const quiz = existing
        ? await db.quiz.update({
            where: { id: existing.id },
            data: { passScorePercent: input.passScorePercent },
          })
        : await db.quiz.create({
            data: { episodeId, passScorePercent: input.passScorePercent },
          });
      for (const [sortOrder, question] of input.questions.entries()) {
        await db.quizQuestion.create({
          data: {
            quizId: quiz.id,
            questionText: question.text,
            explanation: question.explanation,
            sortOrder,
            options: {
              create: question.options.map((option) => ({
                optionLabel: option.label,
                optionText: option.text,
                isCorrect: option.isCorrect,
              })),
            },
          },
        });
      }
      const saved = await db.quiz.findUniqueOrThrow({
        where: { id: quiz.id },
        include: quizInclude,
      });
      return publicQuiz(saved);
    });
  }

  async deleteQuiz(episodeId: string, moderatorId: string) {
    await this.assertOwnedEpisode(episodeId, moderatorId);
    const quiz = await prisma.quiz.findUnique({
      where: { episodeId },
      select: { id: true },
    });
    if (!quiz) throw new DomainError(404, "NOT_FOUND", "Tập chưa có quiz");
    if (await prisma.quizAttempt.count({ where: { quizId: quiz.id } })) {
      throw new DomainError(
        409,
        "CONFLICT",
        "Không thể xóa quiz đã có lượt làm",
      );
    }
    await prisma.quiz.delete({ where: { id: quiz.id } });
  }

  async getPublishedQuiz(episodeSlug: string) {
    const quiz = await prisma.quiz.findFirst({
      where: { episode: { slug: episodeSlug, ...PUBLISHED_EPISODE } },
      include: quizInclude,
    });
    if (!quiz)
      throw new DomainError(404, "NOT_FOUND", "Không tìm thấy quiz khả dụng");
    return publicQuiz(quiz);
  }

  async submitAttempt(
    quizId: string,
    userId: string,
    input: SubmitQuizAttemptInput,
  ) {
    const quizXp = await getSystemConfig("xp.quiz_pass");
    const now = new Date();
    return prisma.$transaction(async (db) => {
      const quiz = await db.quiz.findFirst({
        where: { id: quizId, episode: PUBLISHED_EPISODE },
        include: quizInclude,
      });
      if (!quiz)
        throw new DomainError(404, "NOT_FOUND", "Không tìm thấy quiz khả dụng");
      if (input.answers.length !== quiz.questions.length)
        throw new DomainError(
          422,
          "VALIDATION_ERROR",
          "Phải trả lời đầy đủ tất cả câu hỏi",
        );

      const selected = new Map(
        input.answers.map((answer) => [answer.questionId, answer.optionId]),
      );
      const answerResults = quiz.questions.map((question) => {
        const optionId = selected.get(question.id);
        const chosen = question.options.find(
          (option) => option.id === optionId,
        );
        if (!chosen)
          throw new DomainError(
            422,
            "VALIDATION_ERROR",
            "Đáp án không thuộc câu hỏi tương ứng",
          );
        const correct = question.options.find((option) => option.isCorrect)!;
        return {
          questionId: question.id,
          selectedOptionId: chosen.id,
          correctOptionId: correct.id,
          isCorrect: chosen.isCorrect,
          explanation: question.explanation,
        };
      });
      const correctCount = answerResults.filter(
        (answer) => answer.isCorrect,
      ).length;
      const scorePercent = Math.round(
        (correctCount * 100) / quiz.questions.length,
      );
      const isPassed = scorePercent >= quiz.passScorePercent;
      const attempt = await db.quizAttempt.create({
        data: {
          quizId,
          userId,
          answers: input.answers as Prisma.InputJsonValue,
          scorePercent,
          isPassed,
          submittedAt: now,
        },
      });
      let xpAwarded = 0;
      const missionUpdates: Array<{
        id: string;
        title: string;
        progress: number;
        target: number;
        completedNow: boolean;
        xpAwarded: number;
      }> = [];
      if (isPassed) {
        const award = await db.xpAward.createMany({
          data: [
            {
              userId,
              sourceType: "QUIZ_PASS",
              sourceId: quizId,
              xpAmount: quizXp,
            },
          ],
          skipDuplicates: true,
        });
        if (award.count) {
          xpAwarded += quizXp;
          await db.user.update({
            where: { id: userId },
            data: { totalXp: { increment: quizXp } },
          });
        }
        missionUpdates.push(
          ...(await this.progressQuizMissions(db, userId, quizId, now)),
        );
        xpAwarded += missionUpdates.reduce(
          (sum, mission) => sum + mission.xpAwarded,
          0,
        );
      }
      const user = await db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { totalXp: true },
      });
      return {
        id: attempt.id,
        quizId,
        scorePercent,
        isPassed,
        submittedAt: attempt.submittedAt,
        xpAwarded,
        totalXp: user.totalXp,
        answers: answerResults,
        missions: missionUpdates,
      };
    });
  }

  async listWeeklyMissions(userId: string, requestedWeek?: Date) {
    const now = new Date();
    const weekStartDate = requestedWeek
      ? mondayInVietnam(requestedWeek)
      : mondayInVietnam(now);
    const weekEndDate = new Date(weekStartDate.getTime() + WEEK_MS);
    const rows = await prisma.weeklyMission.findMany({
      where: { weekStartDate, activatedAt: { lte: now } },
      include: { userMissions: { where: { userId }, take: 1 } },
      orderBy: { activatedAt: "asc" },
    });
    return {
      weekStartDate,
      weekEndDate,
      totalXp: (
        await prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { totalXp: true },
        })
      ).totalXp,
      items: rows.map((mission) => {
        const progress = mission.userMissions[0];
        const completedAt = progress?.completedAt ?? null;
        return {
          id: mission.id,
          title: mission.title,
          activityType: mission.activityType,
          targetCount: mission.targetCount,
          progressCount: progress?.progressCount ?? 0,
          xpReward: mission.xpReward,
          completedAt,
          weekStartDate,
          weekEndDate,
          status: completedAt
            ? ("COMPLETED" as const)
            : now >= weekEndDate
              ? ("EXPIRED" as const)
              : ("IN_PROGRESS" as const),
        };
      }),
    };
  }

  private async assertOwnedEpisode(episodeId: string, moderatorId: string) {
    const episode = await prisma.episode.findFirst({
      where: { id: episodeId, series: { ownerId: moderatorId } },
      select: {
        deletedAt: true,
        adminLockedAt: true,
        series: { select: { deletedAt: true, adminLockedAt: true } },
      },
    });
    if (!episode)
      throw new DomainError(
        404,
        "NOT_FOUND",
        "Không tìm thấy tập thuộc quyền quản lý",
      );
    if (episode.deletedAt || episode.series.deletedAt)
      throw new DomainError(409, "CONTENT_IN_TRASH", "Content is in trash");
    if (episode.adminLockedAt || episode.series.adminLockedAt)
      throw new DomainError(
        403,
        "CONTENT_LOCKED",
        "Content is locked by an administrator",
      );
  }

  private progressQuizMissions(
    db: Prisma.TransactionClient,
    userId: string,
    quizId: string,
    now: Date,
  ) {
    return recordMissionActivity(db, {
      userId,
      activityType: "PASS_QUIZ",
      contentId: quizId,
      now,
    });
  }
}
