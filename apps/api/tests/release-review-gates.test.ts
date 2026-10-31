import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import type { PublicationAssessment, ReviewReadinessSnapshot } from "@repo/shared";
import { PrismaEpisodeRepository } from "../src/modules/content/infrastructure/prisma-content.repository";
import { PrismaReleaseRepository } from "../src/modules/releases/infrastructure/prisma-release.repository";
import { RUN_INTEGRATION, assertTestDatabase, validAssessment } from "./support/integration";

/**
 * Database-backed gate tests (opt-in via RUN_INTEGRATION=1 against a database whose name contains "test").
 * Publish checks that fail before the evidence step are exercised through the repository so no catalog fixtures are needed.
 */
const suite = RUN_INTEGRATION ? describe : describe.skip;
const suffix = crypto.randomUUID().slice(0, 8);
const adminId = `gate-admin-${suffix}`;
const authorId = `gate-author-${suffix}`;
const reviewerAId = `gate-rev-a-${suffix}`;
const reviewerBId = `gate-rev-b-${suffix}`;
const userIds = [adminId, authorId, reviewerAId, reviewerBId];
const REVISION = 3;
const seriesIds: string[] = [];
const scheduleIds: string[] = [];
const assetIds: string[] = [];

const releases = new PrismaReleaseRepository();
const episodes = new PrismaEpisodeRepository();

const snapshot = (revision: number, assessment: PublicationAssessment | null): ReviewReadinessSnapshot => ({
  readiness: { ready: true, contentRevision: revision, computedAt: new Date(), items: [] },
  assessment,
});

async function createEpisode(revision = REVISION) {
  const series = await prisma.series.create({
    data: { ownerId: authorId, title: `Gate series ${suffix}`, slug: `gate-series-${crypto.randomUUID()}` },
  });
  seriesIds.push(series.id);
  return prisma.episode.create({
    data: { seriesId: series.id, title: "Tập kiểm thử", slug: `gate-episode-${crypto.randomUUID()}`, sortOrder: 1, contentRevision: revision },
  });
}

async function submitted(revision = REVISION) {
  const episode = await createEpisode(revision);
  const schedule = await releases.createSchedule({
    title: "Lịch kiểm thử cổng duyệt",
    episodeId: episode.id,
    productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
    scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
    createdById: adminId,
    moderatorId: authorId,
    correlationId: `schedule-${suffix}`,
  });
  scheduleIds.push(schedule.id);
  const review = await releases.createReview({
    scheduleId: schedule.id,
    episodeId: episode.id,
    revision,
    submittedById: authorId,
    correlationId: `submit-${suffix}`,
  });
  return { episode, schedule, review };
}

const decision = (
  reviewId: string,
  status: "APPROVED" | "CHANGES_REQUESTED",
  reviewerId: string,
  assessment: PublicationAssessment | null,
  expectedRevision = REVISION,
) =>
  releases.decideReview({
    reviewId,
    status,
    reviewedById: reviewerId,
    actorType: "MODERATOR",
    reviewNote: status === "CHANGES_REQUESTED" ? "Cần sửa phần mở đầu" : null,
    correlationId: `decide-${suffix}`,
    expectedRevision,
    readinessSnapshot: snapshot(expectedRevision, assessment),
  });

/** Episode with a third-person script and READY audio, so a publish attempt reaches the approval gate. */
async function publishable(audioAnalysis?: Record<string, unknown>) {
  const episode = await createEpisode();
  const audio = await prisma.mediaAsset.create({
    data: { kind: "AUDIO", publicId: `gate/${crypto.randomUUID()}`, status: "READY", durationMs: 60_000, uploadedById: authorId },
  });
  assetIds.push(audio.id);
  await prisma.episodeNarration.create({
    data: {
      episodeId: episode.id,
      narrationType: "THIRD_PERSON",
      scriptContent: "Kịch bản kiểm thử cổng phát hành.",
      audioAssetId: audio.id,
      audioAnalysis: audioAnalysis as never,
    },
  });
  return episode;
}

const setApproval = (episodeId: string, contentRevision: number, assessment: PublicationAssessment) =>
  prisma.episode.update({
    where: { id: episodeId },
    data: {
      publicationApproval: {
        contentRevision,
        assessment,
        approvedById: reviewerAId,
        approvedAt: new Date().toISOString(),
        exceptionReason: null,
      } as never,
    },
  });

const approvalGate = { mode: "APPROVAL" as const, hasWarnings: false };
const freshUpdatedAt = async (episodeId: string) =>
  (await prisma.episode.findUniqueOrThrow({ where: { id: episodeId } })).updatedAt;

suite("review and publication gates", () => {
  beforeAll(async () => {
    assertTestDatabase();
    await prisma.user.createMany({
      data: [
        { id: adminId, name: "Gate Admin", email: `${adminId}@example.org`, role: "admin" },
        { id: authorId, name: "Gate Author", email: `${authorId}@example.org`, role: "moderator" },
        { id: reviewerAId, name: "Reviewer A", email: `${reviewerAId}@example.org`, role: "moderator" },
        { id: reviewerBId, name: "Reviewer B", email: `${reviewerBId}@example.org`, role: "moderator" },
      ],
    });
  });

  afterAll(async () => {
    if (!RUN_INTEGRATION) return;
    await prisma.releaseSchedule.deleteMany({ where: { id: { in: scheduleIds } } });
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: scheduleIds } } });
    const episodeIds = (await prisma.episode.findMany({ where: { seriesId: { in: seriesIds } }, select: { id: true } })).map((row) => row.id);
    await prisma.auditLog.deleteMany({
      where: { OR: [{ resourceId: { in: [...scheduleIds, ...episodeIds] } }, { actorId: { in: userIds } }] },
    });
    await prisma.episodeNarration.deleteMany({ where: { episodeId: { in: episodeIds } } });
    await prisma.episode.deleteMany({ where: { id: { in: episodeIds } } });
    await prisma.series.deleteMany({ where: { id: { in: seriesIds } } });
    await prisma.mediaAsset.deleteMany({ where: { id: { in: assetIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  describe("review submission and decision", () => {
    it("lets only one of two simultaneous reviewers decide", async () => {
      const { episode, review } = await submitted();
      const assessment = validAssessment();
      const outcomes = await Promise.allSettled([
        decision(review.id, "APPROVED", reviewerAId, assessment),
        decision(review.id, "CHANGES_REQUESTED", reviewerBId, null),
      ]);
      const winners = outcomes.filter((item) => item.status === "fulfilled");
      const losers = outcomes.filter((item): item is PromiseRejectedResult => item.status === "rejected");
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
      expect(losers[0]?.reason).toMatchObject({ status: 409, code: "INVALID_REVIEW_STATE" });

      const stored = await prisma.episodeReview.findUniqueOrThrow({ where: { id: review.id } });
      const approvedWon = stored.status === "APPROVED";
      expect(stored.reviewedById).toBe(approvedWon ? reviewerAId : reviewerBId);
      const after = await prisma.episode.findUniqueOrThrow({ where: { id: episode.id } });
      // The losing decision must leave no trace: an approval exists only if the approval won.
      expect(after.publicationApproval !== null).toBe(approvedWon);
    });

    it("rejects a submission for a revision that is no longer current", async () => {
      const next = await createEpisode(REVISION);
      await prisma.episode.update({ where: { id: next.id }, data: { contentRevision: REVISION + 1 } });
      const otherSchedule = await releases.createSchedule({
        title: "Lịch stale",
        episodeId: next.id,
        productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
        scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
        createdById: adminId,
        moderatorId: authorId,
        correlationId: `stale-schedule-${suffix}`,
      });
      scheduleIds.push(otherSchedule.id);
      await expect(
        releases.createReview({
          scheduleId: otherSchedule.id,
          episodeId: next.id,
          revision: REVISION,
          submittedById: authorId,
          correlationId: `stale-${suffix}`,
        }),
      ).rejects.toMatchObject({ status: 409, code: "STALE_WRITE" });
      expect(await prisma.episodeReview.count({ where: { episodeId: next.id } })).toBe(0);
    });

    it("stores an approval for exactly the reviewed revision without touching the edit timestamp", async () => {
      const { episode, review } = await submitted();
      const before = await prisma.episode.findUniqueOrThrow({ where: { id: episode.id } });
      const assessment = validAssessment({ credits: "Biên tập: Nhóm Sử Ký", aiDisclosure: "Giọng đọc do AI tạo." });
      await decision(review.id, "APPROVED", reviewerAId, assessment);

      const after = await prisma.episode.findUniqueOrThrow({ where: { id: episode.id } });
      expect(after.publicationApproval).toMatchObject({
        contentRevision: before.contentRevision,
        approvedById: reviewerAId,
        exceptionReason: null,
        assessment: { editorialNote: assessment.editorialNote, credits: "Biên tập: Nhóm Sử Ký" },
      });
      expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
      const stored = await prisma.episodeReview.findUniqueOrThrow({ where: { id: review.id } });
      expect(stored.readinessSnapshot).toMatchObject({ assessment: { audioNote: assessment.audioNote }, readiness: { contentRevision: before.contentRevision } });
    });

    it("rejects a decision after the content moved on and leaves the review open", async () => {
      const { episode, review } = await submitted();
      await prisma.episode.update({ where: { id: episode.id }, data: { contentRevision: { increment: 1 } } });
      await expect(decision(review.id, "APPROVED", reviewerAId, validAssessment())).rejects.toMatchObject({ status: 409, code: "STALE_WRITE" });
      expect((await prisma.episodeReview.findUniqueOrThrow({ where: { id: review.id } })).status).toBe("IN_REVIEW");
      expect((await prisma.episode.findUniqueOrThrow({ where: { id: episode.id } })).publicationApproval).toBeNull();
    });

    it("rolls back an approval that carries no assessment", async () => {
      const { episode, review } = await submitted();
      await expect(decision(review.id, "APPROVED", reviewerAId, null)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      expect((await prisma.episodeReview.findUniqueOrThrow({ where: { id: review.id } })).status).toBe("IN_REVIEW");
      expect((await prisma.episode.findUniqueOrThrow({ where: { id: episode.id } })).publicationApproval).toBeNull();
    });

    it("records a changes request with its snapshot and no approval", async () => {
      const { episode, review } = await submitted();
      await decision(review.id, "CHANGES_REQUESTED", reviewerAId, null);
      const stored = await prisma.episodeReview.findUniqueOrThrow({ where: { id: review.id } });
      expect(stored.reviewNote).toBe("Cần sửa phần mở đầu");
      expect(stored.readinessSnapshot).toMatchObject({ assessment: null });
      expect((await prisma.episode.findUniqueOrThrow({ where: { id: episode.id } })).publicationApproval).toBeNull();
    });
  });

  describe("final publish gate", () => {
    it("refuses to publish without an approval or with one for an older revision", async () => {
      const episode = await publishable();
      await expect(
        episodes.publishEpisodeWithEvidence(null, episode.id, await freshUpdatedAt(episode.id), approvalGate),
      ).rejects.toMatchObject({ status: 409, code: "APPROVAL_REQUIRED" });

      await setApproval(episode.id, REVISION - 1, validAssessment());
      await expect(
        episodes.publishEpisodeWithEvidence(null, episode.id, await freshUpdatedAt(episode.id), approvalGate),
      ).rejects.toMatchObject({ code: "APPROVAL_REQUIRED" });
      expect((await prisma.episode.findUniqueOrThrow({ where: { id: episode.id } })).status).toBe("DRAFT");
    });

    it("invalidates an approval when the content revision changes", async () => {
      const episode = await publishable();
      await setApproval(episode.id, REVISION, validAssessment());
      await prisma.episode.update({ where: { id: episode.id }, data: { contentRevision: { increment: 1 } } });
      await expect(
        episodes.publishEpisodeWithEvidence(null, episode.id, await freshUpdatedAt(episode.id), approvalGate),
      ).rejects.toMatchObject({ code: "APPROVAL_REQUIRED" });
    });

    it("refuses to publish once the approved rights have expired", async () => {
      const episode = await publishable();
      await setApproval(episode.id, REVISION, validAssessment({ rightsExpiresAt: "2020-01-01" }));
      await expect(
        episodes.publishEpisodeWithEvidence(null, episode.id, await freshUpdatedAt(episode.id), approvalGate),
      ).rejects.toMatchObject({ status: 422, code: "RIGHTS_EXPIRED" });
    });

    it("requires an AI disclosure for AI voice audio at publish", async () => {
      const episode = await publishable({ origin: { kind: "AI_VOICE", voice: "Kore", model: "tts", style: "calm", chars: 10 } });
      await setApproval(episode.id, REVISION, validAssessment());
      await expect(
        episodes.publishEpisodeWithEvidence(null, episode.id, await freshUpdatedAt(episode.id), approvalGate),
      ).rejects.toMatchObject({ status: 422, code: "AI_DISCLOSURE_REQUIRED" });
    });

    it("requires warning acceptance when warnings were present", async () => {
      const episode = await publishable();
      await setApproval(episode.id, REVISION, validAssessment());
      await expect(
        episodes.publishEpisodeWithEvidence(null, episode.id, await freshUpdatedAt(episode.id), { mode: "APPROVAL", hasWarnings: true }),
      ).rejects.toMatchObject({ status: 422, code: "WARNING_ACCEPTANCE_REQUIRED" });
    });

    it("rejects an Admin exception from a non-admin actor even with a valid reason", async () => {
      const episode = await publishable();
      await expect(
        episodes.publishEpisodeWithEvidence(authorId, episode.id, await freshUpdatedAt(episode.id), {
          mode: "ADMIN_EXCEPTION",
          hasWarnings: false,
          exceptionReason: "Phát hành khẩn theo yêu cầu ban biên tập.",
          assessment: validAssessment(),
        }),
      ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
      expect(await prisma.auditLog.count({ where: { resourceId: episode.id, action: "episode.published_exception" } })).toBe(0);
    });

    it("re-validates the exception reason inside the transaction", async () => {
      const episode = await publishable();
      await expect(
        episodes.publishEpisodeWithEvidence(adminId, episode.id, await freshUpdatedAt(episode.id), {
          mode: "ADMIN_EXCEPTION",
          hasWarnings: false,
          exceptionReason: "quá ngắn",
          assessment: validAssessment(),
        }),
      ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
    });

    it("keeps the timestamp lock for an Admin exception and writes nothing when it is stale", async () => {
      const episode = await publishable();
      await expect(
        episodes.publishEpisodeWithEvidence(adminId, episode.id, new Date(0), {
          mode: "ADMIN_EXCEPTION",
          hasWarnings: false,
          exceptionReason: "Phát hành khẩn theo yêu cầu ban biên tập.",
          assessment: validAssessment(),
        }),
      ).rejects.toMatchObject({ code: "STALE_WRITE" });
      const stored = await prisma.episode.findUniqueOrThrow({ where: { id: episode.id } });
      expect(stored.status).toBe("DRAFT");
      expect(stored.publicationApproval).toBeNull();
    });
  });
});
