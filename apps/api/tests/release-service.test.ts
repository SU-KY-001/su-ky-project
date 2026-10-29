import { describe, expect, it } from "bun:test";
import { PublicationAssessmentSchema, type ReviewContent, type ReviewReadinessSnapshot } from "@repo/shared";
import type { Session } from "../src/modules/auth";
import type {
  EpisodeReviewEntity,
  ReleaseReassignmentTicketEntity,
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
    readinessSnapshot: null,
  };
}

const assessment = PublicationAssessmentSchema.parse({
  editorialNote: "Đã đối chiếu các nguồn chung của series.",
  rightsNote: "Ảnh và âm thanh thuộc quyền của nhóm sản xuất.",
  audioNote: "Đã nghe toàn bộ bản âm thanh, không lỗi.",
});

interface ContentFacts {
  /** Episode content revision the fake publisher reports. */
  revision?: number;
  aiVoice?: boolean;
  warning?: boolean;
}

function reviewContentFor(ready: boolean, { revision = 3, aiVoice = false, warning = false }: ContentFacts): ReviewContent {
  return {
    episode: {
      narrations: [{ audio: { assetId: "asset-1" }, audioAnalysis: aiVoice ? { origin: { kind: "AI_VOICE" } } : null }],
    },
    readiness: {
      ready,
      contentRevision: revision,
      computedAt: now,
      items: warning ? [{ key: "SCRIPT_TOO_SHORT", level: "WARNING", state: "WARN" }] : [],
    },
    aiSummary: null,
  } as unknown as ReviewContent;
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
  decisions: Array<{ status: string; reviewer: string; actorType: string }> = [];
  snapshots: Array<{ expectedRevision: number; readinessSnapshot: ReviewReadinessSnapshot }> = [];
  workloadArgs: Array<{ now: Date; nearDeadlineBefore: Date }> = [];
  ticket: ReleaseReassignmentTicketEntity | null = null;

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
      readinessSnapshot: null,
    };
    this.createdReviews.push(review);
    this.latestReview = review;
    return review;
  }
  async findLatestReview() { return this.latestReview; }
  async decideReview(input: Parameters<ReleaseRepository["decideReview"]>[0]) {
    this.decisions.push({ status: input.status, reviewer: input.reviewedById, actorType: input.actorType });
    this.snapshots.push({ expectedRevision: input.expectedRevision, readinessSnapshot: input.readinessSnapshot });
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
  async createReassignmentTicket(input: Parameters<ReleaseRepository["createReassignmentTicket"]>[0]) {
    if (this.ticket?.status === "PENDING") return null;
    this.ticket = {
      id: "ticket-1",
      scheduleId: input.scheduleId,
      requestedById: input.requestedById,
      reason: input.reason,
      status: "PENDING",
      replacementModeratorId: null,
      resolvedById: null,
      decisionReason: null,
      resolvedAt: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
      requestedBy: { id: "mod-author", name: "Author", email: "author@example.org" },
      replacementModerator: null,
      schedule: this.current,
    };
    return this.ticket;
  }
  async findReassignmentTicket() { return this.ticket; }
  async rejectReassignmentTicket(input: Parameters<ReleaseRepository["rejectReassignmentTicket"]>[0]) {
    if (!this.ticket || this.ticket.status !== "PENDING") return null;
    this.ticket = {
      ...this.ticket,
      status: "REJECTED",
      decisionReason: input.reason,
      resolvedById: input.resolvedById,
      resolvedAt: now,
    };
    return this.ticket;
  }
  async approveReassignmentTicket(input: Parameters<ReleaseRepository["approveReassignmentTicket"]>[0]) {
    if (!this.ticket || this.ticket.status !== "PENDING") return null;
    this.current = {
      ...this.current,
      assignments: [{
        ...this.current.assignments[0]!,
        moderatorId: input.replacementModeratorId,
        moderator: {
          id: input.replacementModeratorId,
          name: "Replacement",
          email: "replacement@example.org",
        },
      }],
    };
    this.ticket = {
      ...this.ticket,
      status: "APPROVED",
      replacementModeratorId: input.replacementModeratorId,
      replacementModerator: this.current.assignments[0]!.moderator,
      resolvedById: input.resolvedById,
      resolvedAt: now,
      schedule: this.current,
    };
    return this.ticket;
  }
}

function service(
  repository = new FakeReleaseRepository(),
  checklistReady = true,
  facts: ContentFacts = {},
) {
  let publishCount = 0;
  const releaseService = new ReleaseService(
    repository as unknown as ReleaseRepository,
    {
      checklistReady: async () => checklistReady,
      reviewContent: async () => reviewContentFor(checklistReady, facts),
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
      moderatorId: "mod-author",
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

  it("rejects review submission when required episode checklist items are incomplete", async () => {
    const { releaseService, repository } = service(undefined, false);
    repository.current = schedule({ status: "SCHEDULED" });

    await expect(
      releaseService.submitReview(
        session("mod-author", "moderator"),
        "schedule-1",
        3,
        "correlation-checklist-submit",
      ),
    ).rejects.toMatchObject({ status: 422, code: "CHECKLIST_INCOMPLETE" });
  });

  it("rejects approval when required episode checklist items are incomplete", async () => {
    const { releaseService, repository } = service(undefined, false);
    repository.current = schedule({ status: "SCHEDULED" });
    repository.latestReview = { ...approvedReview(), status: "IN_REVIEW" };

    await expect(
      releaseService.reviewEpisode(
        session("mod-reviewer", "moderator"),
        "schedule-1",
        { decision: "APPROVE", contentRevision: 3, reviewNote: null, assessment },
        "correlation-checklist-approve",
      ),
    ).rejects.toMatchObject({ status: 422, code: "CHECKLIST_INCOMPLETE" });
  });

  it("prevents an assigned producer from reviewing their own schedule", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({ status: "SCHEDULED" });
    repository.latestReview = { ...approvedReview(), status: "IN_REVIEW" };
    await expect(releaseService.reviewEpisode(
      session("mod-author", "moderator"),
      "schedule-1",
      { decision: "APPROVE", contentRevision: 3, reviewNote: null, assessment },
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
      { decision: "APPROVE", contentRevision: 3, reviewNote: null, assessment },
      "correlation-5",
    );
    expect(repository.statusTransitions.at(-1)).toEqual({
      to: "READY_TO_PUBLISH",
      action: "release.auto_ready",
      actorType: "SYSTEM",
    });
  });

  it("lets Admin review the submitted revision and records the reviewer role", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({ status: "SCHEDULED" });
    repository.latestReview = { ...approvedReview(), status: "IN_REVIEW" };
    await releaseService.reviewEpisode(session("admin-1", "admin"), "schedule-1", {
      decision: "APPROVE", contentRevision: 3, assessment,
    }, "admin-review");
    expect(repository.decisions).toEqual([{ status: "APPROVED", reviewer: "admin-1", actorType: "ADMIN" }]);
    expect(repository.current.status).toBe("READY_TO_PUBLISH");
  });

  it("rejects an Admin decision for content changed after submission", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({ status: "SCHEDULED" });
    repository.latestReview = { ...approvedReview(2), status: "IN_REVIEW" };
    await expect(releaseService.reviewEpisode(session("admin-1", "admin"), "schedule-1", {
      decision: "APPROVE", contentRevision: 2, assessment,
    }, "stale-admin-review")).rejects.toMatchObject({ status: 409, code: "STALE_WRITE" });
    expect(repository.decisions).toHaveLength(0);
  });

  it("stores the assessment and readiness snapshot with an approval for the reviewed revision", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({ status: "SCHEDULED" });
    repository.latestReview = { ...approvedReview(), status: "IN_REVIEW" };
    await releaseService.reviewEpisode(session("admin-1", "admin"), "schedule-1", {
      decision: "APPROVE", contentRevision: 3, assessment,
    }, "snapshot");
    expect(repository.snapshots).toHaveLength(1);
    expect(repository.snapshots[0]).toMatchObject({ expectedRevision: 3, readinessSnapshot: { assessment, readiness: { contentRevision: 3 } } });
  });

  it("records a changes request with readiness but no assessment", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({ status: "SCHEDULED" });
    repository.latestReview = { ...approvedReview(), status: "IN_REVIEW" };
    await releaseService.reviewEpisode(session("admin-1", "admin"), "schedule-1", {
      decision: "REQUEST_CHANGES", contentRevision: 3, reviewNote: "Cần sửa phần mở đầu",
    }, "changes");
    expect(repository.snapshots[0]?.readinessSnapshot.assessment).toBeNull();
    expect(repository.snapshots[0]?.readinessSnapshot.readiness.contentRevision).toBe(3);
  });

  it("requires an AI disclosure when the audio is an AI voice", async () => {
    const { releaseService, repository } = service(undefined, true, { aiVoice: true });
    repository.current = schedule({ status: "SCHEDULED" });
    repository.latestReview = { ...approvedReview(), status: "IN_REVIEW" };
    const approve = (disclosure: string | null) => releaseService.reviewEpisode(session("admin-1", "admin"), "schedule-1", {
      decision: "APPROVE", contentRevision: 3, assessment: { ...assessment, aiDisclosure: disclosure },
    }, "ai-disclosure");
    await expect(approve(null)).rejects.toMatchObject({ status: 422, code: "AI_DISCLOSURE_REQUIRED" });
    expect(repository.decisions).toHaveLength(0);
    await approve("Giọng đọc được tạo bằng AI.");
    expect(repository.decisions).toHaveLength(1);
  });

  it("requires a written reason when warnings remain", async () => {
    const { releaseService, repository } = service(undefined, true, { warning: true });
    repository.current = schedule({ status: "SCHEDULED" });
    repository.latestReview = { ...approvedReview(), status: "IN_REVIEW" };
    await expect(releaseService.reviewEpisode(session("admin-1", "admin"), "schedule-1", {
      decision: "APPROVE", contentRevision: 3, assessment,
    }, "warning")).rejects.toMatchObject({ status: 422, code: "WARNING_ACCEPTANCE_REQUIRED" });
    await releaseService.reviewEpisode(session("admin-1", "admin"), "schedule-1", {
      decision: "APPROVE", contentRevision: 3, assessment: { ...assessment, warningAcceptance: "Bản ngắn có chủ đích." },
    }, "warning-ok");
    expect(repository.decisions).toHaveLength(1);
  });

  it("rejects an approval whose rights have expired", async () => {
    const { releaseService, repository } = service();
    repository.current = schedule({ status: "SCHEDULED" });
    repository.latestReview = { ...approvedReview(), status: "IN_REVIEW" };
    await expect(releaseService.reviewEpisode(session("admin-1", "admin"), "schedule-1", {
      decision: "APPROVE", contentRevision: 3, assessment: { ...assessment, rightsExpiresAt: "2026-10-19" },
    }, "expired")).rejects.toMatchObject({ status: 422, code: "RIGHTS_EXPIRED" });
    await releaseService.reviewEpisode(session("admin-1", "admin"), "schedule-1", {
      decision: "APPROVE", contentRevision: 3, assessment: { ...assessment, rightsExpiresAt: "2026-10-20" },
    }, "valid-through-today");
    expect(repository.decisions).toHaveLength(1);
  });

  it("rejects submission and approval when the readiness revision moved past the one submitted", async () => {
    const { releaseService, repository } = service(undefined, true, { revision: 4 });
    repository.current = schedule({ status: "SCHEDULED" });
    await expect(releaseService.submitReview(session("mod-author", "moderator"), "schedule-1", 3, "stale-submit"))
      .rejects.toMatchObject({ status: 409, code: "STALE_WRITE" });
    repository.latestReview = { ...approvedReview(), status: "IN_REVIEW" };
    await expect(releaseService.reviewEpisode(session("admin-1", "admin"), "schedule-1", {
      decision: "APPROVE", contentRevision: 3, assessment,
    }, "stale-approve")).rejects.toMatchObject({ status: 409, code: "STALE_WRITE" });
    expect(repository.decisions).toHaveLength(0);
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
    )).rejects.toMatchObject({ status: 422, code: "CONTENT_NOT_READY" });
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
    )).rejects.toMatchObject({ status: 422, code: "CONTENT_NOT_READY" });
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

  it("lets only the active assignee create a pending reassignment ticket", async () => {
    const { releaseService, repository } = service();
    const created = await releaseService.createReassignmentTicket(
      session("mod-author", "moderator"),
      "schedule-1",
      "Tôi có lịch công tác đột xuất và không thể hoàn thành đúng hạn.",
      "ticket-create",
    );
    expect(created.status).toBe("PENDING");

    repository.assigned = false;
    await expect(releaseService.createReassignmentTicket(
      session("mod-outsider", "moderator"),
      "schedule-1",
      "Tôi không được phân công nhưng đang thử gửi ticket.",
      "ticket-forbidden",
    )).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("keeps the current assignment when Admin rejects a ticket with a reason", async () => {
    const { releaseService, repository } = service();
    const ticket = await releaseService.createReassignmentTicket(
      session("mod-author", "moderator"),
      "schedule-1",
      "Tôi có lịch công tác đột xuất và không thể hoàn thành đúng hạn.",
      "ticket-create",
    );

    const rejected = await releaseService.rejectReassignmentTicket(
      session("admin-1", "admin"),
      ticket.id,
      "Chưa có nhân sự phù hợp để thay thế.",
      "ticket-reject",
    );

    expect(rejected.status).toBe("REJECTED");
    expect(repository.current.assignments[0]?.moderatorId).toBe("mod-author");
  });

  it("changes the active assignment only when Admin approves with another Moderator", async () => {
    const { releaseService, repository } = service();
    const ticket = await releaseService.createReassignmentTicket(
      session("mod-author", "moderator"),
      "schedule-1",
      "Tôi có lịch công tác đột xuất và không thể hoàn thành đúng hạn.",
      "ticket-create",
    );

    await expect(releaseService.approveReassignmentTicket(
      session("admin-1", "admin"),
      ticket.id,
      "mod-author",
      "ticket-invalid-replacement",
    )).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });

    const approved = await releaseService.approveReassignmentTicket(
      session("admin-1", "admin"),
      ticket.id,
      "mod-replacement",
      "ticket-approve",
    );
    expect(approved.status).toBe("APPROVED");
    expect(repository.current.assignments[0]?.moderatorId).toBe("mod-replacement");
  });
});
