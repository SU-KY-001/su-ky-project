import { prisma } from "@repo/db";
import type { EpisodeAiSummary } from "@repo/shared";

/**
 * What the system observed about the latest SCRIPT_REVIEW of an episode: counts only. Three small queries (latest
 * check, one grouped count, applied count) and no claim about truth; releases reads this one-way.
 */
export async function getEpisodeAiSummary(episodeId: string): Promise<EpisodeAiSummary | null> {
  const check = await prisma.aiCheck.findFirst({
    where: { episodeId, kind: "SCRIPT_REVIEW" },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, errorCode: true, failedBlocks: true, createdAt: true },
  });
  if (!check) return null;
  const [groups, applied] = await Promise.all([
    prisma.aiCheckItem.groupBy({ by: ["status", "severity"], where: { checkId: check.id }, _count: { _all: true } }),
    prisma.aiCheckItem.count({ where: { checkId: check.id, appliedAt: { not: null } } }),
  ]);
  let total = 0;
  let reviewed = 0;
  let openHigh = 0;
  for (const group of groups) {
    const count = group._count._all;
    total += count;
    if (group.status === "REVIEWED") reviewed += count;
    else if (group.severity === "HIGH") openHigh += count;
  }
  return { checkId: check.id, status: check.status, errorCode: check.errorCode, failedBlocks: check.failedBlocks, createdAt: check.createdAt, total, reviewed, open: total - reviewed, openHigh, applied };
}
