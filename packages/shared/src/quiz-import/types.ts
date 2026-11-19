import type { QuizImportDiagnostic, QuizImportFormat } from "../schemas/quiz-import";
export interface QuizImportBlock { text: string; page: number | null; line: number | null; }
export interface QuizImportDocument { fileName: string; format: QuizImportFormat; blocks: QuizImportBlock[]; diagnostics?: QuizImportDiagnostic[]; }
