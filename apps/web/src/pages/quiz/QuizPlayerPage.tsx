import type { ReactElement } from "react";
import { useParams } from "react-router";
import { LandingPageShell } from "@/features/landing/components/LandingPageShell";
import { QuizPlayer } from "@/features/landing/components/library/QuizPlayer";

export function QuizPlayerPage(): ReactElement {
  const { slug = "" } = useParams();
  return <LandingPageShell surface><QuizPlayer key={slug} slug={slug} /></LandingPageShell>;
}
