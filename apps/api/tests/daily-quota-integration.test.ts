import { expect, test } from "bun:test";
import { prisma, Prisma } from "@repo/db";
import { experiencePolicy } from "../src/modules/membership/application/experience-access";
import { checkDailyPlay, playDate, reserveDailyPlay } from "../src/modules/listening/application/daily-quota";
import { assertTestDatabase, RUN_INTEGRATION } from "./support/integration";

test.skipIf(!RUN_INTEGRATION)("daily quota claims plays atomically per VN day", async () => {
  assertTestDatabase();
  const policy = await experiencePolicy("podcast");
  expect(policy.mode).toBe("free_limited");
  if (policy.mode !== "free_limited") throw new Error("Expected limited podcast policy");
  const limit = policy.dailyQuota;
  const ownerId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const otherId = crypto.randomUUID();
  let seriesId: string | null = null;

  try {
    await prisma.user.createMany({
      data: [ownerId, userId, otherId].map((id) => ({ id, name: "Daily quota test", email: `${id}@test.example` })),
    });
    const series = await prisma.series.create({
      data: { ownerId, slug: `quota-${ownerId}`, title: "Quota test", status: "PUBLISHED" },
    });
    seriesId = series.id;
    const episodeIds: string[] = [];
    for (let index = 0; index < limit + 2; index += 1) {
      const episode = await prisma.episode.create({
        data: { seriesId: series.id, title: `Episode ${index}`, slug: `quota-${ownerId}-${index}`, sortOrder: index + 1, status: "PUBLISHED" },
      });
      episodeIds.push(episode.id);
    }

    await checkDailyPlay(userId, episodeIds[0]!);
    await checkDailyPlay(userId, episodeIds[0]!);
    expect(await prisma.listeningDailyPlay.count({ where: { userId } })).toBe(0);
    for (let index = 0; index < limit; index += 1) {
      expect(await reserveDailyPlay(userId, episodeIds[index]!)).toEqual({ outcome: "allowed" });
    }
    expect(await reserveDailyPlay(userId, episodeIds[0]!)).toEqual({ outcome: "already" });
    expect(await reserveDailyPlay(userId, episodeIds[limit]!)).toEqual({ outcome: "limit" });

    const row = await prisma.listeningDailyPlay.findUniqueOrThrow({
      where: { userId_playDate_episodeId: { userId, playDate: playDate(), episodeId: episodeIds[0]! } },
    });
    expect(row.playDate.toISOString()).toBe(playDate().toISOString());

    let duplicateRejected = false;
    try {
      await prisma.listeningDailyPlay.create({ data: { userId, playDate: playDate(), episodeId: episodeIds[0]! } });
    } catch (error) {
      duplicateRejected = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    }
    expect(duplicateRejected).toBe(true);

    // One slot left: two parallel new episodes may claim it only once.
    for (let index = 0; index < limit - 1; index += 1) {
      await prisma.listeningDailyPlay.create({ data: { userId: otherId, playDate: playDate(), episodeId: episodeIds[index]! } });
    }
    const outcomes = await Promise.all([
      reserveDailyPlay(otherId, episodeIds[episodeIds.length - 2]!),
      reserveDailyPlay(otherId, episodeIds[episodeIds.length - 1]!),
    ]);
    expect(outcomes.map((value) => value.outcome).sort()).toEqual(["allowed", "limit"]);
    expect(await prisma.listeningDailyPlay.count({ where: { userId: otherId, playDate: playDate() } })).toBe(limit);
    await prisma.experienceAccessPolicy.update({ where: { feature: "podcast" }, data: { mode: "free_limited", dailyQuota: 1 } });
    expect((await reserveDailyPlay(userId, episodeIds[limit]!)).outcome).toBe("limit");
    await prisma.experienceAccessPolicy.update({ where: { feature: "podcast" }, data: { mode: "free_unlimited", dailyQuota: null } });
    expect((await reserveDailyPlay(userId, episodeIds[limit]!)).outcome).toBe("allowed");
    await prisma.experienceAccessPolicy.update({ where: { feature: "podcast" }, data: { mode: "premium_only", dailyQuota: null } });
    await expect(reserveDailyPlay(userId, episodeIds[limit + 1]!)).rejects.toMatchObject({ code: "PREMIUM_REQUIRED" });
  } finally {
    await prisma.experienceAccessPolicy.update({ where: { feature: "podcast" }, data: { mode: policy.mode, dailyQuota: policy.dailyQuota } });
    await prisma.listeningDailyPlay.deleteMany({ where: { userId: { in: [userId, otherId] } } });
    if (seriesId) {
      await prisma.episode.deleteMany({ where: { seriesId } });
      await prisma.series.deleteMany({ where: { id: seriesId } });
    }
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, userId, otherId] } } });
  }
});
