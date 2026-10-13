import { describe, expect, test } from "bun:test";
import { SubmitQuizAttemptSchema, UpsertQuizSchema } from "@repo/shared";
import { mondayInVietnam } from "../src/modules/gamification";

const validQuiz = {
  passScorePercent: 80,
  questions: [{
    text: "Ai dời đô ra Thăng Long?",
    explanation: "Chiếu dời đô được ban năm 1010.",
    options: [
      { label: "a", text: "Lý Công Uẩn", isCorrect: true },
      { label: "b", text: "Trần Thái Tông", isCorrect: false },
    ],
  }],
};

describe("Quiz and weekly mission contracts", () => {
  test("accepts one correct answer and normalizes option labels", () => {
    const result = UpsertQuizSchema.parse(validQuiz);
    expect(result.questions[0]!.options[0]!.label).toBe("A");
  });

  test("rejects duplicate labels or multiple correct answers", () => {
    const duplicate = structuredClone(validQuiz);
    duplicate.questions[0]!.options[1]!.label = "a";
    expect(UpsertQuizSchema.safeParse(duplicate).success).toBe(false);
    const twoCorrect = structuredClone(validQuiz);
    twoCorrect.questions[0]!.options[1]!.isCorrect = true;
    expect(UpsertQuizSchema.safeParse(twoCorrect).success).toBe(false);
  });

  test("rejects duplicate answers for the same question", () => {
    const questionId = "ef94f8cc-47c7-4dcb-a588-1934d1c64b4c";
    const result = SubmitQuizAttemptSchema.safeParse({ answers: [
      { questionId, optionId: "786a2054-5607-4c8d-8d4d-c162de4f813e" },
      { questionId, optionId: "40a9315c-b76c-4119-bc77-0149a2f636bf" },
    ] });
    expect(result.success).toBe(false);
  });

  test("uses Monday of the Vietnam calendar week", () => {
    expect(mondayInVietnam(new Date("2026-10-18T18:00:00.000Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(mondayInVietnam(new Date("2026-10-25T16:59:59.000Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });
});
