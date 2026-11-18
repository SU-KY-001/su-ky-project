import { expect, test } from "bun:test";
import { prisma } from "@repo/db";
import { experiencePolicy, listExperienceQuotas, startExperience, updateExperiencePolicy } from "../src/modules/membership/application/experience-access";
import { assertTestDatabase, RUN_INTEGRATION } from "./support/integration";

test.skipIf(!RUN_INTEGRATION)("feature quotas deduplicate retries and apply policy changes immediately", async () => {
  assertTestDatabase();
  const userId = crypto.randomUUID();
  const original = await experiencePolicy("quiz");
  await prisma.user.create({ data: { id: userId, name: "Quota test", email: `${userId}@example.com` } });
  try {
    const actor = { actorId: userId, ipAddress: null };
    const today = new Date("2026-11-18T16:59:59Z");
    const tomorrow = new Date("2026-11-18T17:00:00Z");
    await updateExperiencePolicy("quiz", { mode: "free_limited", dailyQuota: 2 }, actor);
    const first = crypto.randomUUID();
    await Promise.all([
      startExperience("quiz", userId, "same-quiz", first, today),
      startExperience("quiz", userId, "same-quiz", first, today),
    ]);
    await expect(startExperience("quiz", userId, "different-quiz", first, today)).rejects.toMatchObject({ code: "CONFLICT" });
    await startExperience("quiz", userId, "same-quiz", crypto.randomUUID(), today);
    await updateExperiencePolicy("quiz", { mode: "free_limited", dailyQuota: 1 }, actor);
    await expect(startExperience("quiz", userId, "same-quiz", crypto.randomUUID(), today)).rejects.toMatchObject({ code: "EXPERIENCE_QUOTA_REACHED" });
    expect((await listExperienceQuotas(userId, today)).find(({ feature }) => feature === "quiz")).toMatchObject({ usedToday: 2, remaining: 0, resetsAt: tomorrow });
    await startExperience("quiz", userId, "same-quiz", crypto.randomUUID(), tomorrow);
    await updateExperiencePolicy("quiz", { mode: "free_unlimited", dailyQuota: null }, actor);
    await startExperience("quiz", userId, "same-quiz", crypto.randomUUID(), tomorrow);
    expect((await listExperienceQuotas(userId, tomorrow)).find(({ feature }) => feature === "quiz")).toMatchObject({ enforced: false, usedToday: 2, remaining: null });
    await updateExperiencePolicy("quiz", { mode: "premium_only", dailyQuota: null }, actor);
    await expect(startExperience("quiz", userId, "same-quiz", crypto.randomUUID(), tomorrow)).rejects.toMatchObject({ code: "PREMIUM_REQUIRED" });
  } finally {
    await prisma.experienceAccessPolicy.update({ where: { feature: original.feature }, data: { mode: original.mode, dailyQuota: original.dailyQuota } });
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
});
