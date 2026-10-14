import { z } from "zod";

export const QuizOptionInputSchema = z.object({
  label: z
    .string()
    .trim()
    .length(1)
    .transform((value) => value.toUpperCase()),
  text: z.string().trim().min(1).max(1000),
  isCorrect: z.boolean(),
});

export const QuizQuestionInputSchema = z
  .object({
    text: z.string().trim().min(1).max(2000),
    explanation: z.string().trim().max(4000).nullable().optional(),
    options: z.array(QuizOptionInputSchema).min(2).max(6),
  })
  .superRefine((question, context) => {
    const labels = question.options.map((option) => option.label);
    if (new Set(labels).size !== labels.length) {
      context.addIssue({
        code: "custom",
        message: "Nhãn đáp án trong một câu hỏi không được trùng",
      });
    }
    if (question.options.filter((option) => option.isCorrect).length !== 1) {
      context.addIssue({
        code: "custom",
        message: "Mỗi câu hỏi phải có đúng một đáp án đúng",
      });
    }
  });

export const UpsertQuizSchema = z.object({
  passScorePercent: z.number().int().min(1).max(100).default(80),
  questions: z.array(QuizQuestionInputSchema).min(1).max(100),
});

export const SubmitQuizAttemptSchema = z
  .object({
    answers: z
      .array(
        z.object({
          questionId: z.string().uuid(),
          optionId: z.string().uuid(),
        }),
      )
      .min(1)
      .max(100),
  })
  .superRefine((attempt, context) => {
    const questionIds = attempt.answers.map((answer) => answer.questionId);
    if (new Set(questionIds).size !== questionIds.length) {
      context.addIssue({
        code: "custom",
        message: "Mỗi câu hỏi chỉ được trả lời một lần",
      });
    }
  });

export const QuizOptionSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  text: z.string(),
});

export const QuizQuestionSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  sortOrder: z.number().int(),
  options: z.array(QuizOptionSchema),
});

export const PublicQuizSchema = z.object({
  id: z.string().uuid(),
  episodeId: z.string().uuid(),
  passScorePercent: z.number().int(),
  questions: z.array(QuizQuestionSchema),
});

export const QuizAttemptResultSchema = z.object({
  id: z.string().uuid(),
  quizId: z.string().uuid(),
  scorePercent: z.number().int(),
  isPassed: z.boolean(),
  submittedAt: z.coerce.date(),
  xpAwarded: z.number().int().nonnegative(),
  totalXp: z.number().int().nonnegative(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOptionId: z.string().uuid(),
      correctOptionId: z.string().uuid(),
      isCorrect: z.boolean(),
      explanation: z.string().nullable(),
    }),
  ),
  missions: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      progress: z.number().int(),
      target: z.number().int(),
      completedNow: z.boolean(),
      xpAwarded: z.number().int().nonnegative(),
    }),
  ),
});

export const WeeklyMissionQuerySchema = z.object({
  weekStartDate: z.coerce.date().optional(),
});

export const UserWeeklyMissionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  activityType: z.enum(["COMPLETE_EPISODE", "PASS_QUIZ"]),
  targetCount: z.number().int().positive(),
  progressCount: z.number().int().nonnegative(),
  xpReward: z.number().int().nonnegative(),
  completedAt: z.coerce.date().nullable(),
  weekStartDate: z.coerce.date(),
  weekEndDate: z.coerce.date(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "EXPIRED"]),
});

export const StudioQuizSchema = PublicQuizSchema.extend({
  questions: z.array(
    z.object({
      id: z.string().uuid(),
      text: z.string(),
      explanation: z.string().nullable(),
      sortOrder: z.number().int(),
      options: z.array(
        z.object({
          id: z.string().uuid(),
          label: z.string(),
          text: z.string(),
          isCorrect: z.boolean(),
        }),
      ),
    }),
  ),
});

export const MyWeeklyMissionsSchema = z.object({
  weekStartDate: z.coerce.date(),
  weekEndDate: z.coerce.date(),
  totalXp: z.number().int().nonnegative(),
  items: z.array(UserWeeklyMissionSchema),
});

export type UpsertQuizInput = z.infer<typeof UpsertQuizSchema>;
export type SubmitQuizAttemptInput = z.infer<typeof SubmitQuizAttemptSchema>;
