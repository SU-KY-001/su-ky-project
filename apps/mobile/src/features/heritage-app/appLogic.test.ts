import { describe, expect, test } from "bun:test";
import { calculateScore, screenForTab, tabForScreen } from "./appLogic";
import { quizQuestions } from "./data";

describe("heritage app navigation", () => {
  test("maps tabs to their root screens", () => {
    expect(screenForTab("podcast")).toBe("podcasts");
    expect(screenForTab("quiz")).toBe("quizzes");
  });

  test("keeps deep screens under the correct active tab", () => {
    expect(tabForScreen("event")).toBe("history");
    expect(tabForScreen("result")).toBe("quiz");
    expect(tabForScreen("schedule")).toBe("profile");
  });
});

describe("calculateScore", () => {
  test("scores answers by question position", () => {
    expect(calculateScore(["a", "b", "d"], ["a", "b", "a"])).toBe(2);
  });

  test("ships a complete ten-question review quiz", () => {
    expect(quizQuestions).toHaveLength(10);
    expect(quizQuestions.every((question) => question.options.some((option) => option.id === question.correctId))).toBe(true);
  });
});

