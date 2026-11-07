import { parseQuizDocument, validateReadyQuiz, type QuizDraftQuestion } from "@repo/shared";

export const MAX_IMPORT_TEXT = 200_000;
export type QuizImportNotes = Record<string, { source: string; issues: string[] }>;
export interface ImportedQuizQuestion {
  question: QuizDraftQuestion;
  source: string;
  startLine: number;
  endLine: number;
  inferred: boolean;
  issues: string[];
  included: boolean;
}
export interface QuizTextImportResult {
  items: ImportedQuizQuestion[];
  issues: string[];
}
const normalized = (value: string): string => value.normalize("NFC").trim().replace(/\s+/g," ").toLocaleLowerCase("vi");

export function importQuestionIssues(question: QuizDraftQuestion): string[] {
  question = { ...question, kind: question.kind ?? "SINGLE" };
  const issues: string[] = [];
  if (!question.text.trim()) issues.push("Chưa có nội dung câu hỏi.");
  if (question.kind !== "TEXT" && question.options.length < 2)
    issues.push("Câu chọn đáp án cần ít nhất 2 lựa chọn.");
  if (question.options.some((option) => !option.trim()))
    issues.push("Có đáp án chưa nhập nội dung.");
  if (
    new Set(question.options.map(normalized)).size !== question.options.length
  )
    issues.push("Có đáp án trùng nội dung.");
  if (question.kind === "SINGLE" && question.correctIndex === null)
    issues.push("Chưa có đáp án đúng.");
  if (question.kind === "MULTIPLE" && !question.correctIndexes?.length)
    issues.push("Chưa có đáp án đúng.");
  if (
    question.kind === "TEXT" &&
    (!question.options.length ||
      !question.options.some((option) => option.trim()))
  )
    issues.push("Chưa có đáp án được chấp nhận.");
  if (
    !Number.isInteger(question.timeLimit) ||
    question.timeLimit < 10 ||
    question.timeLimit > 120
  )
    issues.push("Thời gian phải từ 10 đến 120 giây.");
  try {
    validateReadyQuiz({
      title: "Kiểm tra nhập liệu",
      description: "",
      passScorePercent: 80,
      questions: [question],
    });
  } catch {
    if (!issues.length)
      issues.push("Nội dung hoặc đáp án vượt giới hạn; kiểm tra lại câu hỏi.");
  }
  return [...new Set(issues)];
}

export function parseQuizText(text: string, defaultTime = 20): QuizTextImportResult {
  if (text.length > MAX_IMPORT_TEXT) return { items: [], issues: ["Nội dung vượt quá 200.000 ký tự. Hãy chia nhỏ tài liệu."] };
  const result = parseQuizDocument({fileName: "quiz.txt", format: "txt", blocks: text.replace(/\r\n?/g,"\n").split("\n").map((text,index)=>({text,page:null,line:index+1}))}, defaultTime);
  return {
    items: result.questions.map(q=>({ question: {id:q.id,text:q.text,kind:q.kind ?? undefined,options:q.options.length?q.options:["",""],correctIndex:q.correctIndex,correctIndexes:q.correctIndexes,explanation:q.explanation,timeLimit:q.timeLimit,evidence:null},source:q.source.excerpt,startLine:q.source.lineStart??1,endLine:q.source.lineEnd??1,inferred:!/^Loại(?: câu hỏi)?:/imu.test(q.source.excerpt),issues:q.diagnostics.map(d=>d.message),included:true })),
    issues: result.diagnostics.filter(d=>d.questionId===null && d.severity==="error").map(d=>d.message),
  };
}
