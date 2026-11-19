import { Prisma, prisma } from "@repo/db";
import type { TopQuizItem, TopQuizzesQuery, TopQuizzesResponse } from "@repo/shared";

export class TopQuizzesService {
  constructor(private readonly db = prisma) {}

  async list(userId: string, { page, limit }: TopQuizzesQuery): Promise<TopQuizzesResponse> {
    return this.db.$transaction(async (tx) => {
      const totals = await tx.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(DISTINCT quiz_id) AS total FROM quiz_attempts WHERE user_id = ${userId}
      `);
      const rows = await tx.$queryRaw<Array<Omit<TopQuizItem, "attemptCount"> & { attemptCount: bigint }>>(Prisma.sql`
        WITH ranked AS (
          SELECT quiz_id, COUNT(*) AS attempts, MAX(submitted_at) AS last_submitted
          FROM quiz_attempts WHERE user_id = ${userId} GROUP BY quiz_id
          ORDER BY attempts DESC, last_submitted DESC, quiz_id ASC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        )
        SELECT q.id AS "quizId", COALESCE(NULLIF(q.title, ''), 'Quiz · ' || e.title) AS title,
          e.id AS "episodeId", e.slug AS "episodeSlug", e.title AS "episodeTitle",
          s.title AS "seriesTitle", s.slug AS "seriesSlug",
          r.attempts AS "attemptCount", r.last_submitted AS "lastSubmittedAt",
          (e.status = 'PUBLISHED' AND e.deleted_at IS NULL AND s.status = 'PUBLISHED' AND s.deleted_at IS NULL
            AND EXISTS (SELECT 1 FROM quiz_questions qq WHERE qq.quiz_id = q.id)
            AND NOT EXISTS (SELECT 1 FROM quiz_questions qq WHERE qq.quiz_id = q.id AND qq.kind <> 'SINGLE')) AS available
        FROM ranked r JOIN quizzes q ON q.id = r.quiz_id
          JOIN episodes e ON e.id = q.episode_id JOIN series s ON s.id = e.series_id
        ORDER BY r.attempts DESC, r.last_submitted DESC, q.id ASC
      `);
      return { page, limit, total: Number(totals[0]?.total ?? 0), items: rows.map((row) => ({ ...row, attemptCount: Number(row.attemptCount) })) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
