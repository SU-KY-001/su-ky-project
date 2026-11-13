import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { HistoricalCatalogService } from "../src/modules/catalog/application/historical-catalog.service";
import { HistoricalCitationService } from "../src/modules/catalog/application/historical-citation.service";
import { CatalogReviewService } from "../src/modules/catalog/application/catalog-review.service";
import { PublicHistoricalService } from "../src/modules/catalog/application/public-historical.service";
import { createHistoricalPresenter } from "../src/modules/catalog/application/historical-catalog.mappers";
import { PrismaHistoricalCatalogRepository } from "../src/modules/catalog/infrastructure/prisma-historical-catalog.repository";
import {
  assertTestDatabase,
  createModerator,
  RUN_INTEGRATION,
  removeFixtures,
} from "./support/integration";
const actor = { userId: crypto.randomUUID(), role: "moderator" };
const repo = new PrismaHistoricalCatalogRepository(),
  catalog = new HistoricalCatalogService(repo),
  citations = new HistoricalCitationService(repo, catalog),
  review = new CatalogReviewService(repo, catalog, citations),
  publicSvc = new PublicHistoricalService(
    repo,
    createHistoricalPresenter(catalog, citations, review),
  );
describe.skipIf(!RUN_INTEGRATION)("public historical events", () => {
  beforeAll(async () => {
    assertTestDatabase();
    await createModerator(actor.userId);
  });
  afterAll(async () => {
    await prisma.historicalEntityRevision.deleteMany({
      where: { createdById: actor.userId },
    });
    await prisma.historicalEntity.deleteMany({
      where: { createdById: actor.userId },
    });
    await removeFixtures(actor.userId);
  });
  it("does not expose a draft via slug or public pagination", async () => {
    const time = {
      kind: "RANGE" as const,
      start: { year: -700, precision: "YEAR" as const, approximate: false },
      end: { year: -179, precision: "YEAR" as const, approximate: false },
      endState: "KNOWN" as const,
    };
    const p = await catalog.createNode(actor, "period", {
        name: "Public draft parent",
        time,
      }),
      ph = await catalog.createNode(actor, "phase", {
        name: "Public draft phase",
        time,
        periodId: p.id,
      });
    const event = await catalog.createNode(actor, "entity", {
      name: "Private draft",
      entityType: "EVENT",
      historicalPhaseId: ph.id,
      time: { kind: "UNKNOWN", note: "Chưa xác định" },
    });
    await expect(publicSvc.getEvent(event.slug)).rejects.toMatchObject({
      status: 404,
    });
    const list = await publicSvc.listEvents({
      page: 1,
      limit: 20,
      q: "Private draft",
    });
    expect(list.total).toBe(0);
    expect(list.items).toHaveLength(0);
  });
});
