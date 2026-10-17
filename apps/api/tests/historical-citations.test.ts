import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { HistoricalCatalogService } from "../src/modules/catalog/application/historical-catalog.service";
import { HistoricalCitationService } from "../src/modules/catalog/application/historical-citation.service";
import { PrismaHistoricalCatalogRepository } from "../src/modules/catalog/infrastructure/prisma-historical-catalog.repository";
import { PrismaCatalogRepository } from "../src/modules/catalog/infrastructure/prisma-catalog.repository";
import { CatalogService } from "../src/modules/catalog/application/catalog.service";
import {
  assertTestDatabase,
  createModerator,
  RUN_INTEGRATION,
  removeFixtures,
} from "./support/integration";
const actor = { userId: crypto.randomUUID(), role: "moderator" };
const repo = new PrismaHistoricalCatalogRepository();
const catalog = new HistoricalCatalogService(repo);
const cites = new HistoricalCitationService(repo, catalog);
const oldRepo = new PrismaCatalogRepository();
const sources = new CatalogService(oldRepo, oldRepo, oldRepo);
describe.skipIf(!RUN_INTEGRATION)("historical citations", () => {
  beforeAll(async () => {
    assertTestDatabase();
    await createModerator(actor.userId);
  });
  afterAll(async () => {
    await prisma.historicalCitation.deleteMany({
      where: { createdById: actor.userId },
    });
    await prisma.historicalEntityRevision.deleteMany({
      where: { createdById: actor.userId },
    });
    await prisma.historicalEntity.deleteMany({
      where: { createdById: actor.userId },
    });
    await removeFixtures(actor.userId);
  });
  it("pins source revisions, distinguishes locators and invalidates edited content", async () => {
    const figure = await catalog.createNode(actor, "entity", {
      name: "Nhân vật đối chiếu",
      entityType: "FIGURE",
    });
    const source = await sources.createSource(actor, {
      title: "Sách đối chiếu",
      tier: "TIER_1_CHINH_SU",
      url: "https://example.org/book",
    });
    const a = await cites.addCitation(
      actor,
      { kind: "entity", id: figure.id },
      { sourceId: source.id, locator: "tr. 10", baseVersion: 1 },
    );
    expect(a.source.verificationStatus).toBe("PENDING");
    await cites.addCitation(
      actor,
      { kind: "entity", id: figure.id },
      { sourceId: source.id, locator: "tr. 11", baseVersion: 2 },
    );
    await expect(
      cites.addCitation(
        actor,
        { kind: "entity", id: figure.id },
        { sourceId: source.id, locator: "tr. 10", baseVersion: 3 },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await sources.updateSource(actor, source.id, {
      title: "Sách đã đổi",
      baseVersion: 1,
    });
    const rows = await cites.listCitations({ kind: "entity", id: figure.id });
    expect(rows[0]?.source.title).toBe("Sách đối chiếu");
    expect(rows[0]?.outdated).toBe(true);
    expect(
      await prisma.historicalEntityRevision.count({
        where: { entityId: figure.id },
      }),
    ).toBe(3);
  });
});
