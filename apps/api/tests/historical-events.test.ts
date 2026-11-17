import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { HistoricalCatalogService } from "../src/modules/catalog/application/historical-catalog.service";
import { ContentService } from "../src/modules/content/application/content.service";
import {
  PrismaSeriesRepository,
  PrismaEpisodeRepository,
} from "../src/modules/content/infrastructure/prisma-content.repository";
import { makeSession, removeFixtures } from "./support/integration";
import { PrismaHistoricalCatalogRepository } from "../src/modules/catalog/infrastructure/prisma-historical-catalog.repository";
import {
  assertTestDatabase,
  createAdmin,
  createModerator,
  RUN_INTEGRATION,
} from "./support/integration";
const actor = { userId: crypto.randomUUID(), role: "moderator" };
const adminId = crypto.randomUUID();
const svc = new HistoricalCatalogService(
  new PrismaHistoricalCatalogRepository(),
);
describe.skipIf(!RUN_INTEGRATION)("historical event CRUD", () => {
  beforeAll(async () => {
    assertTestDatabase();
    await createModerator(actor.userId);
    await createAdmin(adminId);
  });
  afterAll(async () => {
    await removeFixtures(actor.userId);
    await removeFixtures(adminId);
    await prisma.historicalEntityRevision.deleteMany({
      where: { createdById: actor.userId },
    });
    await prisma.historicalEntity.deleteMany({
      where: { createdById: actor.userId },
    });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: [actor.userId, adminId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [actor.userId, adminId] } } });
  });
  it("allows figures without a phase and blocks events without a parent", async () => {
    const figure = await svc.createNode(actor, "entity", {
      entityType: "FIGURE",
      name: "Nhân vật riêng",
      summary: "",
      time: { kind: "UNKNOWN", note: "Chưa biết" },
    });
    expect(figure.entityType).toBe("FIGURE");
    await expect(
      svc.createNode(actor, "entity", {
        entityType: "EVENT",
        name: "Sự kiện thiếu cha",
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(
      await prisma.historicalEntityRevision.count({
        where: { entityId: figure.id },
      }),
    ).toBe(1);
  });
  it("admin sets premium labels, moderator cannot, and episode changes are audited", async () => {
    const content = new ContentService(
      new PrismaSeriesRepository(),
      new PrismaEpisodeRepository(),
    );
    const adminSession = makeSession(adminId, "admin");
    const moderatorSession = makeSession(actor.userId, "moderator");
    const created = await content.createSeries(
      adminSession,
      { title: `Premium ${crypto.randomUUID()}`, isPremium: true },
      null,
    );
    expect(
      (await prisma.series.findUnique({
        where: { id: created.id },
        select: { isPremium: true },
      }))?.isPremium,
    ).toBe(true);
    await expect(
      content.createSeries(moderatorSession, { title: `Blocked ${crypto.randomUUID()}`, isPremium: true }, null),
    ).rejects.toMatchObject({ status: 403, code: "PREMIUM_ADMIN_ONLY" });

    // The same value is a no-op, not a forbidden change.
    const free = await content.createSeries(moderatorSession, { title: `Free ${crypto.randomUUID()}` }, null);
    await expect(content.updateSeries(moderatorSession, free.id, { isPremium: false }, null)).resolves.toBeDefined();

    const episode = await content.appendEpisode(adminSession, created.id, { title: "Tập Premium" });
    await content.updateEpisode(adminSession, episode.id, { isPremium: true }, "127.0.0.1");
    const audit = await prisma.auditLog.findFirst({
      where: { action: "episode.premium_changed", resourceId: episode.id },
    });
    expect(audit?.actorId).toBe(adminId);
    expect(audit?.ipAddress).toBe("127.0.0.1");
  });
  it("cannot attach a deleted historical entity as a tag or narrator", async () => {
    const figure = await svc.createNode(actor, "entity", {
      entityType: "FIGURE",
      name: "Nhân vật đã xóa",
    });
    await svc.deleteNode(actor, "entity", figure.id, 1);
    const content = new ContentService(
        new PrismaSeriesRepository(),
        new PrismaEpisodeRepository(),
      ),
      session = makeSession(actor.userId, "moderator");
    const series = await content.createSeries(
        session,
        { title: "Kiểm tra thực thể đã xóa " + actor.userId },
        null,
      ),
      episode = await content.appendEpisode(session, series.id, {
        title: "Tập nháp",
      });
    await expect(
      content.addEntityTag(session, episode.id, figure.id),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      content.putNarration(session, episode.id, "FIRST_PERSON", {
        narratorEntityId: figure.id,
        scriptContent: "Không được gắn người kể đã xóa",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const racing = await svc.createNode(actor, "entity", {
      entityType: "FIGURE",
      name: "Nhân vật cạnh tranh",
    });
    const outcomes = await Promise.allSettled([
      svc.deleteNode(actor, "entity", racing.id, 1),
      content.addEntityTag(session, episode.id, racing.id),
    ]);
    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
});
