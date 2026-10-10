import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { seedHistoricalPeriods } from "@repo/db/historical-seed";
import { HistoricalYearSchema } from "@repo/shared";
import { resetSystemConfigCache } from "../src/core/config/system-config";
import { cleanupDetachedMedia } from "../src/core/jobs/maintenance-jobs";
import { CatalogService, type CatalogActor } from "../src/modules/catalog/application/catalog.service";
import { PrismaCatalogRepository } from "../src/modules/catalog/infrastructure/prisma-catalog.repository";
import { episodeChecklist, seriesChecklist } from "../src/modules/content/application/content.mappers";
import { ContentService } from "../src/modules/content/application/content.service";
import { PrismaEpisodeRepository, PrismaSeriesRepository } from "../src/modules/content/infrastructure/prisma-content.repository";
import { PrismaListeningRepository } from "../src/modules/listening/infrastructure/prisma-listening.repository";
import type { MediaStorageGateway } from "../src/modules/media";
import { MediaService } from "../src/modules/media/application/media.service";
import { PrismaMediaRepository } from "../src/modules/media/infrastructure/prisma-media.repository";
import { assertTestDatabase, createModerator, makeSession, removeFixtures, RUN_INTEGRATION, uniqueSuffix } from "./support/integration";

const GRACE_HOURS_MS = 48 * 60 * 60 * 1000;
const PDF_MIME = "application/pdf";
const SMALL_PDF_BYTES = 1024;

/** Port fake: records `destroy` calls; the gateway is the Cloudinary boundary, not the logic under test. */
function createStorageSpy() {
  const destroyed: string[] = [];
  const storage: MediaStorageGateway = {
    signUpload: async () => ({ url: "https://upload.invalid", fields: {}, expiresAt: new Date() }),
    fetchResource: async () => null,
    destroy: async (publicId) => { destroyed.push(publicId); return "deleted"; },
    deliveryUrl: (asset) => `https://cdn.invalid/${asset.publicId}`,
  };
  return { storage, destroyed };
}

describe("series checklist (no database)", () => {
  const seriesBase = { topicId: "t", historicalPhaseId: "p", startYear: 40, endYear: 43, episodes: [{ status: "PUBLISHED" }], sources: [{}] };
  const checklist = (override: Record<string, unknown>) =>
    seriesChecklist({ ...seriesBase, ...override } as unknown as Parameters<typeof seriesChecklist>[0]);

  it("is ready only with a phase and at least one source", () => {
    expect(checklist({}).ready).toBe(true);
    expect(checklist({ historicalPhaseId: null }).items.find((item) => item.key === "HISTORICAL_PHASE")?.ok).toBe(false);
    expect(checklist({ sources: [] }).items.find((item) => item.key === "HAS_SOURCE")?.ok).toBe(false);
    expect(checklist({ sources: [] }).ready).toBe(false);
  });

  it("no longer asks episodes for a source", () => {
    const episode = { title: "Tập 1", narrations: [{ narrationType: "THIRD_PERSON", scriptContent: "Lời kể", audioAsset: { status: "READY" } }], entityTags: [], series: { status: "DRAFT" } };
    const result = episodeChecklist(episode as unknown as Parameters<typeof episodeChecklist>[0]);
    expect(result.items.map((item) => item.key)).toEqual(["BASIC_INFO", "THIRD_PERSON_SCRIPT", "THIRD_PERSON_AUDIO"]);
    expect(result.ready).toBe(true);
  });
});

describe.skipIf(!RUN_INTEGRATION)("series sources, publishing and media (database)", () => {
  const runId = uniqueSuffix();
  const userId = `it-${runId}`;
  const session = makeSession(userId, "moderator");
  const actor: CatalogActor = { userId, role: "moderator" };
  const content = new ContentService(new PrismaSeriesRepository(), new PrismaEpisodeRepository());
  const catalogRepository = new PrismaCatalogRepository();
  const catalog = new CatalogService(catalogRepository, catalogRepository, catalogRepository);
  const listening = new PrismaListeningRepository();
  let topicId = "";
  const phaseId: Record<string, string> = {};
  const periodId: Record<string, string> = {};

  const makeSource = async (title: string) =>
    (await prisma.source.create({ data: { tier: "TIER_1_CHINH_SU", title: `${title} ${runId}`, url: "https://example.com/source", createdById: userId } })).id;

  const makeAsset = (kind: "AUDIO" | "IMAGE" | "DOCUMENT", overrides: { detachedAt?: Date | null; createdAt?: Date } = {}) => {
    const id = crypto.randomUUID();
    return prisma.mediaAsset.create({
      data: { id, kind, publicId: `it/${runId}/${id}`, status: "READY", format: kind === "DOCUMENT" ? "pdf" : "mp3", durationMs: kind === "AUDIO" ? 60_000 : null, uploadedById: userId, version: 1n, ...overrides },
    });
  };

  /** Draft series that satisfies every checklist item except the ones a test wants to omit. */
  const makeSeries = async (title: string, options: { phase?: string | null; startYear?: number; endYear?: number } = {}) => {
    const phase = options.phase === undefined ? "bac-thuoc-lan-1" : options.phase;
    const series = await content.createSeries(session, {
      title: `${title} ${runId}`, topicId, historicalPhaseId: phase ? phaseId[phase]! : null,
      startYear: options.startYear ?? 40, endYear: options.endYear ?? 43,
    }, null);
    return series;
  };

  const publishedEpisode = async (seriesId: string) => {
    const workspace = await content.appendEpisode(session, seriesId, { title: `Tập ${runId}` });
    await prisma.episode.update({ where: { id: workspace.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    return workspace.id;
  };

  beforeAll(async () => {
    assertTestDatabase();
    resetSystemConfigCache();
    await createModerator(userId);
    await seedHistoricalPeriods(prisma);
    topicId = (await prisma.topic.create({ data: { name: `it-topic-${runId}`, slug: `it-topic-${runId}` } })).id;
    for (const phase of await prisma.historicalPhase.findMany({ include: { period: true } })) {
      phaseId[phase.slug] = phase.id;
      periodId[phase.period.slug] = phase.periodId;
    }
  });

  afterAll(async () => {
    await removeFixtures(userId);
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.$disconnect();
  });

  describe("publish checklist", () => {
    it("blocks series publishing without a phase or without a source", async () => {
      const noPhase = await makeSeries("No phase", { phase: null });
      await publishedEpisode(noPhase.id);
      await content.addSource(session, noPhase.id, { sourceId: await makeSource("A"), locator: "" });
      await expect(content.publishSeries(session, noPhase.id)).rejects.toMatchObject({ code: "SERIES_NOT_PUBLISHABLE" });

      const noSource = await makeSeries("No source");
      await publishedEpisode(noSource.id);
      await expect(content.publishSeries(session, noSource.id)).rejects.toMatchObject({ code: "SERIES_NOT_PUBLISHABLE" });
      const detail = await content.getSeriesDetailForRead(session, noSource.id);
      expect(seriesChecklist(detail).items.filter((item) => !item.ok).map((item) => item.key)).toEqual(["HAS_SOURCE"]);
    });

    it("publishes once a phase and a source exist", async () => {
      const series = await makeSeries("Ready");
      await publishedEpisode(series.id);
      await content.addSource(session, series.id, { sourceId: await makeSource("B"), locator: "tr. 1" });
      const published = await content.publishSeries(session, series.id);
      expect(published.status).toBe("PUBLISHED");
      expect(published.historicalPhase?.period.name).toBe("Bắc thuộc");
    });

    it("stores series years after 1945 (no content ceiling)", async () => {
      const series = await makeSeries("Modern", { phase: "khang-chien-chong-my", startYear: 1954, endYear: 1975 });
      expect([series.startYear, series.endYear]).toEqual([1954, 1975]);
      expect(HistoricalYearSchema.safeParse(2026).success).toBe(true);
      expect(HistoricalYearSchema.safeParse(0).success).toBe(false);
    });

    it("rejects an unknown phase id", async () => {
      await expect(content.createSeries(session, { title: `Bad phase ${runId}`, historicalPhaseId: crypto.randomUUID() }, null)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    it("publishes an episode with script and audio and no source", async () => {
      const series = await makeSeries("Episode rules");
      const workspace = await content.appendEpisode(session, series.id, { title: `Tập rules ${runId}` });
      await expect(content.publishEpisode(session, workspace.id)).rejects.toMatchObject({ code: "EPISODE_NOT_PUBLISHABLE" });
      await content.putNarration(session, workspace.id, "THIRD_PERSON", { scriptContent: "Năm 40, Hai Bà Trưng dựng cờ khởi nghĩa." });
      await expect(content.publishEpisode(session, workspace.id)).rejects.toMatchObject({ code: "EPISODE_NOT_PUBLISHABLE" });
      const audio = await makeAsset("AUDIO");
      await content.attachAudio(session, workspace.id, "THIRD_PERSON", { assetId: audio.id });
      expect((await content.publishEpisode(session, workspace.id)).status).toBe("PUBLISHED");
    });
  });

  describe("series sources", () => {
    it("blocks deleting the last source of a published series", async () => {
      const series = await makeSeries("Last source");
      await publishedEpisode(series.id);
      const first = await content.addSource(session, series.id, { sourceId: await makeSource("C1"), locator: "" });
      await content.publishSeries(session, series.id);

      await expect(content.deleteSource(session, series.id, first.id)).rejects.toMatchObject({ code: "REQUIRED_FOR_PUBLISHED" });
      expect(await prisma.seriesSource.count({ where: { seriesId: series.id } })).toBe(1);

      const second = await content.addSource(session, series.id, { sourceId: await makeSource("C2"), locator: "" });
      await content.deleteSource(session, series.id, first.id);
      await expect(content.deleteSource(session, series.id, second.id)).rejects.toMatchObject({ code: "REQUIRED_FOR_PUBLISHED" });
    });

    it("lets a draft series drop its last source", async () => {
      const series = await makeSeries("Draft drop");
      const item = await content.addSource(session, series.id, { sourceId: await makeSource("D"), locator: "" });
      await content.deleteSource(session, series.id, item.id);
      expect(await content.listSources(session, series.id)).toHaveLength(0);
    });

    it("attaches one source to two series and rejects a duplicate locator", async () => {
      const sourceId = await makeSource("Shared");
      const one = await makeSeries("Share one");
      const two = await makeSeries("Share two");
      await content.addSource(session, one.id, { sourceId, locator: "tr. 5" });
      await content.addSource(session, two.id, { sourceId, locator: "tr. 5" });
      await expect(content.addSource(session, one.id, { sourceId, locator: "tr. 5" })).rejects.toMatchObject({ code: "SERIES_SOURCE_DUPLICATE" });
      expect(await prisma.seriesSource.count({ where: { sourceId } })).toBe(2);
      expect((await catalog.getSource(sourceId)).usageCount).toBe(2);
    });

    it("requires every source to be reordered exactly once", async () => {
      const series = await makeSeries("Reorder");
      const a = await content.addSource(session, series.id, { sourceId: await makeSource("R1"), locator: "" });
      const b = await content.addSource(session, series.id, { sourceId: await makeSource("R2"), locator: "" });
      await expect(content.reorderSources(session, series.id, [a.id, a.id])).rejects.toMatchObject({ code: "SERIES_SOURCE_ORDER_MISMATCH" });
      const reordered = await content.reorderSources(session, series.id, [b.id, a.id]);
      expect(reordered.map((item) => item.id)).toEqual([b.id, a.id]);
    });
  });

  describe("public series filter by phase and period", () => {
    const published = (title: string, phase: string, startYear: number, endYear: number) =>
      prisma.series.create({ data: { ownerId: userId, title: `${title} ${runId}`, slug: `${title}-${runId}`.toLowerCase().replace(/\s+/g, "-"), historicalPhaseId: phaseId[phase], startYear, endYear, status: "PUBLISHED", publishedAt: new Date() } });
    const ids = (result: { items: { id: string }[] }) => result.items.map((item) => item.id);

    it("filters by phase, keeps a mis-dated 42–43 series in its phase, and expands period to child phases", async () => {
      const misdated = await published("Misdated", "bac-thuoc-lan-1", 42, 43);
      const phaseTwo = await published("Phase two", "bac-thuoc-lan-2", 100, 200);
      const otherPeriod = await published("Other period", "hong-bang-van-lang", -600, -500);

      const byPhase = ids(await listening.listPublicSeries({ page: 1, limit: 50, historicalPhaseId: phaseId["bac-thuoc-lan-1"] }));
      expect(byPhase).toContain(misdated.id);
      expect(byPhase).not.toContain(phaseTwo.id);

      const byPeriod = ids(await listening.listPublicSeries({ page: 1, limit: 50, periodId: periodId["bac-thuoc"] }));
      expect(byPeriod).toContain(misdated.id);
      expect(byPeriod).toContain(phaseTwo.id);
      expect(byPeriod).not.toContain(otherPeriod.id);
    });
  });

  describe("plain-text script", () => {
    it("rejects HTML and over-long scripts and stores plain text verbatim", async () => {
      const series = await makeSeries("Script");
      const workspace = await content.appendEpisode(session, series.id, { title: `Tập script ${runId}` });
      await expect(content.putNarration(session, workspace.id, "THIRD_PERSON", { scriptContent: "<p>Xin chào</p>" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      await expect(content.putNarration(session, workspace.id, "THIRD_PERSON", { scriptContent: "a".repeat(60_001) })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      const saved = await content.putNarration(session, workspace.id, "THIRD_PERSON", { scriptContent: "Nếu a < b và b > c thì sao?\nDòng hai." });
      expect(saved.scriptContent).toBe("Nếu a < b và b > c thì sao?\nDòng hai.");
    });
  });

  describe("PDF sources and media cleanup", () => {
    it("accepts a PDF only as DOCUMENT within the allowlist and size limit", async () => {
      const { storage } = createStorageSpy();
      const media = new MediaService(storage, new PrismaMediaRepository());
      const ticket = await media.create({ kind: "DOCUMENT", sizeBytes: SMALL_PDF_BYTES, mimeType: PDF_MIME }, userId);
      const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: ticket.assetId } });
      expect(asset.kind).toBe("DOCUMENT");
      expect(asset.publicId).toMatch(/\/document\/[0-9a-f-]{36}\.pdf$/);

      await expect(media.create({ kind: "DOCUMENT", sizeBytes: SMALL_PDF_BYTES, mimeType: "image/png" }, userId)).rejects.toMatchObject({ code: "MEDIA_TYPE_NOT_ALLOWED" });
      await expect(media.create({ kind: "AUDIO", sizeBytes: SMALL_PDF_BYTES, mimeType: PDF_MIME }, userId)).rejects.toMatchObject({ code: "MEDIA_TYPE_NOT_ALLOWED" });
      await expect(media.create({ kind: "IMAGE", sizeBytes: SMALL_PDF_BYTES, mimeType: PDF_MIME }, userId)).rejects.toMatchObject({ code: "MEDIA_TYPE_NOT_ALLOWED" });
      await expect(media.create({ kind: "DOCUMENT", sizeBytes: 20 * 1024 * 1024 + 1, mimeType: PDF_MIME }, userId)).rejects.toMatchObject({ code: "MEDIA_TOO_LARGE" });
    });

    it("needs a url or a usable READY PDF, and one PDF belongs to one source", async () => {
      await expect(catalog.createSource(actor, { tier: "TIER_2_KHAO_CO", title: `Bare ${runId}` })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      const image = await makeAsset("IMAGE");
      await expect(catalog.createSource(actor, { tier: "TIER_2_KHAO_CO", title: `Img ${runId}`, fileAssetId: image.id })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

      const pdf = await makeAsset("DOCUMENT");
      const source = await catalog.createSource(actor, { tier: "TIER_2_KHAO_CO", title: `Pdf ${runId}`, fileAssetId: pdf.id });
      expect(source.fileAsset?.id).toBe(pdf.id);
      await expect(catalog.createSource(actor, { tier: "TIER_2_KHAO_CO", title: `Pdf again ${runId}`, fileAssetId: pdf.id })).rejects.toMatchObject({ code: "ASSET_IN_USE" });
      await expect(catalog.updateSource(actor, source.id, { fileAssetId: null })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    it("keeps a PDF attached to a source and deletes detached assets after the grace period", async () => {
      const { storage, destroyed } = createStorageSpy();
      const old = new Date(Date.now() - GRACE_HOURS_MS);

      const attached = await makeAsset("DOCUMENT", { createdAt: old });
      const attachedSource = await catalog.createSource(actor, { tier: "TIER_2_KHAO_CO", title: `Keep ${runId}`, fileAssetId: attached.id });

      const replaced = await makeAsset("DOCUMENT", { createdAt: old });
      const replacement = await makeAsset("DOCUMENT", { createdAt: old });
      const swapped = await catalog.createSource(actor, { tier: "TIER_2_KHAO_CO", title: `Swap ${runId}`, fileAssetId: replaced.id });
      await catalog.updateSource(actor, swapped.id, { fileAssetId: replacement.id });
      const orphan = await makeAsset("DOCUMENT", { createdAt: old, detachedAt: old });
      // Detaching is stamped "now"; age it so the grace window has elapsed.
      await prisma.mediaAsset.update({ where: { id: replaced.id }, data: { detachedAt: old } });

      await cleanupDetachedMedia(storage);

      const status = async (id: string) => (await prisma.mediaAsset.findUniqueOrThrow({ where: { id } })).status;
      expect(await status(attached.id)).toBe("READY");
      expect(await status(replacement.id)).toBe("READY");
      expect(await status(replaced.id)).toBe("DELETED");
      expect(await status(orphan.id)).toBe("DELETED");
      expect(destroyed).toContain(replaced.publicId);
      expect(destroyed).toContain(orphan.publicId);
      expect(destroyed).not.toContain(attached.publicId);
      expect(destroyed).not.toContain(replacement.publicId);
      expect(attachedSource.fileAssetId).toBe(attached.id);
    });
  });
});
