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
  it("requires independent review and invalidates stale source evidence", async () => {
    const time = {
      kind: "RANGE" as const,
      start: { year: 1900, precision: "YEAR" as const, approximate: false },
      end: { year: 2000, precision: "YEAR" as const, approximate: false },
      endState: "KNOWN" as const,
    };
    const period = await catalog.createNode(a, "period", {
      name: "Duyệt riêng " + a.userId,
      time,
    });
    const phase = await catalog.createNode(a, "phase", {
      name: "Giai đoạn duyệt",
      periodId: period.id,
      time,
    });
    const entity = await catalog.createNode(a, "entity", {
      name: "Sự kiện đối chiếu",
      entityType: "EVENT",
      historicalPhaseId: phase.id,
      summary: "Mô tả có căn cứ",
      time: {
        kind: "POINT",
        at: {
          year: 1945,
          precision: "DAY",
          month: 9,
          day: 2,
          approximate: false,
        },
      },
    });
    const source = await sourceService.createSource(a, {
      title: "Tài liệu",
      tier: "TIER_1_CHINH_SU",
      url: "https://example.org/reference",
    });
    await expect(
      review.reviewSource(a, source.id, {
        baseVersion: 1,
        expectedStatus: "PENDING",
        decision: "VERIFY",
        note: "Đối chiếu",
      }),
    ).rejects.toMatchObject({ code: "SELF_REVIEW_FORBIDDEN" });
    await review.reviewSource(b, source.id, {
      baseVersion: 1,
      expectedStatus: "PENDING",
      decision: "VERIFY",
      note: "Đã đối chiếu ấn bản",
    });
    await citations.addCitation(
      a,
      { kind: "entity", id: entity.id },
      { sourceId: source.id, locator: "tr. 2", baseVersion: 1 },
    );
    await review.submitEntityReview(a, entity.id, {
      baseVersion: 2,
      expectedStatus: "DRAFT",
    });
    await expect(
      review.reviewEntity(a, entity.id, {
        baseVersion: 2,
        expectedStatus: "IN_REVIEW",
        decision: "APPROVE",
        note: "Tự duyệt",
      }),
    ).rejects.toMatchObject({ code: "SELF_REVIEW_FORBIDDEN" });
    const results = await Promise.allSettled([
      review.reviewEntity(b, entity.id, {
        baseVersion: 2,
        expectedStatus: "IN_REVIEW",
        decision: "APPROVE",
        note: "Đúng trích dẫn",
      }),
      review.reviewEntity(b, entity.id, {
        baseVersion: 2,
        expectedStatus: "IN_REVIEW",
        decision: "APPROVE",
        note: "Request cạnh tranh",
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await review.getEntityReadiness(entity.id)).ready).toBe(true);
    await sourceService.updateSource(a, source.id, {
      title: "Ấn bản mới",
      baseVersion: 1,
    });
    expect((await review.getEntityReadiness(entity.id)).reasons).toContain(
      "SOURCE_OUTDATED",
    );
    expect((await review.getEntityReadiness(entity.id)).ready).toBe(false);
    await review.reviewSource(b, source.id, {
      baseVersion: 2,
      expectedStatus: "PENDING",
      decision: "VERIFY",
      note: "Đã đối chiếu ấn bản mới",
    });
    const approximate = await catalog.createNode(a, "entity", {
      name: "Mốc ước lượng",
      entityType: "EVENT",
      historicalPhaseId: phase.id,
      summary: "Có căn cứ tư liệu",
      time: {
        kind: "POINT",
        at: { year: 1945, precision: "YEAR", approximate: true },
      },
    });
    await citations.addCitation(
      a,
      { kind: "entity", id: approximate.id },
      { baseVersion: 1, sourceId: source.id, locator: "tr. 3" },
    );
    expect((await review.getEntityReadiness(approximate.id)).reasons).toContain(
      "MISSING_TIME_NOTE",
    );
    await expect(
      review.submitEntityReview(a, approximate.id, {
        baseVersion: 2,
        expectedStatus: "DRAFT",
      }),
    ).rejects.toMatchObject({ code: "CONTENT_NOT_READY" });
    await catalog.patchNode(a, "entity", approximate.id, {
      baseVersion: 2,
      time: {
        kind: "POINT",
        at: { year: 1945, precision: "YEAR", approximate: true },
        note: "Tài liệu chỉ xác định khoảng năm",
      },
    });
    await review.submitEntityReview(a, approximate.id, {
      baseVersion: 3,
      expectedStatus: "DRAFT",
    });
    await review.reviewEntity(b, approximate.id, {
      baseVersion: 3,
      expectedStatus: "IN_REVIEW",
      decision: "APPROVE",
      note: "Mốc ước lượng phù hợp nguồn",
    });
    expect((await review.getEntityReadiness(approximate.id)).ready).toBe(true);
  });
});
