import type { QuizImportDiagnostic, QuizImportSource } from "../schemas/quiz-import";
import type { QuizImportBlock } from "./types";
export function sourceRange(blocks: QuizImportBlock[], start: number, end = start): QuizImportSource {
  const first = blocks[start], last = blocks[end];
  return { blockStart: start, blockEnd: end, pageStart: first?.page ?? null, pageEnd: last?.page ?? null, lineStart: first?.line ?? null, lineEnd: last?.line ?? null, excerpt: blocks.slice(start, end + 1).map(b => b.text).join("\n") };
}
export function diagnostic(code: string, source: QuizImportSource, message: string, suggestion: string, questionId: string | null = null, severity: "error" | "warning" = "error"): QuizImportDiagnostic {
  return { code, source, message, suggestion, questionId, severity };
}
