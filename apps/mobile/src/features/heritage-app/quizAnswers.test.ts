import { describe, expect, test } from "bun:test";
import type { PublicQuiz } from "./podcastApi";
import { buildQuizAttemptAnswers, hasQuizAnswer, toggleMultipleAnswer } from "./quizAnswers";

const questions = [
  { id: "single", text: "Một đáp án", kind: "SINGLE", sortOrder: 0, timeLimit: null, options: [] },
  { id: "multiple", text: "Nhiều đáp án", kind: "MULTIPLE", sortOrder: 1, timeLimit: null, options: [] },
  { id: "text", text: "Tự luận", kind: "TEXT", sortOrder: 2, timeLimit: null, options: [] },
] satisfies PublicQuiz["questions"];

describe("mobile quiz answers", () => {
  test("serializes every supported question kind to the API contract", () => {
    expect(buildQuizAttemptAnswers(questions, {
      single: "option-a",
      multiple: ["option-b", "option-c"],
      text: "  Thăng Long  ",
    })).toEqual([
      { questionId: "single", optionId: "option-a" },
      { questionId: "multiple", optionIds: ["option-b", "option-c"] },
      { questionId: "text", text: "Thăng Long" },
    ]);
  });

  test("requires meaningful answers and toggles multiple selections", () => {
    expect(hasQuizAnswer("   ")).toBe(false);
    expect(hasQuizAnswer([])).toBe(false);
    expect(hasQuizAnswer(["option-a"])).toBe(true);
    expect(toggleMultipleAnswer(["option-a"], "option-b")).toEqual(["option-a", "option-b"]);
    expect(toggleMultipleAnswer(["option-a", "option-b"], "option-a")).toEqual(["option-b"]);
  });
});
