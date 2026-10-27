import { z } from "zod";
import { UpsertQuizSchema } from "./quiz-mission";

export const QuizEvidenceSchema = z.object({ quote: z.string().max(4000), scriptHash: z.string().max(128) });
export const QuizDraftQuestionSchema = z.object({
  id: z.string().min(1).max(100),
  text: z.string().max(2000),
  options: z.array(z.string().max(1000)).length(4),
  correctIndex: z.number().int().min(0).max(3).nullable(),
  explanation: z.string().max(4000),
  timeLimit: z.number().int().min(10).max(120).default(20),
  evidence: QuizEvidenceSchema.nullable().default(null),
});
export const QuizDraftDataSchema = z.object({
  title: z.string().max(200), description: z.string().max(2000),
  passScorePercent: z.number().int().min(1).max(100).default(80),
  questions: z.array(QuizDraftQuestionSchema).min(1).max(100),
}).superRefine((value, ctx) => {
  if (new Set(value.questions.map(q => q.id)).size !== value.questions.length)
    ctx.addIssue({ code: "custom", message: "Mã câu hỏi bị trùng", path: ["questions"] });
});
export const SaveQuizDraftSchema = z.object({
  revision: z.number().int().nonnegative(), data: QuizDraftDataSchema,
});
export const QuizWorkspaceSchema = z.object({
  episodeId: z.string().uuid(), episodeTitle: z.string(), seriesId: z.string().uuid(), seriesTitle: z.string(),
  revision: z.number().int().nonnegative(), updatedAt: z.coerce.date().nullable(),
  data: QuizDraftDataSchema, active: z.boolean(), attemptCount: z.number().int().nonnegative(),
  script: z.object({ hash: z.string(), updatedAt: z.coerce.date(), characters: z.number().int() }).nullable(),
  scriptChanged: z.boolean(),
});
export const QuizWorkspaceListSchema = z.object({ items: z.array(z.object({
  episodeId: z.string().uuid(), episodeTitle: z.string(), seriesTitle: z.string(), title: z.string(),
  questions: z.number().int(), updatedAt: z.coerce.date(), active: z.boolean(), method: z.enum(["manual", "script", "mixed"]),
})) });
export const GenerateQuizSchema = z.object({
  count: z.number().int().refine(n => n === 1 || n >= 5 && n <= 10, "Chọn 5–10 câu"),
  scriptHash: z.string().min(1).max(128),
  exclude: z.array(z.string().max(2000)).max(100).default([]),
});
export const GeneratedQuizSchema = z.object({
  scriptHash: z.string(), questions: z.array(QuizDraftQuestionSchema).min(1).max(10),
});
export const ActivateQuizDraftSchema = z.object({ revision: z.number().int().positive() });
export type QuizDraftData = z.infer<typeof QuizDraftDataSchema>;
export type QuizDraftQuestion = z.infer<typeof QuizDraftQuestionSchema>;
export type QuizWorkspace = z.infer<typeof QuizWorkspaceSchema>;
export type GenerateQuizInput = z.infer<typeof GenerateQuizSchema>;
export type GeneratedQuiz = z.infer<typeof GeneratedQuizSchema>;

export function validateReadyQuiz(input: QuizDraftData): z.infer<typeof UpsertQuizSchema> {
  const draft = QuizDraftDataSchema.parse(input);
  if (!draft.title.trim()) throw new Error("Vui lòng nhập tên bộ quiz.");
  for (const [index, q] of draft.questions.entries()) {
    const options = q.options.map(o => o.trim().normalize("NFC").toLocaleLowerCase("vi"));
    if (!q.text.trim() || q.correctIndex === null || options.some(o => !o) || new Set(options).size !== 4)
      throw new Error(`Câu ${index + 1} cần nội dung, bốn đáp án khác nhau và một đáp án đúng.`);
    if (q.evidence && !q.explanation.trim()) throw new Error(`Câu ${index + 1} cần giải thích đáp án.`);
  }
  return UpsertQuizSchema.parse({
    passScorePercent: draft.passScorePercent,
    questions: draft.questions.map(q => ({ text: q.text, explanation: q.explanation || null,
      options: q.options.map((text, i) => ({ label: "ABCD"[i], text, isCorrect: i === q.correctIndex })) })),
  });
}
