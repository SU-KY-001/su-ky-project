export type LibraryStatus =
  | "draft"
  | "missing_source"
  | "needs_review"
  | "complete";

export interface HistoricalSource {
  id: string;
  title: string;
  meta: string;
}

export interface HistoricalEvent {
  id: string;
  name: string;
  timeLabel: string;
  summary: string;
  status: LibraryStatus;
  sources: HistoricalSource[];
  podcastCount: number;
  updatedAt: string;
}

export interface HistoricalStage {
  id: string;
  name: string;
  timeLabel: string;
  summary: string;
  status: LibraryStatus;
  events: HistoricalEvent[];
}

export interface HistoricalPeriod {
  id: string;
  name: string;
  timeLabel: string;
  summary: string;
  status: LibraryStatus;
  stages: HistoricalStage[];
}

export type HistorySelection =
  | { type: "period"; id: string }
  | { type: "stage"; id: string }
  | { type: "event"; id: string };

export type SelectedHistoryNode =
  | { type: "period"; node: HistoricalPeriod; period: HistoricalPeriod }
  | {
      type: "stage";
      node: HistoricalStage;
      period: HistoricalPeriod;
      stage: HistoricalStage;
    }
  | {
      type: "event";
      node: HistoricalEvent;
      period: HistoricalPeriod;
      stage: HistoricalStage;
      event: HistoricalEvent;
    };

export interface LibrarySummary {
  periods: number;
  stages: number;
  events: number;
  missingSources: number;
  readyForPodcast: number;
}
