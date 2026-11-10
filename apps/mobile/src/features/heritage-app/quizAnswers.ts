import type { PublicQuiz, QuizAttemptAnswer } from "./podcastApi";

export type QuizAnswer = string | string[];

export function hasQuizAnswer(answer: QuizAnswer | undefined): boolean {
  if (Array.isArray(answer)) return answer.length > 0;
  return Boolean(answer?.trim());
}

export function toggleMultipleAnswer(answer: QuizAnswer | undefined, optionId: string): string[] {
  const selected = Array.isArray(answer) ? answer : [];
  return selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId];
}

export function buildQuizAttemptAnswers(
  questions: PublicQuiz["questions"],
  answers: Record<string, QuizAnswer>,
): QuizAttemptAnswer[] {
  return questions.map((question) => {
    const answer = answers[question.id];
    if (question.kind === "MULTIPLE") {
      return { questionId: question.id, optionIds: Array.isArray(answer) ? answer : [] };
    }
    if (question.kind === "TEXT") {
      return { questionId: question.id, text: typeof answer === "string" ? answer.trim() || null : null };
    }
    return { questionId: question.id, optionId: typeof answer === "string" ? answer : null };
  });
}
