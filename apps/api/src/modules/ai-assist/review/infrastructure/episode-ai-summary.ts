import { prisma } from "@repo/db";
import type { EpisodeAiSummary } from "@repo/shared";

type SummaryRow = Pick<
  EpisodeAiSummary,
  "checkId" | "status" | "errorCode" | "failedBlocks" | "createdAt" | "total" | "reviewed" | "openHigh" | "applied"
>;

/**
 * What the system observed about the latest SCRIPT_REVIEW of an episode: counts only. One aggregate query and no claim
 * about truth; releases reads this one-way.
 */
export async function getEpisodeAiSummary(
  episodeId: string,
): Promise<EpisodeAiSummary | null> {
  const rows = await prisma.$queryRaw<SummaryRow[]>`
    SELECT
      c.id AS "checkId",
      c.status::text AS status,
      c.error_code AS "errorCode",
      c.failed_blocks AS "failedBlocks",
      c.created_at AS "createdAt",
      COUNT(i.id)::int AS total,
      COUNT(i.id) FILTER (WHERE i.status::text = 'REVIEWED')::int AS reviewed,
      COUNT(i.id) FILTER (WHERE i.status::text <> 'REVIEWED' AND i.severity::text = 'HIGH')::int AS "openHigh",
      COUNT(i.id) FILTER (WHERE i.applied_at IS NOT NULL)::int AS applied
    FROM ai_checks c
    LEFT JOIN ai_check_items i ON i.check_id = c.id
    WHERE c.episode_id = ${episodeId}::uuid
      AND c.kind::text = 'SCRIPT_REVIEW'
    GROUP BY c.id, c.status, c.error_code, c.failed_blocks, c.created_at
    ORDER BY c.created_at DESC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    open: row.total - row.reviewed,
  };
}
