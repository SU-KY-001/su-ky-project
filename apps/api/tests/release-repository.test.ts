import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { PrismaReleaseRepository } from "../src/modules/releases/infrastructure/prisma-release.repository";
import { RUN_INTEGRATION, assertTestDatabase } from "./support/integration";

const suite = RUN_INTEGRATION ? describe : describe.skip;
const suffix = crypto.randomUUID().slice(0, 8);
const adminId = `release-admin-${suffix}`;
const firstModeratorId = `release-mod-a-${suffix}`;
const secondModeratorId = `release-mod-b-${suffix}`;
let scheduleId = "";
const scheduleIds: string[] = [];
let seriesId = "";
let episodeId = "";

suite("release repository", () => {
  beforeAll(async () => {
    assertTestDatabase();
    await prisma.user.createMany({ data: [
      { id: adminId, name: "Release Admin", email: `${adminId}@example.org`, role: "admin" },
      { id: firstModeratorId, name: "Moderator A", email: `${firstModeratorId}@example.org`, role: "moderator" },
      { id: secondModeratorId, name: "Moderator B", email: `${secondModeratorId}@example.org`, role: "moderator" },
    ] });
    const series = await prisma.series.create({
      data: {
        ownerId: firstModeratorId,
        title: "Release repository fixture",
        slug: `release-repository-${suffix}`,
      },
    });
    seriesId = series.id;
    const episode = await prisma.episode.create({
      data: {
        seriesId,
        title: "Dấu chân Trường Sơn",
        slug: `release-episode-${suffix}`,
        sortOrder: 1,
      },
    });
    episodeId = episode.id;
  });

  afterAll(async () => {
    if (!RUN_INTEGRATION) return;
    if (scheduleIds.length > 0) {
      await prisma.releaseSchedule.deleteMany({ where: { id: { in: scheduleIds } } });
      await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: scheduleIds } } });
      await prisma.auditLog.deleteMany({
        where: { resourceType: "release_schedule", resourceId: { in: scheduleIds } },
      });
    }
    if (episodeId) await prisma.episode.deleteMany({ where: { id: episodeId } });
    if (seriesId) await prisma.series.deleteMany({ where: { id: seriesId } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: [adminId, firstModeratorId, secondModeratorId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, firstModeratorId, secondModeratorId] } } });
  });

  it("creates a schedule with assignments, outbox and immutable progress", async () => {
    const repository = new PrismaReleaseRepository();
    const created = await repository.createSchedule({
      title: "Dấu chân Trường Sơn",
      episodeId,
      productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
      scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
      createdById: adminId,
      moderatorId: firstModeratorId,
      correlationId: `create-${suffix}`,
    });
    scheduleId = created.id;
    scheduleIds.push(created.id);

    expect(created.status).toBe("SCHEDULED");
    expect(created.assignments.map((item) => item.moderatorId)).toEqual([firstModeratorId]);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: created.id, eventType: "release.schedule.created" } })).toBe(1);
    expect((await repository.listProgress(created.id)).map((event) => event.action)).toEqual(["release_schedule.created"]);
  });

  it("replaces active assignees without losing assignment history", async () => {
    const repository = new PrismaReleaseRepository();
    await repository.replaceAssignee(scheduleId, secondModeratorId, adminId, `assign-${suffix}`);
    const schedule = await repository.findSchedule(scheduleId);

    expect(schedule?.assignments.map((item) => item.moderatorId)).toEqual([secondModeratorId]);
    expect(await prisma.productionAssignment.count({ where: { scheduleId } })).toBe(2);
  });

  it("keeps one immutable review record per episode revision", async () => {
    const repository = new PrismaReleaseRepository();
    const input = {
      scheduleId,
      episodeId,
      revision: 1,
      submittedById: secondModeratorId,
      correlationId: `review-${suffix}`,
    };

    await repository.createReview(input);
    await expect(repository.createReview(input)).rejects.toThrow();

    const progress = await repository.listProgress(scheduleId);
    expect(progress.map((event) => event.action)).toEqual([
      "release_schedule.created",
      "release_schedule.assignee_changed",
      "episode.review_submitted",
    ]);
  });

  it("allows only one worker to atomically claim a ready schedule version", async () => {
    const repository = new PrismaReleaseRepository();
    await prisma.releaseSchedule.update({ where: { id: scheduleId }, data: { status: "READY_TO_PUBLISH" } });

    expect(await repository.claimForPublishing(scheduleId, 1)).toBe(true);
    expect(await repository.claimForPublishing(scheduleId, 1)).toBe(false);
  });

  it("filters schedules and aggregates active moderator workload", async () => {
    const fixtures = await Promise.all([
      prisma.releaseSchedule.create({
        data: {
          title: "Biên niên Trường Sơn",
          productionDeadline: new Date("2026-10-21T10:00:00.000Z"),
          scheduledAt: new Date("2026-10-22T13:00:00.000Z"),
          status: "SCHEDULED",
          createdById: adminId,
          assignments: { create: { moderatorId: firstModeratorId, assignedById: adminId } },
        },
      }),
      prisma.releaseSchedule.create({
        data: {
          title: "Dòng chảy biển đảo",
          productionDeadline: new Date("2026-10-23T13:00:00.000Z"),
          scheduledAt: new Date("2026-10-24T13:00:00.000Z"),
          status: "READY_TO_PUBLISH",
          createdById: adminId,
          assignments: { create: { moderatorId: secondModeratorId, assignedById: adminId } },
        },
      }),
      prisma.releaseSchedule.create({
        data: {
          title: "Trường Sơn đã phát",
          productionDeadline: new Date("2026-10-21T09:00:00.000Z"),
          scheduledAt: new Date("2026-10-21T12:00:00.000Z"),
          status: "RELEASED",
          createdById: adminId,
          assignments: { create: { moderatorId: secondModeratorId, assignedById: adminId } },
        },
      }),
    ]);
    scheduleIds.push(...fixtures.map(({ id }) => id));
    const repository = new PrismaReleaseRepository();

    const byTitle = await repository.listSchedules({
      q: "tRƯỜnG sƠn",
      status: "SCHEDULED",
      page: 1,
      limit: 20,
    });
    expect(byTitle.items.map(({ title }) => title)).toEqual(["Biên niên Trường Sơn"]);

    const byModerator = await repository.listSchedules({
      moderatorId: secondModeratorId,
      status: "READY_TO_PUBLISH",
      page: 1,
      limit: 20,
    });
    expect(byModerator.items.map(({ title }) => title)).toEqual(["Dòng chảy biển đảo"]);

    const history = await repository.listSchedules({
      scope: "HISTORY",
      page: 1,
      limit: 20,
    });
    expect(history.items.map(({ title }) => title)).toEqual(["Trường Sơn đã phát"]);

    const reviewQueue = await repository.listSchedules({
      scope: "REVIEW_QUEUE",
      page: 1,
      limit: 20,
    });
    expect(reviewQueue.items.map(({ id }) => id)).toContain(scheduleId);

    expect(await repository.listModeratorWorkload(
      new Date("2026-10-20T13:00:00.000Z"),
      new Date("2026-10-21T13:00:00.000Z"),
    )).toEqual([
      { moderatorId: firstModeratorId, name: "Moderator A", open: 1, nearDeadline: 1 },
      { moderatorId: secondModeratorId, name: "Moderator B", open: 2, nearDeadline: 0 },
    ]);
  });

  it("lists newly created schedules before older schedules", async () => {
    const fixtures = await Promise.all([
      prisma.releaseSchedule.create({
        data: {
          title: `Sort ${suffix} older`,
          productionDeadline: new Date("2026-10-19T10:00:00.000Z"),
          scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
          status: "SCHEDULED",
          createdById: adminId,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      }),
      prisma.releaseSchedule.create({
        data: {
          title: `Sort ${suffix} newer`,
          productionDeadline: new Date("2026-11-19T10:00:00.000Z"),
          scheduledAt: new Date("2026-11-20T13:00:00.000Z"),
          status: "SCHEDULED",
          createdById: adminId,
          createdAt: new Date("2026-02-01T00:00:00.000Z"),
        },
      }),
    ]);
    scheduleIds.push(...fixtures.map(({ id }) => id));
    const repository = new PrismaReleaseRepository();

    const result = await repository.listSchedules({
      q: `Sort ${suffix}`,
      status: "SCHEDULED",
      page: 1,
      limit: 20,
    });

    expect(result.items.map(({ title }) => title)).toEqual([
      `Sort ${suffix} newer`,
      `Sort ${suffix} older`,
    ]);
  });
});
