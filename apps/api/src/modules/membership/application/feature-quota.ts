import { PREMIUM_FEATURE_LIMITS, type FeatureQuota, type PremiumFeature } from "@repo/shared";
import { prisma } from "@repo/db";
import { hasActiveMembership } from "./entitlement";

/** Vietnam is UTC+7 all year (no DST), so a fixed offset is exact. */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const STAFF_ROLES: Record<string, true> = { admin: true, moderator: true };

/** UTC midnight of the Vietnam calendar day containing `now`, matching the `DATE` column. */
export function quotaDay(now = new Date()): Date {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()));
}

/** Next Vietnam midnight — when today's usage stops counting. */
export function nextQuotaResetAt(now = new Date()): Date {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + 1) - VN_OFFSET_MS);
}

/** Human copy for reset countdowns, e.g. "3 giờ 12 phút". */
export function formatQuotaResetIn(now = new Date()): string {
  const minutes = Math.max(1, Math.ceil((nextQuotaResetAt(now).getTime() - now.getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? (rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`) : `${rest} phút`;
}

/** Premium subscriptions and staff skip every Free quota. */
async function isExempt(userId: string, role: string | null | undefined): Promise<boolean> {
  if (role && STAFF_ROLES[role]) return true;
  return hasActiveMembership(userId);
}

export type FeatureUsageOutcome = "allowed" | "already" | "limit" | "exempt";

/**
 * Claims one Free use of `feature` for today. `refKey` dedupes within the day (podcast episode,
 * exhibition slug); omit it for actions that always count (quiz starts).
 * The advisory lock serialises the check-then-insert so two concurrent starts cannot exceed the limit.
 */
export async function reserveFeatureUsage(input: {
  userId: string;
  role: string | null | undefined;
  feature: PremiumFeature;
  refKey?: string;
  now?: Date;
}): Promise<FeatureUsageOutcome> {
  if (await isExempt(input.userId, input.role)) return "exempt";
  const day = quotaDay(input.now);
  const limit = PREMIUM_FEATURE_LIMITS[input.feature];
  return prisma.$transaction(async (tx) => {
    // `$executeRaw`: pg_advisory_xact_lock returns void, which `$queryRaw` cannot deserialize.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.userId}:${input.feature}:${day.toISOString().slice(0, 10)}`}))`;
    if (input.refKey) {
      const existing = await tx.featureDailyUsage.findUnique({
        where: { userId_feature_usageDate_refKey: { userId: input.userId, feature: input.feature, usageDate: day, refKey: input.refKey } },
        select: { id: true },
      });
      if (existing) return "already";
    }
    const used = await tx.featureDailyUsage.count({ where: { userId: input.userId, feature: input.feature, usageDate: day } });
    if (used >= limit) return "limit";
    await tx.featureDailyUsage.create({
      data: { userId: input.userId, feature: input.feature, usageDate: day, refKey: input.refKey ?? crypto.randomUUID() },
    });
    return "allowed";
  });
}

/** Today's quota for every limited feature; empty when the account is exempt. */
export async function getFeatureQuotas(
  userId: string,
  role: string | null | undefined,
  now = new Date(),
): Promise<FeatureQuota[]> {
  if (await isExempt(userId, role)) return [];
  const day = quotaDay(now);
  const rows = await prisma.featureDailyUsage.groupBy({
    by: ["feature"],
    where: { userId, usageDate: day },
    _count: { _all: true },
  });
  const usedByFeature = new Map(rows.map((row) => [row.feature, row._count._all]));
  return (Object.keys(PREMIUM_FEATURE_LIMITS) as PremiumFeature[]).map((feature) => {
    const limit = PREMIUM_FEATURE_LIMITS[feature];
    const usedToday = usedByFeature.get(feature) ?? 0;
    return { feature, limit, usedToday, remaining: Math.max(0, limit - usedToday), resetsAt: nextQuotaResetAt(now) };
  });
}
