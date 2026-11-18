import type { AdminListeningReport } from "@repo/shared";

export interface ListeningReportWindow {
  start: Date;
  end: Date;
  now: Date;
}

export interface ListeningReportRepository {
  read(window: ListeningReportWindow): Promise<Pick<AdminListeningReport, "summary" | "daily" | "topEpisodes" | "weekly" | "monthly">>;
}
