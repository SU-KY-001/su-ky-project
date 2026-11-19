import { expect, it } from "bun:test";
import { QuizImportPreviewSchema, parseQuizDocument, toReadyQuizQuestions } from "@repo/shared";

const document = { fileName: "quiz.txt", format: "txt" as const, blocks: [{ text: "Câu 1: Hỏi?\nĐáp án: Có", page: null, line: 1 }] };
it("returns a validated ready preview and converts only complete results", () => {
  const result = parseQuizDocument(document, 30);
  expect(QuizImportPreviewSchema.safeParse(result).success).toBe(true);
  expect(result.status).toBe("ready");
  expect(toReadyQuizQuestions(result)[0]).toMatchObject({ kind: "TEXT", options: ["Có"], timeLimit: 30 });
  expect(QuizImportPreviewSchema.safeParse({ ...result, summary: { ...result.summary, total: 2 } }).success).toBe(false);
});
it("keeps incomplete questions reportable but rejects applying them", () => {
  const result = parseQuizDocument({ ...document, blocks: [{ text: "Câu 1: Hỏi?\nA. Một\nB. Hai", page: null, line: 1 }] }, 20);
  expect(result.status).toBe("needs_correction");
  expect(QuizImportPreviewSchema.safeParse(result).success).toBe(true);
  expect(() => toReadyQuizQuestions(result)).toThrow();
  expect(QuizImportPreviewSchema.safeParse({ ...result, status: "ready" }).success).toBe(false);
});
