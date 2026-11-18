import { expect, test } from "bun:test";
import { prisma, Prisma } from "@repo/db";
import { PREMIUM_FEATURE_LIMITS } from "@repo/shared";
import { quotaDay, reserveFeatureUsage } from "../src/modules/membership/application/feature-quota";
import { assertTestDatabase, RUN_INTEGRATION } from "./support/integration";

test.skipIf(!RUN_INTEGRATION)("feature quota claims uses atomically per VN day", async () => {
  assertTestDatabase();
  const limit = PREMIUM_FEATURE_LIMITS.podcast;
  const userId = crypto.randomUUID();
  const otherId = crypto.randomUUID();
  const keys = Array.from({ length: limit + 2 }, () => crypto.randomUUID());

  try {
    await prisma.user.createMany({
      data: [userId, otherId].map((id) => ({ id, name: "Quota test", email: `${id}@test.example` })),
    });

    for (let index = 0; index < limit; index += 1) {
      expect(await reserveFeatureUsage({ userId, role: null, feature: "podcast", refKey: keys[index]! })).toBe("allowed");
    }
    // Replaying a counted episode is free.
    expect(await reserveFeatureUsage({ userId, role: null, feature: "podcast", refKey: keys[0]! })).toBe("already");
    expect(await reserveFeatureUsage({ userId, role: null, feature: "podcast", refKey: keys[limit]! })).toBe("limit");
    // Other features have their own counters.
    expect(await reserveFeatureUsage({ userId, role: null, feature: "quiz" })).toBe("allowed");
    expect(await reserveFeatureUsage({ userId, role: null, feature: "exhibition", refKey: "ex-1" })).toBe("allowed");
    expect(await reserveFeatureUsage({ userId, role: null, feature: "exhibition", refKey: "ex-2" })).toBe("limit");

    const row = await prisma.featureDailyUsage.findFirstOrThrow({ where: { userId, feature: "podcast" } });
    expect(row.usageDate.toISOString()).toBe(quotaDay().toISOString());

    let duplicateRejected = false;
    try {
      await prisma.featureDailyUsage.create({
        data: { userId, feature: "podcast", usageDate: quotaDay(), refKey: keys[0]! },
      });
    } catch (error) {
      duplicateRejected = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    }
    expect(duplicateRejected).toBe(true);

    // One slot left: two parallel new episodes may claim it only once.
    for (let index = 0; index < limit - 1; index += 1) {
      await prisma.featureDailyUsage.create({
        data: { userId: otherId, feature: "podcast", usageDate: quotaDay(), refKey: keys[index]! },
      });
    }
    const outcomes = await Promise.all([
      reserveFeatureUsage({ userId: otherId, role: null, feature: "podcast", refKey: keys[limit]! }),
      reserveFeatureUsage({ userId: otherId, role: null, feature: "podcast", refKey: keys[limit + 1]! }),
    ]);
    expect(outcomes.sort()).toEqual(["allowed", "limit"]);
    expect(
      await prisma.featureDailyUsage.count({ where: { userId: otherId, feature: "podcast", usageDate: quotaDay() } }),
    ).toBe(limit);
  } finally {
    await prisma.featureDailyUsage.deleteMany({ where: { userId: { in: [userId, otherId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
  }
});
