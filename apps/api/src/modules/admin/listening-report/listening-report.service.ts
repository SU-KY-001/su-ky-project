import { AdminListeningReportQuerySchema, type AdminListeningReport, type AdminListeningReportQuery } from "@repo/shared";
import type { ListeningReportRepository } from "./listening-report.repository";

export class ListeningReportService {
  constructor(private readonly repository: ListeningReportRepository, private readonly clock: () => Date = () => new Date()) {}

  async report(input: AdminListeningReportQuery): Promise<AdminListeningReport> {
    const { from, to } = AdminListeningReportQuerySchema.parse(input);
    const now = this.clock();
    const start = new Date(`${from}T00:00:00+07:00`);
    const end = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86_400_000);
    const data = await this.repository.read({ start, end, now });
    const byDate = new Map(data.daily.map((day) => [day.date, day]));
    const daily: AdminListeningReport["daily"] = [];
    for (let day = Date.parse(`${from}T00:00:00Z`); day <= Date.parse(`${to}T00:00:00Z`); day += 86_400_000) {
      const date = new Date(day).toISOString().slice(0, 10);
      daily.push(byDate.get(date) ?? { date, uniqueListeners: 0, validListens: 0, listeningMs: 0 });
    }
    const fillGroups = (unit: "week" | "month", rows: AdminListeningReport["daily"] | undefined): AdminListeningReport["daily"] | undefined => {
      if (!rows) return undefined;
      const keys = new Set<string>();
      for (const day of daily) {
        const date = new Date(`${day.date}T00:00:00Z`);
        if (unit === "week") date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
        else date.setUTCDate(1);
        keys.add(date.toISOString().slice(0, 10));
      }
      const byKey = new Map(rows.map((row) => [row.date, row]));
      return [...keys].map((date) => byKey.get(date) ?? { date, uniqueListeners: 0, validListens: 0, listeningMs: 0 });
    };
    return { ...data, daily, weekly: fillGroups("week", data.weekly), monthly: fillGroups("month", data.monthly), from, to, timezone: "Asia/Ho_Chi_Minh", generatedAt: now.toISOString() };
  }
}
