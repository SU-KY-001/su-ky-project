import { Prisma, prisma } from "@repo/db";
import type { PodcastRankingQuery, PodcastRankingResponse } from "@repo/shared";
import { podcastRankingWindow } from "./podcast-ranking-window";

export class PodcastRankingService {
  constructor(private readonly db = prisma, private readonly clock: () => Date = () => new Date()) {}

  async list(userId: string, query: PodcastRankingQuery): Promise<PodcastRankingResponse> {
    const { scope, period, page, limit } = query;
    const now = this.clock();
    const window = podcastRankingWindow(period, now);
    // Exclude unavailable tracks; two narrator voices contribute to the same episode.
    const source = Prisma.sql`
      FROM listening_sessions ls JOIN episodes e ON e.id = ls.episode_id JOIN series s ON s.id = e.series_id
      WHERE ls.qualified_at IS NOT NULL AND ls.qualified_at <= ${now}
        AND ls.started_at >= ${window.start} AND ls.started_at < ${window.end}
        ${scope === "personal" ? Prisma.sql`AND ls.user_id = ${userId}` : Prisma.empty}
        AND e.status = 'PUBLISHED' AND e.deleted_at IS NULL AND s.status = 'PUBLISHED' AND s.deleted_at IS NULL
        AND EXISTS (SELECT 1 FROM episode_narrations n JOIN media_assets a ON a.id = n.audio_asset_id
          WHERE n.episode_id = e.id AND a.status = 'READY' AND a.deleted_at IS NULL AND a.kind = 'AUDIO' AND a.duration_ms > 0)
    `;
    return this.db.$transaction(async (tx) => {
      const counts = await tx.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(DISTINCT e.id) AS total ${source}`);
      const rows = await tx.$queryRaw<Array<{ episodeId: string; episodeSlug: string; title: string; seriesSlug: string; seriesTitle: string; listenCount: bigint }>>(Prisma.sql`
        SELECT e.id AS "episodeId", e.slug AS "episodeSlug", e.title, s.slug AS "seriesSlug", s.title AS "seriesTitle", COUNT(*) AS "listenCount"
        ${source} GROUP BY e.id, e.slug, e.title, s.slug, s.title
        ORDER BY COUNT(*) DESC, e.title ASC, e.id ASC LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `);
      return { scope, period, window: { ...window, timezone: "Asia/Ho_Chi_Minh" }, page, limit, total: Number(counts[0]?.total ?? 0), items: rows.map((row, index) => ({ ...row, rank: (page - 1) * limit + index + 1, listenCount: Number(row.listenCount) })) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
