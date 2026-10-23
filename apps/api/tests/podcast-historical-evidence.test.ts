import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { CreateSeriesSchema, CreateSeriesSourceSchema } from "@repo/shared";
import { ContentService } from "../src/modules/content/application/content.service";
import {
  PrismaEpisodeRepository,
  PrismaSeriesRepository,
} from "../src/modules/content/infrastructure/prisma-content.repository";
import { HistoricalCatalogService } from "../src/modules/catalog/application/historical-catalog.service";
import { HistoricalCitationService } from "../src/modules/catalog/application/historical-citation.service";
import { CatalogReviewService } from "../src/modules/catalog/application/catalog-review.service";
import { PrismaHistoricalCatalogRepository } from "../src/modules/catalog/infrastructure/prisma-historical-catalog.repository";
import { CatalogService } from "../src/modules/catalog/application/catalog.service";
import { PrismaCatalogRepository } from "../src/modules/catalog/infrastructure/prisma-catalog.repository";
import {
  RUN_INTEGRATION,
  assertTestDatabase,
  createAdmin,
  createModerator,
  makeSession,
  removeFixtures,
  validAssessment,
} from "./support/integration";
import { ListeningService } from "../src/modules/listening/application/listening.service";
import { PrismaListeningRepository } from "../src/modules/listening/infrastructure/prisma-listening.repository";
import { PublicHistoricalService } from "../src/modules/catalog/application/public-historical.service";
import { createHistoricalPresenter } from "../src/modules/catalog/application/historical-catalog.mappers";
describe.skipIf(!RUN_INTEGRATION)("podcast historical evidence", () => {
  const a = { userId: crypto.randomUUID(), role: "moderator" },
    b = { userId: crypto.randomUUID(), role: "moderator" },
    adminId = crypto.randomUUID(),
    session = makeSession(a.userId, "moderator");
  let topicId = "";
  const repo = new PrismaHistoricalCatalogRepository(),
    cat = new HistoricalCatalogService(repo),
    cit = new HistoricalCitationService(repo, cat),
    review = new CatalogReviewService(repo, cat, cit),
    sr = new PrismaCatalogRepository(),
    sourceService = new CatalogService(sr, sr, sr),
    content = new ContentService(
      new PrismaSeriesRepository(),
      new PrismaEpisodeRepository(),
    );
  const adminSession = makeSession(adminId, "admin");
  /** Admin direct-publish input for the episode's current timestamp; the reason is intentionally explicit. */
  const exception = () => ({
    baseUpdatedAt: new Date(),
    exceptionReason: "Phát hành ngoại lệ để kiểm thử bằng chứng nguồn.",
    // The short test script raises a SCRIPT_TOO_SHORT warning, so a written acceptance is required.
    assessment: validAssessment({ warningAcceptance: "Bản kể thử nghiệm ngắn có chủ đích." }),
  });
  const publish = async (episodeId: string) =>
    content.publishEpisode(adminSession, episodeId, {
      ...exception(),
      baseUpdatedAt: (await prisma.episode.findUniqueOrThrow({ where: { id: episodeId } })).updatedAt,
    });
  beforeAll(async () => {
    assertTestDatabase();
    await createModerator(a.userId);
    await createModerator(b.userId);
    await createAdmin(adminId);
    topicId = (
      await prisma.topic.create({
        data: { slug: crypto.randomUUID(), name: "Evidence test " + a.userId },
      })
    ).id;
  });
  afterAll(async () => {
    await removeFixtures(a.userId);
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
    await removeFixtures(b.userId);
    await removeFixtures(adminId);
    if (topicId) await prisma.topic.deleteMany({ where: { id: topicId } });
  });
  it("inherits primary event, selects citations explicitly, rejects draft publication and preserves publication evidence", async () => {
    const time = {
      kind: "RANGE" as const,
      start: { year: -700, precision: "YEAR" as const, approximate: false },
      end: { year: -179, precision: "YEAR" as const, approximate: false },
      endState: "KNOWN" as const,
    };
    const p = await cat.createNode(a, "period", {
        name: "Podcast " + a.userId,
        time,
      }),
      ph = await cat.createNode(a, "phase", {
        name: "Giai đoạn",
        periodId: p.id,
        time,
      }),
      event = await cat.createNode(a, "entity", {
        name: "Sự kiện",
        summary: "Nội dung có tư liệu",
        time,
        entityType: "EVENT",
        historicalPhaseId: ph.id,
      });
    const source = await sourceService.createSource(a, {
      title: "Ấn bản đầu",
      tier: "TIER_3_KHOA_HOC",
      url: "https://example.org/original",
    });
    const citation = await cit.addCitation(
      a,
      { kind: "entity", id: event.id },
      { baseVersion: 1, sourceId: source.id, locator: "tr. 20" },
    );
    const cover = await prisma.mediaAsset.create({
      data: {
        kind: "IMAGE",
        publicId: crypto.randomUUID(),
        status: "READY",
        widthPx: 600,
        heightPx: 800,
        uploadedById: a.userId,
      },
    });
    const input = CreateSeriesSchema.parse({
      title: "Series " + a.userId,
      description: "Mô tả series dùng cho kiểm thử phát hành.",
      coverImageAssetId: cover.id,
      primaryHistoricalEventId: event.id,
      topicId,
    });
    const series = await content.createSeries(session, input, null);
    expect(
      (await prisma.series.findUniqueOrThrow({ where: { id: series.id } }))
        .primaryHistoricalEventId,
    ).toBe(event.id);
    expect(series.historicalPhaseId).toBe(ph.id);
    expect(series.sources).toHaveLength(0);
    const episode = await content.appendEpisode(session, series.id, {
      title: "Tập đầu",
    });
    expect(
      episode.entityTags.some(
        (t) => t.entityId === event.id && t.status === "CONFIRMED",
      ),
    ).toBe(true);
    await content.putNarration(session, episode.id, "THIRD_PERSON", {
      scriptContent: "Kịch bản có nguồn",
    });
    const audio = await prisma.mediaAsset.create({
      data: {
        kind: "AUDIO",
        publicId: crypto.randomUUID(),
        status: "READY",
        durationMs: 10000,
        uploadedById: a.userId,
      },
    });
    await content.attachAudio(session, episode.id, "THIRD_PERSON", {
      assetId: audio.id,
    });
    await expect(publish(episode.id)).rejects.toMatchObject({
      code: "CONTENT_NOT_READY",
    });
    // A failing evidence check must not leave any partial publication behind.
    const untouched = await prisma.episode.findUniqueOrThrow({ where: { id: episode.id } });
    expect(untouched.status).toBe("DRAFT");
    expect(untouched.publicationApproval).toBeNull();
    expect(
      await prisma.auditLog.count({ where: { resourceId: episode.id, action: { startsWith: "episode.published" } } }),
    ).toBe(0);
    expect(
      CreateSeriesSourceSchema.safeParse({
        historicalCitationId: citation.id,
        sourceId: crypto.randomUUID(),
        locator: "giả",
      }).success,
    ).toBe(false);
    await content.addSource(
      session,
      series.id,
      CreateSeriesSourceSchema.parse({ historicalCitationId: citation.id }),
    );
    await review.reviewSource(b, source.id, {
      baseVersion: 1,
      expectedStatus: "PENDING",
      decision: "VERIFY",
      note: "Đối chiếu ấn bản",
    });
    await review.submitEntityReview(a, event.id, {
      baseVersion: 2,
      expectedStatus: "DRAFT",
    });
    await review.reviewEntity(b, event.id, {
      baseVersion: 2,
      expectedStatus: "IN_REVIEW",
      decision: "APPROVE",
      note: "Đúng trích dẫn",
    });
    await publish(episode.id);
    const published = await prisma.episode.findUniqueOrThrow({ where: { id: episode.id } });
    expect(published.publicationApproval).toMatchObject({
      contentRevision: published.contentRevision,
      approvedById: adminId,
      exceptionReason: exception().exceptionReason,
    });
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: "episode.published_exception", resourceId: episode.id },
    });
    expect(audit.actorId).toBe(adminId);
    expect(audit.changes).toMatchObject({
      exceptionReason: exception().exceptionReason,
      contentRevision: published.contentRevision,
      assessment: { editorialNote: validAssessment().editorialNote },
    });
    const snapshot = (
      await prisma.series.findUniqueOrThrow({ where: { id: series.id } })
    ).publicationEvidence;
    expect(JSON.stringify(snapshot)).toContain("Ấn bản đầu");
    expect(JSON.stringify(snapshot)).toContain("tr. 20");
    await expect(
      content.publishEpisode(adminSession, episode.id, { ...exception(), baseUpdatedAt: episode.updatedAt }),
    ).rejects.toMatchObject({ code: "STALE_WRITE" });
    await content.publishSeries(session, series.id);
    const seriesSnapshot = (
      await prisma.series.findUniqueOrThrow({ where: { id: series.id } })
    ).publicationEvidence;
    const extra = await content.addSource(session, series.id, {
      sourceId: source.id,
      locator: "tr. 30",
    });
    await expect(
      publish(episode.id),
    ).rejects.toMatchObject({ code: "CONTENT_NOT_READY" });
    expect(
      (await prisma.series.findUniqueOrThrow({ where: { id: series.id } }))
        .publicationEvidence,
    ).toEqual(seriesSnapshot);
    await content.deleteSource(session, series.id, extra.id);
    await publish(episode.id);
    expect(
      (await prisma.series.findUniqueOrThrow({ where: { id: series.id } }))
        .publicationEvidence,
    ).toEqual(seriesSnapshot);
    const listening = new ListeningService(new PrismaListeningRepository(), {
      deliveryUrl: (asset) => `https://cdn.invalid/${asset.publicId}`,
      signUpload: async () => ({
        url: "https://upload.invalid",
        fields: {},
        expiresAt: new Date(),
      }),
      fetchResource: async () => null,
      destroy: async () => "deleted",
    });
    const publicBefore = await listening.getSeriesDetail(series.slug, null);
    expect(publicBefore.evidenceAsOf).not.toBeNull();
    expect(publicBefore.sources[0]?.title).toBe("Ấn bản đầu");
    const publicEpisode = await listening.getEpisodeDetail(episode.slug, null);
    expect(publicEpisode.publicationInfo).toEqual({ aiDisclosure: null, credits: null });
    for (const privateField of ["editorialNote", "rightsNote", "audioNote", "warningAcceptance", "approvedById", "exceptionReason"])
      expect(JSON.stringify(publicEpisode)).not.toContain(privateField);
    const publicHistory = new PublicHistoricalService(
      repo,
      createHistoricalPresenter(cat, cit, review),
    );
    const publicEvent = await publicHistory.getEvent(event.slug);
    expect(publicEvent.citations[0]?.locator).toBe("tr. 20");
    expect(JSON.stringify(publicEvent)).not.toContain("createdById");
    expect(JSON.stringify(publicEvent)).not.toContain("reviewNote");
    expect(JSON.stringify(publicEvent)).not.toContain("verificationNote");
    await cat.patchNode(a, "phase", ph.id, { baseVersion: 1, isActive: false });
    await expect(publicHistory.getEvent(event.slug)).rejects.toMatchObject({
      status: 404,
    });
    await cat.patchNode(a, "phase", ph.id, { baseVersion: 2, isActive: true });
    let unlock!: () => void, signal!: () => void;
    const gate = new Promise<void>((r) => {
        unlock = r;
      }),
      locked = new Promise<void>((r) => {
        signal = r;
      });
    const editing = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM sources WHERE id=${source.id}::uuid FOR UPDATE`;
      await tx.source.update({
        where: { id: source.id },
        data: {
          verificationStatus: "REJECTED",
          verifiedVersion: null,
          verificationNote: "Rút xác minh trong cạnh tranh phát hành",
        },
      });
      signal();
      await gate;
    });
    await locked;
    const racingPublish = publish(episode.id);
    unlock();
    await editing;
    await expect(racingPublish).rejects.toMatchObject({
      code: "CONTENT_NOT_READY",
    });
    expect(
      (await listening.getSeriesDetail(series.slug, null)).evidenceWarning,
    ).toBe("SOURCE_VERIFICATION_WITHDRAWN");
    await sourceService.updateSource(a, source.id, {
      baseVersion: 1,
      title: "Ấn bản sau",
    });
    expect(
      (await prisma.series.findUniqueOrThrow({ where: { id: series.id } }))
        .publicationEvidence,
    ).toEqual(seriesSnapshot);
    const publicAfter = await listening.getSeriesDetail(series.slug, null);
    expect(publicAfter.sources[0]?.title).toBe("Ấn bản đầu");
    expect(publicAfter.evidenceWarning).toBe("SOURCE_VERIFICATION_WITHDRAWN");
    await expect(
      publish(episode.id),
    ).rejects.toMatchObject({ code: "CONTENT_NOT_READY" });
  });
  it("keeps pinned legacy source metadata and PDF without inventing verification", async () => {
    const oldPdf = await prisma.mediaAsset.create({
      data: {
        kind: "DOCUMENT",
        publicId: crypto.randomUUID(),
        status: "READY",
        format: "pdf",
        version: 1n,
        uploadedById: a.userId,
      },
    });
    const newPdf = await prisma.mediaAsset.create({
      data: {
        kind: "DOCUMENT",
        publicId: crypto.randomUUID(),
        status: "READY",
        format: "pdf",
        version: 1n,
        uploadedById: a.userId,
      },
    });
    const source = await sourceService.createSource(a, {
      title: "Tư liệu legacy ban đầu",
      tier: "TIER_1_CHINH_SU",
      fileAssetId: oldPdf.id,
    });
    const series = await prisma.series.create({
      data: {
        ownerId: a.userId,
        title: "Legacy " + crypto.randomUUID(),
        slug: crypto.randomUUID(),
        status: "PUBLISHED",
        publicationEvidence: { legacy: true, verified: false, sources: [] },
      },
    });
    await content.addSource(session, series.id, {
      sourceId: source.id,
      locator: "tr. 1",
    });
    await sourceService.updateSource(a, source.id, {
      baseVersion: 1,
      title: "Tư liệu legacy đã đổi",
      fileAssetId: newPdf.id,
    });
    const publicSeries =
      await new PrismaListeningRepository().findPublicSeriesBySlug(series.slug);
    expect(publicSeries?.sources[0]?.source.title).toBe(
      "Tư liệu legacy ban đầu",
    );
    expect(publicSeries?.sources[0]?.source.fileAsset?.publicId).toBe(
      oldPdf.publicId,
    );
  });
});
