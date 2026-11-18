import { prisma } from "@repo/db";
import { ExperiencePolicySchema, type ExperienceFeature, type ExperiencePolicyInput } from "@repo/shared";
import { writeAudit } from "../../../core/audit";
import { DomainError } from "../../../core/errors/domain-error";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const features = ["podcast", "quiz", "exhibition"] as const;
type VisitFeature = Exclude<ExperienceFeature, "podcast">;

/** UTC midnight of the Vietnamese calendar day, matching PostgreSQL DATE. */
export function experienceDay(now: Date): Date {
  return new Date(Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS);
}

export function experienceResetAt(now: Date): Date {
  return new Date(experienceDay(now).getTime() + DAY_MS - VN_OFFSET_MS);
}

export async function experiencePolicy(feature: ExperienceFeature) {
  return ExperiencePolicySchema.parse(await prisma.experienceAccessPolicy.findUniqueOrThrow({ where: { feature } }));
}

export async function listExperiencePolicies() {
  const rows = await prisma.experienceAccessPolicy.findMany();
  return rows.map((row) => ExperiencePolicySchema.parse(row));
}

export async function updateExperiencePolicy(feature: ExperienceFeature, input: ExperiencePolicyInput, actor: { actorId: string; ipAddress: string | null }) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT feature FROM experience_access_policies WHERE feature = ${feature} FOR UPDATE`;
    const before = await tx.experienceAccessPolicy.findUniqueOrThrow({ where: { feature } });
    const after = await tx.experienceAccessPolicy.update({ where: { feature }, data: input });
    await writeAudit(tx, {
      ...actor,
      actorType: "ADMIN",
      action: "membership.policy.update",
      resourceType: "experience_feature",
      resourceId: feature,
      changes: { before, after },
    });
    return ExperiencePolicySchema.parse(after);
  });
}

export function expectFreeMode(mode: ExperiencePolicyInput["mode"]): void {
  if (mode === "premium_only") {
    throw new DomainError(403, "PREMIUM_REQUIRED", "Nâng cấp Premium để sử dụng tính năng này.");
  }
}

export async function startExperience(feature: VisitFeature, userId: string, subject: string, attemptId: string, now = new Date()): Promise<void> {
  const day = experienceDay(now);
  await prisma.$transaction(async (tx) => {
    // Serialize new admissions with grants and revocations for this account.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::varchar FOR UPDATE`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${userId}:${feature}`}))`;
    const key = { userId, feature, attemptId };
    const existing = await tx.experienceDailyUse.findUnique({ where: { userId_feature_attemptId: key } });
    if (existing) {
      if (existing.subject !== subject) throw new DomainError(409, "CONFLICT", "Mã bắt đầu đã dùng cho nội dung khác.");
      return;
    }
    const premium = await tx.membership.findFirst({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      select: { id: true },
    });
    await tx.$queryRaw`SELECT feature FROM experience_access_policies WHERE feature = ${feature} FOR SHARE`;
    const policy = ExperiencePolicySchema.parse(await tx.experienceAccessPolicy.findUniqueOrThrow({ where: { feature } }));
    if (!premium) expectFreeMode(policy.mode);
    if (!premium && policy.mode === "free_limited") {
      const used = await tx.experienceDailyUse.count({ where: { userId, feature, day, counted: true } });
      if (used >= policy.dailyQuota) {
        throw new DomainError(403, "EXPERIENCE_QUOTA_REACHED", "Đã hết lượt miễn phí. Lượt mới mở lúc 00:00 giờ Việt Nam.");
      }
    }
    await tx.experienceDailyUse.createMany({ data: [{ ...key, day, subject, counted: !premium }], skipDuplicates: true });
  });
}

export async function listExperienceQuotas(userId: string, now = new Date()) {
  const day = experienceDay(now);
  const policies = await listExperiencePolicies();
  return Promise.all(features.map(async (feature) => {
    const policy = policies.find((item) => item.feature === feature);
    if (!policy) throw new Error(`Missing experience policy for ${feature}`);
    const usedToday = feature === "podcast"
      ? await prisma.listeningDailyPlay.count({ where: { userId, playDate: day } })
      : await prisma.experienceDailyUse.count({ where: { userId, feature, day, counted: true } });
    return {
      feature,
      mode: policy.mode,
      enforced: policy.mode === "free_limited",
      usedToday,
      limit: policy.dailyQuota,
      remaining: policy.dailyQuota === null ? null : Math.max(0, policy.dailyQuota - usedToday),
      resetsAt: experienceResetAt(now),
    };
  }));
}
