import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { HistoricalCatalogService } from "../src/modules/catalog/application/historical-catalog.service";
import { HistoricalCitationService } from "../src/modules/catalog/application/historical-citation.service";
import { CatalogReviewService } from "../src/modules/catalog/application/catalog-review.service";
import { PrismaHistoricalCatalogRepository } from "../src/modules/catalog/infrastructure/prisma-historical-catalog.repository";
import { PrismaCatalogRepository } from "../src/modules/catalog/infrastructure/prisma-catalog.repository";
import { CatalogService } from "../src/modules/catalog/application/catalog.service";
import {
  assertTestDatabase,
  createModerator,
  RUN_INTEGRATION,
  removeFixtures,
} from "./support/integration";
const a = { userId: crypto.randomUUID(), role: "moderator" },
  b = { userId: crypto.randomUUID(), role: "moderator" };
const repo = new PrismaHistoricalCatalogRepository(),
  catalog = new HistoricalCatalogService(repo),
  citations = new HistoricalCitationService(repo, catalog),
  review = new CatalogReviewService(repo, catalog, citations),
  sr = new PrismaCatalogRepository(),
  sourceService = new CatalogService(sr, sr, sr);
describe.skipIf(!RUN_INTEGRATION)("catalog review", () => {
  beforeAll(async () => {
    assertTestDatabase();
    await createModerator(a.userId);
    await createModerator(b.userId);
  });
  afterAll(async () => {
    await prisma.historicalCitation.deleteMany({
      where: { createdById: a.userId },
    });
    await prisma.historicalEntityRevision.deleteMany({
      where: { createdById: a.userId },
    });
    await prisma.historicalEntity.deleteMany({
      where: { createdById: a.userId },
    });
    await prisma.historicalPhase.deleteMany({
      where: { createdById: a.userId },
    });
    await prisma.historicalPeriod.deleteMany({
      where: { createdById: a.userId },
    });
    await removeFixtures(a.userId);
    await removeFixtures(b.userId);
  });
  it("keeps independent source verification and event eligibility without review", async () => {
    const time = { kind: "RANGE" as const, start: { year: 1900, precision: "YEAR" as const, approximate: false }, end: { year: 2000, precision: "YEAR" as const, approximate: false }, endState: "KNOWN" as const };
    const period = await catalog.createNode(a, "period", { name: "Nguồn độc lập " + a.userId, time });
    const phase = await catalog.createNode(a, "phase", { name: "Giai đoạn", periodId: period.id, time });
    const event = await catalog.createNode(a, "entity", { name: "Sự kiện không nguồn", entityType: "EVENT", historicalPhaseId: phase.id, summary: "Mô tả", time });
    expect((await review.getEntityReadiness(event.id)).ready).toBe(true);
    const source = await sourceService.createSource(a, { title: "Tài liệu podcast", tier: "TIER_1_CHINH_SU", url: "https://example.org/reference" });
    await expect(review.reviewSource(a, source.id, { baseVersion: 1, expectedStatus: "PENDING", decision: "VERIFY", note: "Tự duyệt" })).rejects.toMatchObject({ code: "SELF_REVIEW_FORBIDDEN" });
    await review.reviewSource(b, source.id, { baseVersion: 1, expectedStatus: "PENDING", decision: "VERIFY", note: "Đã đối chiếu" });
    expect((await repo.getSource(source.id))?.verificationStatus).toBe("VERIFIED");
    await sourceService.updateSource(a, source.id, { title: "Ấn bản mới", baseVersion: 1 });
    expect((await repo.getSource(source.id))?.verificationStatus).toBe("PENDING");
    expect((await review.getEntityReadiness(event.id)).ready).toBe(true);
    await expect(citations.addCitation(a, { kind: "entity", id: event.id }, { sourceId: source.id, locator: "tr. 2", baseVersion: 1 })).rejects.toMatchObject({ status: 422 });
    expect((await catalog.getNode("entity", event.id)).version).toBe(1);
  });
});
