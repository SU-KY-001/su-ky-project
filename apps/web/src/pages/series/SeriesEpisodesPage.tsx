import type { ReactElement } from "react";
import { useParams } from "react-router";
import { SeriesEpisodes } from "@/features/landing/components/library/SeriesEpisodes";
import { LandingPageShell } from "@/features/landing/components/LandingPageShell";

export function SeriesEpisodesPage(): ReactElement {
  const { slug = "" } = useParams();
  return <LandingPageShell surface><SeriesEpisodes key={slug} slug={slug} /></LandingPageShell>;
}
