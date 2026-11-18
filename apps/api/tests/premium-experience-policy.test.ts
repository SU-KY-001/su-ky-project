import { expect, test } from "bun:test";
import { prisma } from "@repo/db";
import { experiencePolicy, listExperienceQuotas, startExperience, updateExperiencePolicy } from "../src/modules/membership/application/experience-access";
import { assertTestDatabase, RUN_INTEGRATION } from "./support/integration";

for (const feature of ["quiz", "exhibition"] as const) {
  test.skipIf(!RUN_INTEGRATION)(`${feature} retries reuse one start id while a deliberate new start consumes a new turn`, async () => {
    assertTestDatabase();
    const userId = crypto.randomUUID();
    await prisma.user.create({ data: { id: userId, name: "Start replay", email: `${userId}@example.test` } });
    try {
      const first = crypto.randomUUID();
      await Promise.all([
        startExperience(feature, userId, "same-content", first),
        startExperience(feature, userId, "same-content", first),
      ]);
      await startExperience(feature, userId, "same-content", first);
      expect(await prisma.experienceDailyUse.count({ where: { userId, feature } })).toBe(1);
      if (feature === "quiz") {
        await startExperience(feature, userId, "same-content", crypto.randomUUID());
        expect(await prisma.experienceDailyUse.count({ where: { userId, feature } })).toBe(2);
      }
    } finally {
      await prisma.user.delete({ where: { id: userId } });
    }
  });
}

for (const feature of ["quiz", "exhibition"] as const) {
test.skipIf(!RUN_INTEGRATION)(feature + " quotas deduplicate retries and apply policy changes immediately", async () => {
  assertTestDatabase();
  const userId = crypto.randomUUID();
  const original = await experiencePolicy(feature);
  await prisma.user.create({ data: { id: userId, name: "Quota test", email: `${userId}@example.com` } });
  try {
    const actor = { actorId: userId, ipAddress: null };
    const today = new Date("2026-11-18T16:59:59Z");
    const tomorrow = new Date("2026-11-18T17:00:00Z");
    await updateExperiencePolicy(feature, { mode: "free_limited", dailyQuota: 2 }, actor);
    const first = crypto.randomUUID();
    await Promise.all([
      startExperience(feature, userId, "same-quiz", first, today),
      startExperience(feature, userId, "same-quiz", first, today),
    ]);
    await expect(startExperience(feature, userId, "different-quiz", first, today)).rejects.toMatchObject({ code: "CONFLICT" });
    await startExperience(feature, userId, "same-quiz", crypto.randomUUID(), today);
    await updateExperiencePolicy(feature, { mode: "free_limited", dailyQuota: 1 }, actor);
    await expect(startExperience(feature, userId, "same-quiz", crypto.randomUUID(), today)).rejects.toMatchObject({ code: "EXPERIENCE_QUOTA_REACHED" });
    expect((await listExperienceQuotas(userId, today)).find((quota) => quota.feature === feature)).toMatchObject({ usedToday: 2, remaining: 0, resetsAt: tomorrow });
    await startExperience(feature, userId, "same-quiz", crypto.randomUUID(), tomorrow);
    await updateExperiencePolicy(feature, { mode: "free_unlimited", dailyQuota: null }, actor);
    await startExperience(feature, userId, "same-quiz", crypto.randomUUID(), tomorrow);
    expect((await listExperienceQuotas(userId, tomorrow)).find((quota) => quota.feature === feature)).toMatchObject({ enforced: false, usedToday: 2, remaining: null });
    await updateExperiencePolicy(feature, { mode: "premium_only", dailyQuota: null }, actor);
    await expect(startExperience(feature, userId, "same-quiz", crypto.randomUUID(), tomorrow)).rejects.toMatchObject({ code: "PREMIUM_REQUIRED" });
  } finally {
    await prisma.experienceAccessPolicy.update({ where: { feature: original.feature }, data: { mode: original.mode, dailyQuota: original.dailyQuota } });
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
});

}