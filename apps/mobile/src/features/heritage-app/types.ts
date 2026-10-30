import type { ImageSourcePropType } from "react-native";

export type AppScreen = "discovery" | "history" | "event" | "podcasts" | "series" | "player" | "quizzes" | "quizIntro" | "question" | "result" | "episodeQuiz" | "schedule" | "profile" | "login";

export interface HistoricalItem {
  id: string;
  year: string;
  title: string;
  description: string;
  era: string;
  image: ImageSourcePropType;
}

export interface PodcastItem {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  image: ImageSourcePropType;
}

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctId: string;
}

