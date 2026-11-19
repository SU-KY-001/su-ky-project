import type {
  HistoricalEvent,
  HistoricalPeriod,
  HistoricalStage,
  HistorySelection,
  LibraryStatus,
  LibrarySummary,
  SelectedHistoryNode,
} from "./types";

const normalize = (value: string): string =>
  value.trim().toLocaleLowerCase("vi-VN");

const includesQuery = (values: string[], query: string): boolean =>
  values.some((value) => normalize(value).includes(query));

export function filterHistoricalLibrary(
  periods: HistoricalPeriod[],
  query: string,
  status: LibraryStatus | "all",
): HistoricalPeriod[] {
  const normalizedQuery = normalize(query);
  const hasQuery = normalizedQuery.length > 0;

  return periods.flatMap((period) => {
    const periodMatches =
      hasQuery &&
      includesQuery(
        [period.name, period.timeLabel, period.summary],
        normalizedQuery,
      );
    const stages = period.stages.flatMap((stage) => {
      const stageMatches =
        hasQuery &&
        includesQuery(
          [stage.name, stage.timeLabel, stage.summary],
          normalizedQuery,
        );
      const events = stage.events.filter((event) => {
        const statusMatches = status === "all" || event.status === status;
        const textMatches =
          !hasQuery ||
          periodMatches ||
          stageMatches ||
          includesQuery(
            [event.name, event.timeLabel, event.summary],
            normalizedQuery,
          );
        return statusMatches && textMatches;
      });

      const keepStage =
        events.length > 0 ||
        (status === "all" && (stageMatches || periodMatches));
      return keepStage ? [{ ...stage, events }] : [];
    });

    const keepPeriod = stages.length > 0 || (status === "all" && periodMatches);
    return keepPeriod ? [{ ...period, stages }] : [];
  });
}

export function findSelectedNode(
  periods: HistoricalPeriod[],
  selection: HistorySelection,
): SelectedHistoryNode | null {
  for (const period of periods) {
    if (selection.type === "period" && period.id === selection.id) {
      return { type: "period", node: period, period };
    }

    for (const stage of period.stages) {
      if (selection.type === "stage" && stage.id === selection.id) {
        return { type: "stage", node: stage, period, stage };
      }

      const event = stage.events.find(
        (item) => selection.type === "event" && item.id === selection.id,
      );
      if (event) return { type: "event", node: event, period, stage, event };
    }
  }

  return null;
}

export function firstLibrarySelection(
  periods: HistoricalPeriod[],
): HistorySelection | null {
  const firstPeriod = periods[0];
  return firstPeriod ? { type: "period", id: firstPeriod.id } : null;
}

export function summarizeLibrary(periods: HistoricalPeriod[]): LibrarySummary {
  const stages = periods.flatMap((period) => period.stages);
  const events = stages.flatMap((stage) => stage.events);

  return {
    periods: periods.length,
    stages: stages.length,
    events: events.length,
    missingSources: events.filter((event) => event.sources.length === 0).length,
    readyForPodcast: events.filter((event) => event.status === "complete")
      .length,
  };
}

export function countPeriodContents(period: HistoricalPeriod): {
  stages: number;
  events: number;
} {
  return {
    stages: period.stages.length,
    events: period.stages.reduce(
      (total, stage) => total + stage.events.length,
      0,
    ),
  };
}

export function statusCounts(
  events: HistoricalEvent[],
): Record<LibraryStatus, number> {
  return events.reduce<Record<LibraryStatus, number>>(
    (counts, event) => ({
      ...counts,
      [event.status]: counts[event.status] + 1,
    }),
    { draft: 0, missing_source: 0, needs_review: 0, complete: 0 },
  );
}

export function createSessionPeriod(input: {
  name: string;
  timeLabel: string;
  summary: string;
}): HistoricalPeriod {
  return {
    id: crypto.randomUUID(),
    ...input,
    status: "draft",
    stages: [],
  };
}

export function createSessionStage(input: {
  name: string;
  timeLabel: string;
  summary: string;
}): HistoricalStage {
  return {
    id: crypto.randomUUID(),
    ...input,
    status: "draft",
    events: [],
  };
}

export function createSessionEvent(input: {
  name: string;
  timeLabel: string;
  summary: string;
}): HistoricalEvent {
  return {
    id: crypto.randomUUID(),
    ...input,
    status: "missing_source",
    sources: [],
    podcastCount: 0,
    updatedAt: new Intl.DateTimeFormat("vi-VN").format(new Date()),
  };
}
