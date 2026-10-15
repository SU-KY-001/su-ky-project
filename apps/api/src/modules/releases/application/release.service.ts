import type {
  CreateReleaseScheduleInput,
  ReviewEpisodeInput,
  UpdateReleaseScheduleInput,
} from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import type { Session } from "../../auth";
import { evaluateReleaseReadiness } from "../domain/release-policy";
import type {
  EpisodeReviewEntity,
  ReleaseRepository,
  ReleaseScheduleEntity,
} from "../domain/release.repository";

export interface ReleasePublisher {
  checklistReady(episodeId: string): Promise<boolean>;
  publishEpisode(episodeId: string, baseUpdatedAt: Date): Promise<void>;
}

export type PublishReleaseResult =
  | "WAITING"
  | "BLOCKED"
  | "IGNORED"
  | "RELEASED"
  | "RETRY"
  | "FAILED";

function assertAdmin(session: Session): void {
  if (session.user.role !== "admin")
    throw new DomainError(403, "FORBIDDEN", "Chỉ Admin được điều phối lịch phát hành");
}

function assertModerator(session: Session): void {
  if (session.user.role !== "moderator")
    throw new DomainError(403, "FORBIDDEN", "Thao tác này dành cho Moderator");
}

function requireSchedule(
  schedule: ReleaseScheduleEntity | null,
): ReleaseScheduleEntity {
  if (!schedule)
    throw new DomainError(404, "NOT_FOUND", "Không tìm thấy lịch phát hành");
  return schedule;
}

/**
 * Application-level orchestration. Queue jobs and HTTP routes both call this
 * service, so permission/state rules have one implementation.
 */
export class ReleaseService {
  constructor(
    private readonly repository: ReleaseRepository,
    private readonly publisher: ReleasePublisher,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async createSchedule(
    session: Session,
    input: CreateReleaseScheduleInput,
    correlationId: string,
  ) {
    assertAdmin(session);
    return this.repository.createSchedule({
      ...input,
      episodeId: input.episodeId ?? null,
      createdById: session.user.id,
      correlationId,
    });
  }

  async updateSchedule(
    session: Session,
    scheduleId: string,
    input: UpdateReleaseScheduleInput,
    correlationId: string,
  ) {
    assertAdmin(session);
    const { baseUpdatedAt, ...patch } = input;
    const updated = await this.repository.updateSchedule(scheduleId, {
      ...patch,
      expectedUpdatedAt: baseUpdatedAt,
      actorId: session.user.id,
      correlationId,
    });
    if (!updated)
      throw new DomainError(
        409,
        "STALE_WRITE",
        "Lịch đã thay đổi; tải lại trước khi cập nhật",
      );
    return updated;
  }

  async replaceAssignees(
    session: Session,
    scheduleId: string,
    moderatorIds: string[],
    correlationId: string,
  ): Promise<void> {
    assertAdmin(session);
    requireSchedule(await this.repository.findSchedule(scheduleId));
    await this.repository.replaceAssignees(
      scheduleId,
      moderatorIds,
      session.user.id,
      correlationId,
    );
  }

  async submitReview(
    session: Session,
    scheduleId: string,
    contentRevision: number,
    correlationId: string,
  ): Promise<EpisodeReviewEntity> {
    assertModerator(session);
    const schedule = requireSchedule(await this.repository.findSchedule(scheduleId));
    if (!(await this.repository.isModeratorAssigned(scheduleId, session.user.id)))
      throw new DomainError(
        403,
        "FORBIDDEN",
        "Bạn không được phân công vào lịch phát hành này",
      );
    if (!schedule.episodeId || !schedule.episode)
      throw new DomainError(
        409,
        "CONTENT_NOT_READY",
        "Lịch chưa được liên kết với tập podcast",
      );
    if (schedule.episode.contentRevision !== contentRevision)
      throw new DomainError(
        409,
        "STALE_WRITE",
        "Nội dung đã thay đổi; tải lại phiên bản mới trước khi gửi duyệt",
      );
    if (["RELEASED", "CANCELLED", "PUBLISHING"].includes(schedule.status))
      throw new DomainError(
        409,
        "INVALID_STATE_TRANSITION",
        "Lịch không còn nhận nội dung kiểm duyệt",
      );
    return this.repository.createReview({
      scheduleId,
      episodeId: schedule.episodeId,
      revision: contentRevision,
      submittedById: session.user.id,
      correlationId,
    });
  }

  async reviewEpisode(
    session: Session,
    scheduleId: string,
    input: ReviewEpisodeInput,
    correlationId: string,
  ): Promise<EpisodeReviewEntity> {
    assertModerator(session);
    const schedule = requireSchedule(await this.repository.findSchedule(scheduleId));
    if (await this.repository.isModeratorAssigned(scheduleId, session.user.id))
      throw new DomainError(
        403,
        "SELF_REVIEW_FORBIDDEN",
        "Moderator sản xuất không được tự kiểm duyệt nội dung mình phụ trách",
      );
    const review = await this.repository.findLatestReview(scheduleId);
    if (
      !review ||
      review.status !== "IN_REVIEW" ||
      review.revision !== input.contentRevision
    )
      throw new DomainError(
        409,
        "INVALID_REVIEW_STATE",
        "Phiên bản này không ở trạng thái chờ duyệt",
      );
    if (schedule.episode?.contentRevision !== input.contentRevision)
      throw new DomainError(
        409,
        "STALE_WRITE",
        "Nội dung đã thay đổi sau khi gửi duyệt",
      );

    const status =
      input.decision === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED";
    const decided = await this.repository.decideReview({
      reviewId: review.id,
      status,
      reviewedById: session.user.id,
      reviewNote: input.reviewNote ?? null,
      correlationId,
    });

    if (
      status === "APPROVED" &&
      schedule.episodeId &&
      (await this.publisher.checklistReady(schedule.episodeId))
    ) {
      await this.repository.setStatus({
        scheduleId,
        from: ["SCHEDULED", "BLOCKED", "FAILED"],
        to: "READY_TO_PUBLISH",
        actorId: null,
        actorType: "SYSTEM",
        action: "release.auto_ready",
        correlationId,
        failureCode: null,
        failureMessage: null,
      });
    }
    return decided;
  }

  async publishDueSchedule(
    scheduleId: string,
    expectedVersion: number,
    correlationId: string,
    jobId?: string,
    attempt = 1,
  ): Promise<PublishReleaseResult> {
    const schedule = await this.repository.findSchedule(scheduleId);
    if (!schedule) return "IGNORED";
    if (schedule.version !== expectedVersion) {
      await this.repository.appendAudit({
        actorId: null,
        actorType: "SYSTEM",
        action: "release.stale_job_ignored",
        scheduleId,
        changes: { expectedVersion, currentVersion: schedule.version },
        correlationId,
        jobId,
      });
      return "IGNORED";
    }
    if (!["SCHEDULED", "READY_TO_PUBLISH"].includes(schedule.status))
      return "IGNORED";

    const review = await this.repository.findLatestReview(scheduleId);
    const checklistReady = schedule.episodeId
      ? await this.publisher.checklistReady(schedule.episodeId)
      : false;
    const readiness = evaluateReleaseReadiness(
      {
        status: schedule.status,
        reviewStatus: review?.status ?? null,
        reviewedRevision: review?.revision ?? null,
        contentRevision: schedule.episode?.contentRevision ?? 0,
        checklistReady,
        scheduledAt: schedule.scheduledAt,
      },
      this.clock(),
    );

    if (!readiness.canPublish) {
      if (readiness.state !== "BLOCKED") return "WAITING";
      await this.repository.setStatus({
        scheduleId,
        from: ["SCHEDULED", "READY_TO_PUBLISH"],
        to: "BLOCKED",
        actorId: null,
        actorType: "SYSTEM",
        action: "release.blocked",
        correlationId,
        jobId,
        failureCode: readiness.reason,
        failureMessage: readiness.reason,
      });
      return "BLOCKED";
    }

    if (schedule.status === "SCHEDULED") {
      await this.repository.setStatus({
        scheduleId,
        from: ["SCHEDULED"],
        to: "READY_TO_PUBLISH",
        actorId: null,
        actorType: "SYSTEM",
        action: "release.auto_ready",
        correlationId,
        jobId,
      });
    }
    if (!(await this.repository.claimForPublishing(scheduleId, expectedVersion, jobId)))
      return "IGNORED";

    try {
      await this.publisher.publishEpisode(
        schedule.episodeId!,
        schedule.episode!.updatedAt,
      );
      await this.repository.setStatus({
        scheduleId,
        from: ["PUBLISHING"],
        to: "RELEASED",
        actorId: null,
        actorType: "SYSTEM",
        action: "release.published",
        correlationId,
        jobId,
        publishedAt: this.clock(),
        failureCode: null,
        failureMessage: null,
      });
      return "RELEASED";
    } catch (error) {
      const businessFailure =
        error instanceof DomainError && error.status >= 400 && error.status < 500;
      const shouldRetry = !businessFailure && attempt <= 3;
      await this.repository.setStatus({
        scheduleId,
        from: ["PUBLISHING"],
        to: businessFailure ? "BLOCKED" : shouldRetry ? "READY_TO_PUBLISH" : "FAILED",
        actorId: null,
        actorType: "SYSTEM",
        action: businessFailure
          ? "release.blocked"
          : shouldRetry
            ? "release.retry_scheduled"
            : "release.failed",
        correlationId,
        jobId,
        failureCode:
          error instanceof DomainError ? error.code : "INTERNAL_SERVER_ERROR",
        failureMessage: error instanceof Error ? error.message : "Unknown error",
      });
      return businessFailure ? "BLOCKED" : shouldRetry ? "RETRY" : "FAILED";
    }
  }

  async publishNow(
    session: Session,
    scheduleId: string,
    correlationId: string,
  ): Promise<PublishReleaseResult> {
    assertAdmin(session);
    const schedule = requireSchedule(await this.repository.findSchedule(scheduleId));
    if (["BLOCKED", "FAILED"].includes(schedule.status)) {
      await this.repository.setStatus({
        scheduleId,
        from: ["BLOCKED", "FAILED"],
        to: "READY_TO_PUBLISH",
        actorId: session.user.id,
        actorType: "ADMIN",
        action: "release.manual_ready",
        correlationId,
        failureCode: null,
        failureMessage: null,
      });
    }
    return this.publishDueSchedule(
      scheduleId,
      schedule.version,
      correlationId,
      `manual:${session.user.id}`,
    );
  }

  async retrySchedule(
    session: Session,
    scheduleId: string,
    correlationId: string,
  ): Promise<void> {
    assertAdmin(session);
    if (!(await this.repository.retrySchedule({
      scheduleId,
      actorId: session.user.id,
      correlationId,
    })))
      throw new DomainError(
        409,
        "INVALID_STATE_TRANSITION",
        "Chỉ có thể thử lại lịch phát hành đang thất bại",
      );
  }

  async listSchedules(
    session: Session,
    filter: {
      status?: Parameters<ReleaseRepository["listSchedules"]>[0]["status"];
      from?: Date;
      to?: Date;
      page: number;
      limit: number;
    },
  ) {
    assertAdmin(session);
    const result = await this.repository.listSchedules(filter);
    return { ...result, page: filter.page, limit: filter.limit };
  }

  async getSchedule(session: Session, scheduleId: string) {
    if (session.user.role === "admin")
      return requireSchedule(await this.repository.findSchedule(scheduleId));
    assertModerator(session);
    if (!(await this.repository.isModeratorAssigned(scheduleId, session.user.id)))
      throw new DomainError(403, "FORBIDDEN", "Bạn không được xem lịch này");
    return requireSchedule(await this.repository.findSchedule(scheduleId));
  }

  async dashboard(session: Session) {
    assertAdmin(session);
    const current = this.clock();
    return this.repository.dashboardCounts(
      current,
      new Date(current.getTime() + 2 * 60 * 60 * 1000),
    );
  }

  async moderators(session: Session) {
    assertAdmin(session);
    return this.repository.listModerators();
  }

  async progress(session: Session, scheduleId: string) {
    if (session.user.role !== "admin") {
      assertModerator(session);
      if (!(await this.repository.isModeratorAssigned(scheduleId, session.user.id)))
        throw new DomainError(403, "FORBIDDEN", "Bạn không được xem tiến độ này");
    }
    requireSchedule(await this.repository.findSchedule(scheduleId));
    return this.repository.listProgress(scheduleId);
  }

  async assignedWork(session: Session) {
    assertModerator(session);
    return this.repository.listAssignedSchedules(session.user.id);
  }

  async assignableEpisodes(session: Session) {
    assertModerator(session);
    return this.repository.listAssignableEpisodes(session.user.id);
  }

  async linkEpisode(
    session: Session,
    scheduleId: string,
    episodeId: string,
    correlationId: string,
  ) {
    assertModerator(session);
    if (!(await this.repository.isModeratorAssigned(scheduleId, session.user.id)))
      throw new DomainError(403, "FORBIDDEN", "Bạn không được phân công vào lịch này");
    const schedule = await this.repository.linkEpisode({
      scheduleId,
      episodeId,
      moderatorId: session.user.id,
      correlationId,
    });
    if (!schedule)
      throw new DomainError(
        409,
        "CONTENT_NOT_READY",
        "Chỉ có thể liên kết tập nháp thuộc nội dung của bạn với lịch đang hoạt động",
      );
    return schedule;
  }

  async reviewQueue(session: Session) {
    assertModerator(session);
    return this.repository.listReviewQueue(session.user.id);
  }

  async productionReminders(session: Session) {
    assertModerator(session);
    return this.repository.listProductionReminders(session.user.id);
  }

  async cancelSchedule(
    session: Session,
    scheduleId: string,
    correlationId: string,
  ): Promise<void> {
    assertAdmin(session);
    const changed = await this.repository.setStatus({
      scheduleId,
      from: ["SCHEDULED", "READY_TO_PUBLISH", "BLOCKED", "FAILED"],
      to: "CANCELLED",
      actorId: session.user.id,
      actorType: "ADMIN",
      action: "release.cancelled",
      correlationId,
      cancelledAt: this.clock(),
    });
    if (!changed)
      throw new DomainError(
        409,
        "INVALID_STATE_TRANSITION",
        "Không thể hủy lịch ở trạng thái hiện tại",
      );
  }
}
