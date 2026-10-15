import { describe, expect, it } from "bun:test";
import type { Session } from "../src/modules/auth";
import type {
  EpisodeReviewEntity,
  ReleaseRepository,
  ReleaseScheduleEntity,
} from "../src/modules/releases/domain/release.repository";
import { ReleaseService } from "../src/modules/releases/application/release.service";

const now = new Date("2026-10-20T13:00:00.000Z");

function session(id: string, role: "admin" | "moderator"): Session {
  const stamp = new Date("2026-01-01T00:00:00.000Z");
  return {
    user: {
      id,
      role,
      name: id,
      email: `${id}@example.org`,
      emailVerified: true,
      image: null,
      banned: false,
      banReason: null,
      banExpires: null,
      createdAt: stamp,
      updatedAt: stamp,
    },
    session: {
      id: `session-${id}`,
      userId: id,
      token: `token-${id}`,
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      createdAt: stamp,
      updatedAt: stamp,
    },
  } as Session;
}

function schedule(
  patch: Partial<ReleaseScheduleEntity> = {},
): ReleaseScheduleEntity {
  return {
    id: "schedule-1",
    episodeId: "episode-1",
    title: "Dấu chân Trường Sơn",
    productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
    scheduledAt: now,
    status: "READY_TO_PUBLISH",
    version: 1,
    createdById: "admin-1",
    publishedAt: null,
    cancelledAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    assignments: [
      {
        scheduleId: "schedule-1",
        moderatorId: "mod-author",
        assignedById: "admin-1",
        assignedAt: new Date("2026-10-01T00:00:00.000Z"),
        removedAt: null,
        moderator: {
          id: "mod-author",
          name: "Author",
          email: "author@example.org",
        },
      },
    ],
    reviews: [],
    episode: {
      id: "episode-1",
      title: "Episode",
      status: "DRAFT",
      contentRevision: 3,
      updatedAt: new Date("2026-10-20T12:00:00.000Z"),
    },
    ...patch,
  };
}

function approvedReview(revision = 3): EpisodeReviewEntity {
  return {
    id: "review-1",
    scheduleId: "schedule-1",
    episodeId: "episode-1",
    revision,
    status: "APPROVED",
    submittedById: "mod-author",
    submittedAt: new Date("2026-10-20T10:00:00.000Z"),
    reviewedById: "mod-reviewer",
    reviewedAt: new Date("2026-10-20T11:00:00.000Z"),
    reviewNote: null,
  };
}

class FakeReleaseRepository {
  current = schedule();
  latestReview: EpisodeReviewEntity | null = approvedReview();
  assigned = true;
  claimed = false;
  statusTransitions: Array<{
    to: string;
    action: string;
    actorType: "ADMIN" | "MODERATOR" | "SYSTEM";
  }> = [];
  audits: string[] = [];
  createdReviews: EpisodeReviewEntity[] = [];
  decisions: Array<{ status: string; reviewer: string }> = [];
  workloadArgs: Array<{ now: Date; nearDeadlineBefore: Date }> = [];

  async createSchedule(input: Parameters<ReleaseRepository["createSchedule"]>[0]) {
    this.current = schedule({
      title: input.title,
      episodeId: input.episodeId,
      productionDeadline: input.productionDeadline,
      scheduledAt: input.scheduledAt,
      createdById: input.createdById,
      status: "SCHEDULED",
    });
    return this.current;
  }
  async findSchedule() { return this.current; }
  async isModeratorAssigned(_scheduleId: string, moderatorId: string) {
    return this.assigned && moderatorId === "mod-author";
  }
  async createReview(input: Parameters<ReleaseRepository["createReview"]>[0]) {
    const review: EpisodeReviewEntity = {
      id: "review-created",
      scheduleId: input.scheduleId,
      episodeId: input.episodeId,
      revision: input.revision,
      status: "IN_REVIEW",
      submittedById: input.submittedById,
      submittedAt: now,
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
    };
    this.createdReviews.push(review);
    this.latestReview = review;
    return review;
  }
  async findLatestReview() { return this.latestReview; }
  async decideReview(input: Parameters<ReleaseRepository["decideReview"]>[0]) {
    this.decisions.push({ status: input.status, reviewer: input.reviewedById });
    this.latestReview = { ...this.latestReview!, status: input.status };
    return this.latestReview;
  }
  async setStatus(input: Parameters<ReleaseRepository["setStatus"]>[0]) {
    if (!input.from.includes(this.current.status)) return false;
    this.current = {
      ...this.current,
      status: input.to,
      failureCode:
        input.failureCode === undefined ? this.current.failureCode : input.failureCode,
      failureMessage:
        input.failureMessage === undefined
          ? this.current.failureMessage
          : input.failureMessage,
    };
    this.statusTransitions.push({
      to: input.to,
      action: input.action,
      actorType: input.actorType,
    });
    return true;
  }
  async claimForPublishing(_id: string, version: number) {
    if (this.claimed || version !== this.current.version) return false;
    this.claimed = true;
    this.current = { ...this.current, status: "PUBLISHING" };
    return true;
  }
  async appendAudit(input: Parameters<ReleaseRepository["appendAudit"]>[0]) {
    this.audits.push(input.action);
  }
  async listModeratorWorkload(nowAt: Date, nearDeadlineBefore: Date) {
    this.workloadArgs.push({ now: nowAt, nearDeadlineBefore });
    return [{ moderatorId: "mod-author", name: "Author", open: 2, nearDeadline: 1 }];
  }
}

function service(
  repository = new FakeReleaseRepository(),
  checklistReady = true,
) {
  let publishCount = 0;
  const releaseService = new ReleaseService(
    repository as unknown as ReleaseRepository,
    {
      checklistReady: async () => checklistReady,
      publishEpisode: async () => { publishCount += 1; },
    },
    () => now,
  );
  return { releaseService, repository, publishCount: () => publishCount };
}

describe("release service", () => {
  it("allows only Admin to create a release schedule", async () => {
    const { releaseService } = service();
    await expect(releaseService.createSchedule(session("mod", "moderator"), {
      title: "Lịch tháng 10",
      episodeId: null,
      productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
      scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
      moderatorIds: ["mod-author"],
    }, "correlation-1")).rejects.toMatchObject({ status: 403 });
  });

  it("returns Admin workload for the next 24 hours", async () => {
    const { releaseService, repository } = service();

    expect(await releaseService.workload(session("admin-1", "admin"))).toEqual([
      { moderatorId: "mod-author", name: "Author", open: 2, nearDeadline: 1 },
    ]);
    expect(repository.workloadArgs).toEqual([{
      now,
      nearDeadlineBefore: new Date("2026-10-21T13:00:00.000Z"),
    }]);
    await expect(
      releaseService.workload(session("mod-author", "moderator")),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("accepts review submission only from an assigned moderator at the current revision", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({ status: "SCHEDULED" });
    const review = await releaseService.submitReview(
      session("mod-author", "moderator"),
      "schedule-1",
      3,
      "correlation-2",
    );
    expect(review.status).toBe("IN_REVIEW");

    repository.assigned = false;
    await expect(releaseService.submitReview(
      session("mod-outsider", "moderator"),
      "schedule-1",
      3,
      "correlation-3",
    )).rejects.toMatchObject({ status: 403 });
  });

  it("prevents an assigned producer from reviewing their own schedule", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({ status: "SCHEDULED" });
    repository.latestReview = { ...approvedReview(), status: "IN_REVIEW" };
    await expect(releaseService.reviewEpisode(
      session("mod-author", "moderator"),
      "schedule-1",
      { decision: "APPROVE", contentRevision: 3, reviewNote: null },
      "correlation-4",
    )).rejects.toMatchObject({ status: 403 });
  });

  it("marks an approved publishable revision ready", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({ status: "SCHEDULED" });
    repository.latestReview = { ...approvedReview(), status: "IN_REVIEW" };
    await releaseService.reviewEpisode(
      session("mod-reviewer", "moderator"),
      "schedule-1",
      { decision: "APPROVE", contentRevision: 3, reviewNote: null },
      "correlation-5",
    );
    expect(repository.statusTransitions.at(-1)).toEqual({
      to: "READY_TO_PUBLISH",
      action: "release.auto_ready",
      actorType: "SYSTEM",
    });
  });

  it("moves an approved current revision from scheduled to ready and audits the Admin command", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({ status: "SCHEDULED" });

    const result = await releaseService.checkReadiness(
      session("admin-1", "admin"),
      "schedule-1",
      "correlation-ready",
    );

    expect(result.status).toBe("READY_TO_PUBLISH");
    expect(repository.statusTransitions.at(-1)).toEqual({
      to: "READY_TO_PUBLISH",
      actorType: "ADMIN",
      action: "release.manual_ready",
    });
  });

  it("rejects readiness when the approval revision is stale", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({ status: "SCHEDULED" });
    repository.latestReview = approvedReview(2);

    await expect(releaseService.checkReadiness(
      session("admin-1", "admin"),
      "schedule-1",
      "correlation-stale",
    )).rejects.toMatchObject({ status: 409, code: "CONTENT_NOT_READY" });
    expect(repository.statusTransitions).toHaveLength(0);
  });

  it("rejects readiness when the publication checklist is incomplete", async () => {
    const repository = new FakeReleaseRepository();
    repository.current = schedule({ status: "SCHEDULED" });
    const { releaseService } = service(repository, false);

    await expect(releaseService.checkReadiness(
      session("admin-1", "admin"),
      "schedule-1",
      "correlation-checklist",
    )).rejects.toMatchObject({ status: 409, code: "CONTENT_NOT_READY" });
    expect(repository.statusTransitions).toHaveLength(0);
  });

  it("rejects readiness when the schedule is no longer scheduled", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({ status: "READY_TO_PUBLISH" });

    await expect(releaseService.checkReadiness(
      session("admin-1", "admin"),
      "schedule-1",
      "correlation-state",
    )).rejects.toMatchObject({
      status: 409,
      code: "INVALID_STATE_TRANSITION",
    });
    expect(repository.statusTransitions).toHaveLength(0);
  });

  it("re-evaluates a blocked schedule after Admin fixes its release conditions", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({
      status: "BLOCKED",
      failureCode: "CHECKLIST_INCOMPLETE",
      failureMessage: "CHECKLIST_INCOMPLETE",
    });

    const result = await releaseService.checkReadiness(
      session("admin-1", "admin"),
      "schedule-1",
      "correlation-unblock",
    );

    expect(result.status).toBe("READY_TO_PUBLISH");
    expect(result.failureCode).toBeNull();
    expect(repository.statusTransitions.at(-1)).toEqual({
      to: "READY_TO_PUBLISH",
      actorType: "ADMIN",
      action: "release.manual_ready",
    });
  });

  it("blocks a due schedule when approval belongs to an older revision", async () => {
    const { releaseService, repository, publishCount } = service();
    repository.latestReview = approvedReview(2);
    const result = await releaseService.publishDueSchedule(
      "schedule-1",
      1,
      "correlation-6",
      "job-1",
    );
    expect(result).toBe("BLOCKED");
    expect(repository.statusTransitions.at(-1)?.to).toBe("BLOCKED");
    expect(publishCount()).toBe(0);
  });

  it("publishes at most once when two workers race for one schedule", async () => {
    const { releaseService, repository, publishCount } = service();
    const results = await Promise.all([
      releaseService.publishDueSchedule("schedule-1", 1, "correlation-7", "job-a"),
      releaseService.publishDueSchedule("schedule-1", 1, "correlation-8", "job-b"),
    ]);
    expect(results.sort()).toEqual(["IGNORED", "RELEASED"]);
    expect(publishCount()).toBe(1);
    expect(repository.statusTransitions.at(-1)?.to).toBe("RELEASED");
  });
});
