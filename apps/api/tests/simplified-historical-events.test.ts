import { expect, it } from "bun:test";
import { HistoricalEntityDetailSchema, type HistoricalTimeDto } from "@repo/shared";
import { HistoricalCatalogService } from "../src/modules/catalog/application/historical-catalog.service";
import { HistoricalCitationService } from "../src/modules/catalog/application/historical-citation.service";
import { CatalogReviewService } from "../src/modules/catalog/application/catalog-review.service";
import { createHistoricalPresenter } from "../src/modules/catalog/application/historical-catalog.mappers";
import { PublicHistoricalService } from "../src/modules/catalog/application/public-historical.service";
import { PrismaHistoricalCatalogRepository } from "../src/modules/catalog/infrastructure/prisma-historical-catalog.repository";
import type { HistoricalNodeKind, HistoricalNodeRecord } from "../src/modules/catalog/domain/historical-catalog.repository";

const ids = {
  period: "11111111-1111-4111-8111-111111111111",
  phase: "22222222-2222-4222-8222-222222222222",
  entity: "33333333-3333-4333-8333-333333333333",
};
class EventRepository extends PrismaHistoricalCatalogRepository {
  inactivePeriod = false;
  override async get(kind: HistoricalNodeKind): Promise<HistoricalNodeRecord> {
    return {
      id: ids[kind], name: kind, slug: kind, summary: "Mô tả",
      time: { kind: "POINT", at: { year: 1945, precision: "YEAR", approximate: false } },
      startYear: 1945, endYear: 1946, version: 1, createdById: "owner",
      updatedAt: new Date(), deletedAt: null, isActive: !(kind === "period" && this.inactivePeriod), sortOrder: 0,
      periodId: kind === "phase" ? ids.period : null,
      historicalPhaseId: kind === "entity" ? ids.phase : null,
      entityType: kind === "entity" ? "EVENT" : null, aliases: [],
    };
  }
  override async counts(): ReturnType<PrismaHistoricalCatalogRepository["counts"]> {
    return new Map([[ids.entity, { childCount: 0, sourceCount: 0, citationCount: 0, podcastCount: 2 }]]);
  }
  override async citations(): ReturnType<PrismaHistoricalCatalogRepository["citations"]> {
    throw new Error("Event sources must not be queried");
  }
  override async listPublicEvents(): ReturnType<PrismaHistoricalCatalogRepository["listPublicEvents"]> {
    return { ids: [ids.entity], total: 1 };
  }
}
function services() {
  const repo = new EventRepository();
  const catalog = new HistoricalCatalogService(repo);
  const citations = new HistoricalCitationService(repo, catalog);
  const review = new CatalogReviewService(repo, catalog, citations);
  return { repo, catalog, citations, review, present: createHistoricalPresenter(catalog, citations, review) };
}
it("presents the saved event and parents without sources, documents or review attributes", async () => {
  const { present } = services();
  const event = HistoricalEntityDetailSchema.parse(await present("entity", ids.entity));
  expect(event.name).toBe("entity");
  expect(event.historicalPhase?.period?.id).toBe(ids.period);
  expect(event.podcastCount).toBe(2);
  for (const field of ["sourceCount", "citationCount", "citations", "reviewStatus", "reviewedVersion", "reviewedAt", "reviewNote", "displayStatus", "readiness"]) {
    expect(Object.hasOwn(event, field)).toBe(false);
  }
});
it("event eligibility does not require sources or an approval", async () => {
  const { review } = services();
  expect(await review.getEntityReadiness(ids.entity)).toEqual({ ready: true, reasons: [] });
});
it("rejects event source writes before changing the saved event", async () => {
  const { citations } = services();
  await expect(citations.addCitation({ userId: "owner", role: "moderator" }, { kind: "entity", id: ids.entity }, {
    sourceId: ids.period, locator: "tr. 1", baseVersion: 1,
  })).rejects.toMatchObject({ status: 422 });
});
it("keeps the existing unknown-time creation input valid", async () => {
  const { HistoricalEntityInputSchema } = await import("@repo/shared");
  const time: HistoricalTimeDto = { kind: "UNKNOWN", note: "Chưa rõ" };
  const input = { entityType: "EVENT", name: "Sự kiện", historicalPhaseId: ids.phase, summary: "", time, aliases: [] };
  expect(HistoricalEntityInputSchema.parse(input)).toMatchObject(input);
});
it("does not expose an event if its period becomes inactive after the listing query", async () => {
  const { repo, present } = services();
  repo.inactivePeriod = true;
  await expect(new PublicHistoricalService(repo, present).getEvent("entity")).rejects.toMatchObject({ status: 404 });
});
