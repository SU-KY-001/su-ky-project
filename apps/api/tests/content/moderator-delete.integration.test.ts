import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { ContentService } from "../../src/modules/content/application/content.service";
import { PrismaEpisodeRepository, PrismaSeriesRepository } from "../../src/modules/content/infrastructure/prisma-content.repository";
import { assertTestDatabase, createAdmin, createModerator, makeSession, removeFixtures, RUN_INTEGRATION, uniqueSuffix } from "../support/integration";

const suite = RUN_INTEGRATION ? describe : describe.skip;
suite("moderator draft deletion with release references", () => {
  const suffix = uniqueSuffix();
  const owner = `delete-owner-${suffix}`;
  const admin = `delete-admin-${suffix}`;
  const service = new ContentService(new PrismaSeriesRepository(), new PrismaEpisodeRepository());
  const session = makeSession(owner, "moderator");
  const scheduleIds: string[] = [];
  let counter = 0;
  async function fixture(status: "DRAFT" | "PUBLISHED" = "DRAFT") {
    counter += 1;
    const series = await prisma.series.create({ data: { ownerId: owner, title: "Series", slug: `delete-series-${suffix}-${counter}` } });
    const episode = await prisma.episode.create({ data: { seriesId: series.id, title: "Tập", slug: `delete-episode-${suffix}-${counter}`, sortOrder: 1, status } });
    return { series, episode };
  }
  beforeAll(async () => { assertTestDatabase(); await createModerator(owner); await createAdmin(admin); });
  afterAll(async () => {
    if (!RUN_INTEGRATION) return;
    await prisma.releaseSchedule.deleteMany({ where: { id: { in: scheduleIds } } });
    await removeFixtures(owner);
    await prisma.user.deleteMany({ where: { id: admin } });
  });
  it("soft deletes an owned draft episode and preserves its row", async () => {
    const { episode } = await fixture();
    await service.deleteEpisode(session, episode.id);
    expect((await prisma.episode.findUniqueOrThrow({ where: { id: episode.id } })).deletedAt).not.toBeNull();
  });
  it("blocks deletion of a draft series containing a published episode", async () => {
    const { series } = await fixture("PUBLISHED");
    await expect(service.deleteSeries(session, series.id)).rejects.toMatchObject({ status: 409 });
    expect((await prisma.series.findUniqueOrThrow({ where: { id: series.id } })).deletedAt).toBeNull();
  });
  it("blocks deletion while an episode is linked to a release schedule", async () => {
    const { series, episode } = await fixture();
    const schedule = await prisma.releaseSchedule.create({ data: { title: "Lịch", episodeId: episode.id, productionDeadline: new Date("2030-01-01"), scheduledAt: new Date("2030-01-02"), createdById: admin } });
    scheduleIds.push(schedule.id);
    await expect(service.deleteSeries(session, series.id)).rejects.toMatchObject({ status: 409 });
    await expect(service.deleteEpisode(session, episode.id)).rejects.toMatchObject({ status: 409 });
    await prisma.releaseSchedule.update({ where: { id: schedule.id }, data: { status: "CANCELLED" } });
    await service.deleteSeries(session, series.id);
    expect((await prisma.series.findUniqueOrThrow({ where: { id: series.id } })).deletedAt).not.toBeNull();
  });
});
