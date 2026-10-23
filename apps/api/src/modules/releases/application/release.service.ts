import type {
  CreateReleaseScheduleInput,
  ReviewContent,
  ReviewEpisodeInput,
  ReviewReadinessSnapshot,
  UpdateReleaseScheduleInput,
} from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import type { Session } from "../../auth";
import { evaluateReleaseReadiness } from "../domain/release-policy";
import {
  assertAssessmentGate,
  hasAiVoiceAudio,
  hasPublicationWarnings,
} from "../../content/application/publication-gate";
import type {
  EpisodeReviewEntity,
  ReleaseRepository,
  ReleaseScheduleEntity,
} from "../domain/release.repository";

export interface ReleasePublisher {
  checklistReady(episodeId: string): Promise<boolean>;
  reviewContent(episodeId: string): Promise<ReviewContent | null>;
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

  async replaceAssignee(
    session: Session,
    scheduleId: string,
    moderatorId: string,
    correlationId: string,
  ): Promise<void> {
    assertAdmin(session);
    requireSchedule(await this.repository.findSchedule(scheduleId));
    await this.repository.replaceAssignee(
      scheduleId,
      moderatorId,
      session.user.id,
      correlationId,
    );
  }

  async createReassignmentTicket(
    session: Session,
    scheduleId: string,
    reason: string,
    correlationId: string,
  ) {
    assertModerator(session);
    const schedule = requireSchedule(await this.repository.findSchedule(scheduleId));
    if (!(await this.repository.isModeratorAssigned(scheduleId, session.user.id)))
      throw new DomainError(403, "FORBIDDEN", "Bạn không được phân công vào lịch này");
    if (["RELEASED", "CANCELLED", "PUBLISHING"].includes(schedule.status))
      throw new DomainError(409, "INVALID_STATE_TRANSITION", "Lịch không còn nhận yêu cầu chuyển giao");
    const ticket = await this.repository.createReassignmentTicket({
      scheduleId,
      requestedById: session.user.id,
      reason,
      correlationId,
    });
    if (!ticket)
      throw new DomainError(409, "CONFLICT", "Lịch đã có ticket chuyển giao đang chờ duyệt");
    return ticket;
  }

  async updateReassignmentTicket(
    session: Session,
    ticketId: string,
    reason: string,
    correlationId: string,
  ) {
    assertModerator(session);
    const ticket = await this.repository.updateReassignmentTicket({
      ticketId,
      requestedById: session.user.id,
      reason,
      correlationId,
    });
    if (!ticket)
      throw new DomainError(409, "INVALID_STATE_TRANSITION", "Chỉ có thể sửa ticket đang chờ của bạn");
    return ticket;
  }

  async cancelReassignmentTicket(
    session: Session,
    ticketId: string,
    correlationId: string,
  ) {
    assertModerator(session);
    const ticket = await this.repository.cancelReassignmentTicket({
      ticketId,
      requestedById: session.user.id,
      correlationId,
    });
    if (!ticket)
      throw new DomainError(409, "INVALID_STATE_TRANSITION", "Chỉ có thể hủy ticket đang chờ của bạn");
    return ticket;
  }

  async listMyReassignmentTickets(
    session: Session,
    filter: { status?: Parameters<ReleaseRepository["listReassignmentTickets"]>[0]["status"]; page: number; limit: number },
  ) {
    assertModerator(session);
    const result = await this.repository.listReassignmentTickets({
      ...filter,
      requestedById: session.user.id,
    });
    return { ...result, page: filter.page, limit: filter.limit };
  }

  async listReassignmentTickets(
    session: Session,
    filter: { status?: Parameters<ReleaseRepository["listReassignmentTickets"]>[0]["status"]; page: number; limit: number },
  ) {
    assertAdmin(session);
    const result = await this.repository.listReassignmentTickets(filter);
    return { ...result, page: filter.page, limit: filter.limit };
  }

  async rejectReassignmentTicket(
    session: Session,
    ticketId: string,
    reason: string,
    correlationId: string,
  ) {
    assertAdmin(session);
    const ticket = await this.repository.rejectReassignmentTicket({
      ticketId,
      resolvedById: session.user.id,
      reason,
      correlationId,
    });
    if (!ticket)
      throw new DomainError(409, "INVALID_STATE_TRANSITION", "Ticket không còn ở trạng thái chờ duyệt");
    return ticket;
  }

  async approveReassignmentTicket(
    session: Session,
    ticketId: string,
    replacementModeratorId: string,
    correlationId: string,
  ) {
    assertAdmin(session);
    const current = await this.repository.findReassignmentTicket(ticketId);
    if (!current)
      throw new DomainError(404, "NOT_FOUND", "Không tìm thấy ticket chuyển giao");
    if (current.requestedById === replacementModeratorId)
      throw new DomainError(409, "CONFLICT", "Người thay thế phải khác Moderator hiện tại");
    const result = await this.repository.approveReassignmentTicket({
      ticketId,
      replacementModeratorId,
      resolvedById: session.user.id,
      correlationId,
    });
    if (result === "INVALID_REPLACEMENT")
      throw new DomainError(409, "CONFLICT", "Moderator thay thế không còn hoạt động hoặc không hợp lệ");
    if (!result)
      throw new DomainError(409, "INVALID_STATE_TRANSITION", "Ticket không còn ở trạng thái chờ duyệt");
    return result;
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
    // Submitting needs only the required checklist; approval is decided later, so readiness never depends on it.
    await this.loadReviewable(schedule.episodeId, contentRevision);
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
    if (session.user.role !== "admin" && session.user.role !== "moderator")
      throw new DomainError(403, "FORBIDDEN", "Chỉ Admin hoặc Moderator được kiểm duyệt nội dung");
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
    if (!schedule.episodeId)
      throw new DomainError(409, "CONTENT_NOT_READY", "Lịch chưa được liên kết với tập podcast");

    let readinessSnapshot: ReviewReadinessSnapshot;
    if (input.decision === "APPROVE") {
      const content = await this.loadReviewable(schedule.episodeId, input.contentRevision);
      assertAssessmentGate(input.assessment, {
        hasAiVoice: hasAiVoiceAudio(content.episode.narrations.filter((item) => item.audio)),
        hasWarnings: hasPublicationWarnings(content.readiness),
        now: this.clock(),
      });
      readinessSnapshot = { readiness: content.readiness, assessment: input.assessment };
    } else {
      const content = await this.publisher.reviewContent(schedule.episodeId);
      if (!content) throw new DomainError(404, "NOT_FOUND", "Không tìm thấy tập podcast");
      readinessSnapshot = { readiness: content.readiness, assessment: null };
    }

    const status =
      input.decision === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED";
    const decided = await this.repository.decideReview({
      reviewId: review.id,
      status,
      reviewedById: session.user.id,
      actorType: session.user.role === "admin" ? "ADMIN" : "MODERATOR",
      reviewNote: input.reviewNote ?? null,
      correlationId,
      expectedRevision: input.contentRevision,
      readinessSnapshot,
    });

    if (
      status === "APPROVED" &&
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

  /** Read-only content for the reviewer: full episode + readiness + AI counts. Never for the assigned producer. */
  async reviewContent(session: Session, scheduleId: string): Promise<ReviewContent> {
    if (session.user.role !== "admin" && session.user.role !== "moderator")
      throw new DomainError(403, "FORBIDDEN", "Chỉ Admin hoặc Moderator được xem nội dung kiểm duyệt");
    const schedule = requireSchedule(await this.repository.findSchedule(scheduleId));
    if (await this.repository.isModeratorAssigned(scheduleId, session.user.id))
      throw new DomainError(403, "SELF_REVIEW_FORBIDDEN", "Moderator sản xuất không được xem tập mình phụ trách ở vai trò người duyệt");
    const review = await this.repository.findLatestReview(scheduleId);
    if (!review || review.status !== "IN_REVIEW" || !schedule.episodeId)
      throw new DomainError(404, "NOT_FOUND", "Lịch này không có nội dung đang chờ duyệt");
    const content = await this.publisher.reviewContent(schedule.episodeId);
    if (!content) throw new DomainError(404, "NOT_FOUND", "Không tìm thấy tập podcast");
    return content;
  }

  /** Content at exactly `revision` with every required checklist row satisfied; otherwise the specific error. */
  private async loadReviewable(episodeId: string, revision: number): Promise<ReviewContent> {
    const content = await this.publisher.reviewContent(episodeId);
    if (!content) throw new DomainError(404, "NOT_FOUND", "Không tìm thấy tập podcast");
    if (!content.readiness.ready)
      throw new DomainError(422, "CHECKLIST_INCOMPLETE", "Tập chưa đủ mục bắt buộc (tên tập, kịch bản và âm thanh ngôi thứ ba)");
    if (content.readiness.contentRevision !== revision)
      throw new DomainError(409, "STALE_WRITE", "Nội dung đã thay đổi; tải lại phiên bản mới");
    return content;
  }

  async checkReadiness(
    session: Session,
    scheduleId: string,
    correlationId: string,
  ): Promise<ReleaseScheduleEntity> {
    assertAdmin(session);
    const schedule = requireSchedule(await this.repository.findSchedule(scheduleId));
    if (!["SCHEDULED", "BLOCKED"].includes(schedule.status))
      throw new DomainError(
        409,
        "INVALID_STATE_TRANSITION",
        "Chỉ lịch đã lên lịch hoặc đang bị chặn mới có thể đánh giá sẵn sàng",
      );

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
    if (!readiness.canPublish)
      throw new DomainError(
        409,
        "CONTENT_NOT_READY",
        "Podcast chưa được duyệt ở phiên bản hiện tại hoặc chưa hoàn tất checklist xuất bản",
      );

    const changed = await this.repository.setStatus({
      scheduleId,
      from: ["SCHEDULED", "BLOCKED"],
      to: "READY_TO_PUBLISH",
      actorId: session.user.id,
      actorType: "ADMIN",
      action: "release.manual_ready",
      correlationId,
      failureCode: null,
      failureMessage: null,
    });
    if (!changed)
      throw new DomainError(
        409,
        "INVALID_STATE_TRANSITION",
        "Lịch đã thay đổi; tải lại trước khi cập nhật trạng thái",
      );

    return requireSchedule(await this.repository.findSchedule(scheduleId));
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
      scope?: Parameters<ReleaseRepository["listSchedules"]>[0]["scope"];
      from?: Date;
      to?: Date;
      q?: string;
      moderatorId?: string;
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

  async workload(session: Session) {
    assertAdmin(session);
    const current = this.clock();
    return this.repository.listModeratorWorkload(
      current,
      new Date(current.getTime() + 24 * 60 * 60 * 1000),
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
