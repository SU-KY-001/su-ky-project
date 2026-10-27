import type { QuizDraftQuestion } from "@repo/shared";
export function newQuestion(): QuizDraftQuestion {
  return { id: crypto.randomUUID(), text: "", options: ["", "", "", ""], correctIndex: null, explanation: "", timeLimit: 20, evidence: null };
}
export function cloneQuestion(question: QuizDraftQuestion): QuizDraftQuestion {
  return { ...question, id: crypto.randomUUID(), options: [...question.options], evidence: question.evidence ? { ...question.evidence } : null };
}
export function moveQuestion(questions: QuizDraftQuestion[], id: string, offset: number): QuizDraftQuestion[] {
  const from = questions.findIndex(q => q.id === id), to = from + offset;
  if (from < 0 || to < 0 || to >= questions.length) return questions;
  const next = [...questions]; const [q] = next.splice(from, 1); next.splice(to, 0, q); return next;
}
export function replaceQuestion(questions: QuizDraftQuestion[], id: string, generated: QuizDraftQuestion): QuizDraftQuestion[] {
  return questions.map(q => q.id === id ? { ...generated, id } : q);
}
export function isComplete(question: QuizDraftQuestion): boolean {
  return Boolean(question.text.trim()) && question.correctIndex !== null && question.options.every(o => o.trim()) && new Set(question.options.map(o => o.trim().toLocaleLowerCase("vi"))).size === 4;
}
