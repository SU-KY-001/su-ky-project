import { Prisma, prisma } from "@repo/db";
import type { AdminListeningReport } from "@repo/shared";
import type { ListeningReportRepository, ListeningReportWindow } from "./listening-report.repository";

interface Counts {
  uniqueListeners: bigint;
  validListens: bigint;
  listeningMs: bigint | null;
}
function numbers(row: Counts): { uniqueListeners: number; validListens: number; listeningMs: number } {
  return { uniqueListeners: Number(row.uniqueListeners), validListens: Number(row.validListens), listeningMs: Number(row.listeningMs ?? 0) };
}

export class PrismaListeningReportRepository implements ListeningReportRepository {
  constructor(private readonly db = prisma) {}

  async read({ start, end, now }: ListeningReportWindow): Promise<Pick<AdminListeningReport, "summary" | "daily" | "topEpisodes" | "weekly" | "monthly">> {
    // Attribute accepted listening time to the session start day; no client event timestamps are trusted.
    const source = Prisma.sql`FROM listening_sessions ls
      WHERE ls.started_at >= ${start} AND ls.started_at < ${end} AND ls.started_at <= ${now} AND ls.played_ms > 0`;
    const counts = Prisma.sql`COUNT(DISTINCT ls.user_id) AS "uniqueListeners",
      COUNT(*) FILTER (WHERE ls.qualified_at IS NOT NULL AND ls.qualified_at <= ${now}) AS "validListens",
      COALESCE(SUM(ls.played_ms::bigint), 0) AS "listeningMs"`;
    return this.db.$transaction(async (tx) => {
      const summary = await tx.$queryRaw<Array<Counts & { completedEpisodes: bigint }>>(Prisma.sql`
        SELECT ${counts},
          (SELECT COUNT(DISTINCT (p.user_id, p.episode_id)) FROM listening_progress p
           WHERE p.completed_at >= ${start} AND p.completed_at < ${end} AND p.completed_at <= ${now}) AS "completedEpisodes"
        ${source}`);
      const daily = await tx.$queryRaw<Array<Counts & { date: string }>>(Prisma.sql`
        SELECT TO_CHAR(ls.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date, ${counts}
        ${source} GROUP BY date ORDER BY date`);
      const top = await tx.$queryRaw<Array<Counts & { episodeId: string; title: string; seriesTitle: string }>>(Prisma.sql`
        WITH sessions AS (SELECT ls.* ${source})
        SELECT e.id AS "episodeId", e.title, s.title AS "seriesTitle", ${counts}
        FROM sessions ls JOIN episodes e ON e.id = ls.episode_id JOIN series s ON s.id = e.series_id
        GROUP BY e.id, e.title, s.title
        HAVING COUNT(*) FILTER (WHERE ls.qualified_at IS NOT NULL AND ls.qualified_at <= ${now}) > 0
        ORDER BY "validListens" DESC, "uniqueListeners" DESC, "listeningMs" DESC, e.id ASC LIMIT 5`);
      const grouped = await tx.$queryRaw<Array<Counts & { date: string; period: string }>>(Prisma.sql`
        SELECT periods.period, TO_CHAR(DATE_TRUNC(periods.period, ls.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS date, ${counts}
        FROM listening_sessions ls CROSS JOIN (VALUES ('week'), ('month')) AS periods(period)
        WHERE ls.started_at >= ${start} AND ls.started_at < ${end} AND ls.started_at <= ${now} AND ls.played_ms > 0
        GROUP BY periods.period, date ORDER BY date`);
      const total = summary[0];
      return {
        summary: total ? { ...numbers(total), completedEpisodes: Number(total.completedEpisodes) } : { uniqueListeners: 0, validListens: 0, listeningMs: 0, completedEpisodes: 0 },
        daily: daily.map((row) => ({ date: row.date, ...numbers(row) })),
        weekly: grouped.filter((row) => row.period === "week").map((row) => ({ date: row.date, ...numbers(row) })),
        monthly: grouped.filter((row) => row.period === "month").map((row) => ({ date: row.date, ...numbers(row) })),
        topEpisodes: top.map((row) => ({ episodeId: row.episodeId, title: row.title, seriesTitle: row.seriesTitle, ...numbers(row) })),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
