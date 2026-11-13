import { describe, expect, test } from "bun:test";
import { screenForTab, tabForScreen } from "./appLogic";

describe("heritage app navigation", () => {
  test("maps tabs to their root screens", () => {
    expect(screenForTab("podcast")).toBe("podcasts");
    expect(screenForTab("quiz")).toBe("quizzes");
    expect(screenForTab("playlist")).toBe("playlists");
  });

  test("keeps deep screens under the correct active tab", () => {
    expect(tabForScreen("event")).toBe("discovery");
    expect(tabForScreen("playlistDetail")).toBe("playlist");
    expect(tabForScreen("episodeQuiz")).toBe("quiz");
    expect(tabForScreen("topQuizzes")).toBe("profile");
  });
});

