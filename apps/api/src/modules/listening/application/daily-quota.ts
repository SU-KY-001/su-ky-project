import { prisma } from "@repo/db";
import { getSystemConfig } from "../../../core/config/system-config";

/** Vietnam is UTC+7 all year (no DST), so a fixed offset is exact. */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface DailyPlayReservation {
  /** `allowed` = first play today, `already` = same episode already counted today, `limit` = quota spent. */
  outcome: "allowed" | "already" | "limit";
}

export interface DailyQuotaStatus {
  enforced: boolean;
  limit: number | null;
  usedToday: number;
  remaining: number | null;
  resetsAt: Date;
}

/** UTC midnight of the Vietnam calendar day containing `now`, matching the `DATE` column. */
export function playDate(now = new Date()): Date {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()));
}

/** Next Vietnam midnight — when today's plays stop counting. */
export function nextResetAt(now = new Date()): Date {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + 1) - VN_OFFSET_MS);
}

async function readQuotaConfig(): Promise<{ enforced: boolean; limit: number }> {
  const [enforced, limit] = await Promise.all([
    getSystemConfig("premium.enforce_daily_quota"),
    getSystemConfig("premium.free_daily_plays"),
  ]);
  return { enforced, limit };
}

/**
 * Claims one play for `episodeId` today. The per-user/day advisory lock serialises the
 * check-then-insert so two concurrent episodes cannot both pass the last free slot.
 */
export async function reserveDailyPlay(
  userId: string,
  episodeId: string,
  now = new Date(),
): Promise<DailyPlayReservation> {
  const { enforced, limit } = await readQuotaConfig();
  if (!enforced) return { outcome: "allowed" };
  const day = playDate(now);
  return prisma.$transaction(async (tx): Promise<DailyPlayReservation> => {
    // `$executeRaw`: pg_advisory_xact_lock returns void, which `$queryRaw` cannot deserialize.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${userId}:${day.toISOString().slice(0, 10)}`}))`;
    const existing = await tx.listeningDailyPlay.findUnique({
      where: { userId_playDate_episodeId: { userId, playDate: day, episodeId } },
      select: { userId: true },
    });
    if (existing) return { outcome: "already" };
    const used = await tx.listeningDailyPlay.count({ where: { userId, playDate: day } });
    if (used >= limit) return { outcome: "limit" };
    await tx.listeningDailyPlay.create({ data: { userId, playDate: day, episodeId } });
    return { outcome: "allowed" };
  });
}

export async function getDailyQuotaStatus(userId: string, now = new Date()): Promise<DailyQuotaStatus> {
  const [{ enforced, limit }, usedToday] = await Promise.all([
    readQuotaConfig(),
    prisma.listeningDailyPlay.count({ where: { userId, playDate: playDate(now) } }),
  ]);
  return {
    enforced,
    limit: enforced ? limit : null,
    usedToday,
    remaining: enforced ? Math.max(0, limit - usedToday) : null,
    resetsAt: nextResetAt(now),
  };
}
