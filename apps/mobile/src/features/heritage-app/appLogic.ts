import type { MainTab } from "@/shared/ui";
import type { AppScreen } from "./types";

export function screenForTab(tab: MainTab): AppScreen {
  const screens: Record<MainTab, AppScreen> = {
    discovery: "discovery",
    playlist: "playlists",
    podcast: "podcasts",
    quiz: "quizzes",
    profile: "profile",
  };
  return screens[tab];
}

export function tabForScreen(screen: AppScreen): MainTab {
  if (["playlists", "playlistDetail"].includes(screen)) return "playlist";
  if (["podcasts", "series", "player"].includes(screen)) return "podcast";
  if (["quizzes", "episodeQuiz"].includes(screen)) return "quiz";
  if (["profile", "login", "listeningHistory", "topQuizzes", "rankings"].includes(screen)) return "profile";
  return "discovery";
}

