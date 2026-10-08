export type ModeratorMetricIcon = "series" | "episode" | "milestone" | "reference";

export interface ModeratorMetric {
  id: string;
  label: string;
  value: number;
  detail: string;
  icon: ModeratorMetricIcon;
}

export type ModeratorChartTone = "sky" | "violet" | "emerald";

export interface ModeratorChartSeries {
  id: string;
  label: string;
  tone: ModeratorChartTone;
  values: Array<number | null>;
}

export interface ModeratorChart {
  id: string;
  title: string;
  summary: string;
  unit: string;
  months: string[];
  series: ModeratorChartSeries[];
}

export type ModeratorIntegrationId = "google-analytics" | "search-console";
export type ModeratorIntegrationStatus = "connected" | "unconfigured" | "error";

export interface ModeratorIntegration {
  id: ModeratorIntegrationId;
  name: string;
  status: ModeratorIntegrationStatus;
  detail: string;
}

export type ModeratorQuickActionId =
  | "create-series"
  | "create-episode"
  | "add-milestone"
  | "add-reference";

export type ModeratorQuickActionIcon = "series" | "episode" | "milestone" | "reference";

export interface ModeratorQuickAction {
  id: ModeratorQuickActionId;
  title: string;
  description: string;
  icon: ModeratorQuickActionIcon;
}

export interface ModeratorOverviewData {
  greeting: string;
  moderatorLabel: string;
  metrics: ModeratorMetric[];
  charts: ModeratorChart[];
  integrations: ModeratorIntegration[];
  quickActions: ModeratorQuickAction[];
}
