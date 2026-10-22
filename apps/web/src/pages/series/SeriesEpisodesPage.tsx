import type { ReactElement } from "react";
import { useParams } from "react-router";
import { SeriesEpisodes } from "@/features/landing/components/library/SeriesEpisodes";

export function SeriesEpisodesPage(): ReactElement {
  const { slug = "" } = useParams();
  return <SeriesEpisodes key={slug} slug={slug} />;
}
