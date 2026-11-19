import { mondayInVietnam, vietnamWeekWindow } from "../../../core/weekly-mission";

export function podcastRankingWindow(period: "week" | "month", now: Date): { start: Date; end: Date } {
  if (period === "week") return vietnamWeekWindow(mondayInVietnam(now));
  const offset = 7 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offset);
  return { start: new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offset), end: new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - offset) };
}
