import { describe, expect, test } from "bun:test";
import { screenForTab, tabForScreen } from "./appLogic";

describe("heritage app navigation", () => {
  test("maps tabs to their root screens", () => {
    expect(screenForTab("podcast")).toBe("podcasts");
    expect(screenForTab("quiz")).toBe("quizzes");
  });

  test("keeps deep screens under the correct active tab", () => {
    expect(tabForScreen("event")).toBe("history");
    expect(tabForScreen("episodeQuiz")).toBe("quiz");
    expect(tabForScreen("schedule")).toBe("profile");
  });
});

