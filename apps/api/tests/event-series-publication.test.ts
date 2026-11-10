import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { HistoricalCatalogService } from "../src/modules/catalog/application/historical-catalog.service";
import { PrismaHistoricalCatalogRepository, jsonSnapshot } from "../src/modules/catalog/infrastructure/prisma-historical-catalog.repository";
import { publishWithHistoricalEvidence } from "../src/modules/content/infrastructure/historical-evidence";
import { assertTestDatabase, createModerator, removeFixtures, RUN_INTEGRATION } from "./support/integration";

describe.skipIf(!RUN_INTEGRATION)("series publication without event evidence", () => {
  const actor = { userId: crypto.randomUUID(), role: "moderator" };
  let topicId: string;
  let seriesId: string;
  beforeAll(async () => {
    assertTestDatabase();
    await createModerator(actor.userId);
    const catalog = new HistoricalCatalogService(new PrismaHistoricalCatalogRepository());
    const time = { kind: "RANGE" as const, start: { year: 1900, precision: "YEAR" as const, approximate: false }, end: { year: 2000, precision: "YEAR" as const, approximate: false }, endState: "KNOWN" as const };
    const period = await catalog.createNode(actor, "period", { name: actor.userId, time });
    const phase = await catalog.createNode(actor, "phase", { name: "Giai đoạn", periodId: period.id, time });
    const event = await catalog.createNode(actor, "entity", { name: "Sự kiện đã lưu", entityType: "EVENT", historicalPhaseId: phase.id, summary: "Mô tả sự kiện", time });
    const revision = await prisma.historicalEntityRevision.findUniqueOrThrow({ where: { entityId_version: { entityId: event.id, version: event.version } } });
    topicId = (await prisma.topic.create({ data: { name: actor.userId, slug: actor.userId } })).id;
    const series = await prisma.series.create({ data: {
      ownerId: actor.userId, title: "Series kiểm thử", slug: actor.userId,
      description: "Series liên kết sự kiện không nguồn và không kiểm duyệt", topicId,
      historicalPhaseId: phase.id, primaryHistoricalEventId: event.id, historicalEntityRevisionId: revision.id,
      startYear: 1900, endYear: 2001,
    } });
    seriesId = series.id;
    await prisma.episode.create({ data: { seriesId, title: "Tập đã phát hành", slug: actor.userId, status: "PUBLISHED", publishedAt: new Date(), sortOrder: 1 } });
  });
  afterAll(async () => {
    await removeFixtures(actor.userId);
    if (topicId) await prisma.topic.deleteMany({ where: { id: topicId } });
  });
  it("publishes a complete series whose saved event has no sources or approval", async () => {
    const series = await prisma.series.findUniqueOrThrow({ where: { id: seriesId } });
    await publishWithHistoricalEvidence(actor.userId, seriesId, series.updatedAt, "series");
    expect((await prisma.series.findUniqueOrThrow({ where: { id: seriesId } })).status).toBe("PUBLISHED");
  });
  it("still refuses unverified independent podcast sources", async () => {
    const source = await prisma.source.create({ data: { title: "Nguồn riêng podcast", tier: "TIER_3_KHOA_HOC", url: "https://example.com/podcast", createdById: actor.userId } });
    const revision = await prisma.sourceRevision.create({ data: { sourceId: source.id, version: source.version, snapshot: jsonSnapshot(source), createdById: actor.userId } });
    await prisma.seriesSource.create({ data: { seriesId, sourceId: source.id, sourceRevisionId: revision.id, locator: "tr. 10", sortOrder: 1 } });
    const series = await prisma.series.findUniqueOrThrow({ where: { id: seriesId } });
    await expect(publishWithHistoricalEvidence(actor.userId, seriesId, series.updatedAt, "series")).rejects.toMatchObject({ code: "CONTENT_NOT_READY" });
    await prisma.source.update({ where: { id: source.id }, data: { verificationStatus: "VERIFIED", verifiedVersion: source.version, verifiedAt: new Date() } });
    await publishWithHistoricalEvidence(actor.userId, seriesId, series.updatedAt, "series");
    expect((await prisma.series.findUniqueOrThrow({ where: { id: seriesId } })).status).toBe("PUBLISHED");
  });
});
