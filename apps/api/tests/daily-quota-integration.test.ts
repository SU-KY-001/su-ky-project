import { expect, test } from "bun:test";
import { prisma, Prisma } from "@repo/db";
import { getSystemConfig } from "../src/core/config/system-config";
import { playDate, reserveDailyPlay } from "../src/modules/listening/application/daily-quota";
import { assertTestDatabase, RUN_INTEGRATION } from "./support/integration";

test.skipIf(!RUN_INTEGRATION)("daily quota claims plays atomically per VN day", async () => {
  assertTestDatabase();
  if (!(await getSystemConfig("premium.enforce_daily_quota"))) return;
  const limit = await getSystemConfig("premium.free_daily_plays");
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
  } finally {
    await prisma.listeningDailyPlay.deleteMany({ where: { userId: { in: [userId, otherId] } } });
    if (seriesId) {
      await prisma.episode.deleteMany({ where: { seriesId } });
      await prisma.series.deleteMany({ where: { id: seriesId } });
    }
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, userId, otherId] } } });
  }
});
