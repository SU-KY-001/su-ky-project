import type { QuizDraftQuestion } from "@repo/shared";
export function newQuestion(): QuizDraftQuestion {
  return { id: crypto.randomUUID(), text: "", options: ["", "", "", ""], correctIndex: null, explanation: "", timeLimit: 20, evidence: null };
}
export function cloneQuestion(question: QuizDraftQuestion): QuizDraftQuestion {
  return { ...question, id: crypto.randomUUID(), options: [...question.options], correctIndexes: question.correctIndexes ? [...question.correctIndexes] : undefined, evidence: question.evidence ? { ...question.evidence } : null };
}
export function moveQuestion(questions: QuizDraftQuestion[], id: string, offset: number): QuizDraftQuestion[] {
  const from = questions.findIndex(q => q.id === id), to = from + offset;
  if (from < 0 || to < 0 || to >= questions.length) return questions;
  const next = [...questions]; const [q] = next.splice(from, 1); next.splice(to, 0, q); return next;
}
export function isComplete(question: QuizDraftQuestion): boolean {
  const kind = question.kind ?? "SINGLE";
  const correct = kind === "TEXT" || (kind === "MULTIPLE" ? (question.correctIndexes ?? []).length > 0 && (question.correctIndexes ?? []).every(i => i < question.options.length) : question.correctIndex !== null && question.correctIndex < question.options.length);
  return Boolean(question.text.trim()) && correct && (kind === "TEXT" || question.options.length >= 2) && question.options.every(o => o.trim()) && new Set(question.options.map(o => o.trim().normalize("NFC").toLocaleLowerCase("vi"))).size === question.options.length;
}
