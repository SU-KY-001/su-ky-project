import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { historicalLibraryFixture } from "@/features/historical-library/data";
import type { HistoricalPeriod } from "@/features/historical-library/types";
import { publishedEpisodeRows } from "@/features/podcast-production/mockData";

export interface PodcastSeries {
  id: string;
  name: string;
  description: string;
  eventId: string;
}
export interface PodcastEpisode {
  id: string;
  seriesId: string;
  name: string;
  description: string;
  script: string;
  episodeNumber: number;
  publishedAt: string | null;
  duration: string | null;
}

const initialSeries: PodcastSeries[] = [...new Set(publishedEpisodeRows.map((row) => row.series))].map((name, index) => ({ id: `series-${index}`, name, description: "", eventId: "" }));
const initialEpisodes: PodcastEpisode[] = publishedEpisodeRows.map((row) => ({
  id: row.id, seriesId: initialSeries.find((series) => series.name === row.series)?.id ?? "",
  name: row.episode, episodeNumber: row.episodeNumber, publishedAt: row.publishedAt, duration: row.duration, description: "", script: "",
}));

interface WorkspaceData {
  periods: HistoricalPeriod[];
  setPeriods: Dispatch<SetStateAction<HistoricalPeriod[]>>;
  series: PodcastSeries[];
  setSeries: Dispatch<SetStateAction<PodcastSeries[]>>;
  episodes: PodcastEpisode[];
  setEpisodes: Dispatch<SetStateAction<PodcastEpisode[]>>;
}
const WorkspaceContext = createContext<WorkspaceData | null>(null);

export function WorkspaceDataProvider({ children }: { children: ReactNode }) {
  const [periods, setPeriods] = useState(historicalLibraryFixture);
  const [series, setSeries] = useState(initialSeries);
  const [episodes, setEpisodes] = useState(initialEpisodes);
  return <WorkspaceContext.Provider value={{ periods, setPeriods, series, setSeries, episodes, setEpisodes }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceData(): WorkspaceData {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("WorkspaceDataProvider is required");
  return context;
}
