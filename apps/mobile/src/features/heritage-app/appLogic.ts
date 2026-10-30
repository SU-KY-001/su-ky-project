import type { MainTab } from "@/shared/ui";
import type { AppScreen } from "./types";

export function screenForTab(tab: MainTab): AppScreen {
  const screens: Record<MainTab, AppScreen> = {
    discovery: "discovery",
    history: "history",
    podcast: "podcasts",
    quiz: "quizzes",
    profile: "profile",
  };
  return screens[tab];
}

export function tabForScreen(screen: AppScreen): MainTab {
  if (["history", "event"].includes(screen)) return "history";
  if (["podcasts", "series", "player"].includes(screen)) return "podcast";
  if (["quizzes", "quizIntro", "question", "result", "episodeQuiz"].includes(screen)) return "quiz";
  if (["profile", "login", "schedule"].includes(screen)) return "profile";
  return "discovery";
}

export function calculateScore(answerIds: string[], correctIds: string[]): number {
  return correctIds.reduce((score, correctId, index) => score + (answerIds[index] === correctId ? 1 : 0), 0);
}

