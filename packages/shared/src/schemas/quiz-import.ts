import { z } from "zod";
import { QuizDraftQuestionSchema, validateReadyQuiz, type QuizDraftQuestion } from "./quiz-authoring";

export const QUIZ_IMPORT_LIMITS = { bytes: 5 * 1024 * 1024, text: 200_000, pages: 100, questions: 100, expandedBytes: 20 * 1024 * 1024, entries: 1000, deadlineMs: 60_000, officeMs: 30_000, clientMs: 75_000 } as const;
export const QUIZ_IMPORT_PARSER_VERSION = "1";
export const QuizImportFormatSchema = z.enum(["doc", "docx", "pdf", "txt", "md"]);
export const QuizImportSourceSchema = z.object({
  blockStart: z.number().int().nonnegative(), blockEnd: z.number().int().nonnegative(),
  pageStart: z.number().int().positive().nullable(), pageEnd: z.number().int().positive().nullable(),
  lineStart: z.number().int().positive().nullable(), lineEnd: z.number().int().positive().nullable(), excerpt: z.string(),
});
export const QuizImportDiagnosticSchema = z.object({
  code: z.string().min(1), severity: z.enum(["error", "warning"]), questionId: z.string().nullable(),
  source: QuizImportSourceSchema, message: z.string().min(1), suggestion: z.string().min(1),
});
export const QuizImportQuestionSchema = z.object({
  id: z.string(), sourceNumber: z.number().int().nonnegative(), section: z.string(),
  kind: z.enum(["SINGLE", "MULTIPLE", "TEXT"]).nullable(), text: z.string(), options: z.array(z.string()),
  correctIndex: z.number().int().nullable(), correctIndexes: z.array(z.number().int()),
  explanation: z.string(), timeLimit: z.number(), source: QuizImportSourceSchema,
  diagnostics: z.array(QuizImportDiagnosticSchema),
});
const PreviewBaseSchema = z.object({
  parserVersion: z.literal(QUIZ_IMPORT_PARSER_VERSION), fileName: z.string(), format: QuizImportFormatSchema,
  status: z.enum(["ready", "needs_correction"]), questions: z.array(QuizImportQuestionSchema),
  diagnostics: z.array(QuizImportDiagnosticSchema), unparsedRegions: z.array(QuizImportSourceSchema),
  summary: z.object({ total: z.number().int(), valid: z.number().int(), invalid: z.number().int(), single: z.number().int(), multiple: z.number().int(), text: z.number().int() }),
});
export type QuizImportPreview = z.infer<typeof PreviewBaseSchema>;
export type QuizImportQuestion = z.infer<typeof QuizImportQuestionSchema>;
export type QuizImportSource = z.infer<typeof QuizImportSourceSchema>;
export type QuizImportDiagnostic = z.infer<typeof QuizImportDiagnosticSchema>;
export type QuizImportFormat = z.infer<typeof QuizImportFormatSchema>;

export function toReadyQuizQuestions(preview: QuizImportPreview): QuizDraftQuestion[] {
  if (preview.status !== "ready" || preview.diagnostics.some(d => d.severity === "error") || preview.unparsedRegions.length || preview.questions.some(q => q.diagnostics.some(d => d.severity === "error"))) throw new Error("Hãy sửa các lỗi trong file rồi tải lại trước khi nhập.");
  const questions = preview.questions.map(q => QuizDraftQuestionSchema.parse({ ...q, kind: q.kind, evidence: null }));
  validateReadyQuiz({ title: "Import", description: "", passScorePercent: 80, questions });
  return questions;
}

export const QuizImportPreviewSchema = PreviewBaseSchema.superRefine((value, ctx) => {
  const invalid = value.questions.filter(q => q.diagnostics.some(d => d.severity === "error")).length;
  const expected = { total: value.questions.length, valid: value.questions.length - invalid, invalid,
    single: value.questions.filter(q => q.kind === "SINGLE").length, multiple: value.questions.filter(q => q.kind === "MULTIPLE").length, text: value.questions.filter(q => q.kind === "TEXT").length };
  if (value.summary.total !== expected.total || value.summary.valid !== expected.valid || value.summary.invalid !== expected.invalid || value.summary.single !== expected.single || value.summary.multiple !== expected.multiple || value.summary.text !== expected.text) ctx.addIssue({ code: "custom", message: "Tổng hợp không khớp câu hỏi." });
  if (value.status === "ready") {
    try { toReadyQuizQuestions(value); } catch { ctx.addIssue({ code: "custom", message: "Kết quả chưa đủ điều kiện nhập." }); }
  }
});
