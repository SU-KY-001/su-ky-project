import type {
  EpisodeReviewStatus,
  ReleaseModeratorWorkload,
  ReleaseScheduleStatus,
} from "@repo/shared";

export interface ReleaseAssignmentEntity {
  scheduleId: string;
  moderatorId: string;
  assignedById: string;
  assignedAt: Date;
  removedAt: Date | null;
  moderator: {
    id: string;
    name: string;
    email: string;
  };
}

export interface EpisodeReviewEntity {
  id: string;
  scheduleId: string;
  episodeId: string;
  revision: number;
  status: EpisodeReviewStatus;
  submittedById: string;
  submittedAt: Date;
  reviewedById: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
}

export interface ReleaseScheduleEntity {
  id: string;
  episodeId: string | null;
  title: string;
  productionDeadline: Date;
  scheduledAt: Date;
  status: ReleaseScheduleStatus;
  version: number;
  createdById: string;
  publishedAt: Date | null;
  cancelledAt: Date | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignments: ReleaseAssignmentEntity[];
  reviews: EpisodeReviewEntity[];
  episode: {
    id: string;
    title: string;
    status: "DRAFT" | "PUBLISHED" | "HIDDEN";
    contentRevision: number;
    updatedAt: Date;
  } | null;
}

export interface ReleaseProgressEvent {
  id: string;
  actorId: string | null;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: unknown;
  correlationId: string | null;
  jobId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: Date;
}

export interface CreateReleaseScheduleRecord {
  title: string;
  episodeId: string | null;
  productionDeadline: Date;
  scheduledAt: Date;
  createdById: string;
  moderatorIds: string[];
  correlationId: string;
}

export interface UpdateReleaseScheduleRecord {
  title?: string;
  episodeId?: string | null;
  productionDeadline?: Date;
  scheduledAt?: Date;
  expectedUpdatedAt: Date;
  actorId: string;
  correlationId: string;
}

export interface CreateEpisodeReviewRecord {
  scheduleId: string;
  episodeId: string;
  revision: number;
  submittedById: string;
  correlationId: string;
}

export interface DecideEpisodeReviewRecord {
  reviewId: string;
  status: Extract<EpisodeReviewStatus, "APPROVED" | "CHANGES_REQUESTED">;
  reviewedById: string;
  reviewNote: string | null;
  correlationId: string;
}

export interface AppendReleaseAuditRecord {
  actorId: string | null;
  actorType: "ADMIN" | "MODERATOR" | "SYSTEM";
  action: string;
  scheduleId: string;
  changes?: Record<string, unknown>;
  correlationId?: string | null;
  jobId?: string | null;
  fromStatus?: ReleaseScheduleStatus | null;
  toStatus?: ReleaseScheduleStatus | null;
}

export interface PendingOutboxEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
  attempts: number;
  createdAt: Date;
}

export interface ReleaseDashboardCounts {
  upcoming: number;
  ready: number;
  atRisk: number;
  needsAttention: number;
}

export interface ReleaseScheduleListFilter {
  status?: ReleaseScheduleStatus;
  from?: Date;
  to?: Date;
  q?: string;
  moderatorId?: string;
  page: number;
  limit: number;
}

export interface ReleaseRepository {
  createSchedule(input: CreateReleaseScheduleRecord): Promise<ReleaseScheduleEntity>;
  findSchedule(id: string): Promise<ReleaseScheduleEntity | null>;
  updateSchedule(id: string, input: UpdateReleaseScheduleRecord): Promise<ReleaseScheduleEntity | null>;
  replaceAssignees(
    scheduleId: string,
    moderatorIds: string[],
    actorId: string,
    correlationId: string,
  ): Promise<void>;
  isModeratorAssigned(scheduleId: string, moderatorId: string): Promise<boolean>;
  createReview(input: CreateEpisodeReviewRecord): Promise<EpisodeReviewEntity>;
  decideReview(input: DecideEpisodeReviewRecord): Promise<EpisodeReviewEntity>;
  findLatestReview(scheduleId: string): Promise<EpisodeReviewEntity | null>;
  setStatus(input: {
    scheduleId: string;
    from: ReleaseScheduleStatus[];
    to: ReleaseScheduleStatus;
    actorId: string | null;
    actorType: "ADMIN" | "SYSTEM";
    action: string;
    correlationId?: string | null;
    jobId?: string | null;
    failureCode?: string | null;
    failureMessage?: string | null;
    publishedAt?: Date | null;
    cancelledAt?: Date | null;
  }): Promise<boolean>;
  claimForPublishing(scheduleId: string, version: number, jobId?: string): Promise<boolean>;
  appendAudit(input: AppendReleaseAuditRecord): Promise<void>;
  listProgress(scheduleId: string): Promise<ReleaseProgressEvent[]>;
  listPendingOutbox(limit?: number): Promise<PendingOutboxEvent[]>;
  markOutboxDispatched(id: string, dispatchedAt: Date): Promise<void>;
  markOutboxFailed(id: string, error: string): Promise<void>;
  listDueScheduleIds(now: Date, limit?: number): Promise<Array<{ id: string; version: number }>>;
  listStuckPublishingIds(before: Date, limit?: number): Promise<Array<{ id: string; version: number }>>;
  dashboardCounts(now: Date, atRiskAfter: Date): Promise<ReleaseDashboardCounts>;
  listModeratorWorkload(
    now: Date,
    nearDeadlineBefore: Date,
  ): Promise<ReleaseModeratorWorkload[]>;
  listSchedules(filter: ReleaseScheduleListFilter): Promise<{
    items: ReleaseScheduleEntity[];
    total: number;
  }>;
  listAssignedSchedules(moderatorId: string): Promise<ReleaseScheduleEntity[]>;
  retrySchedule(input: {
    scheduleId: string;
    actorId: string;
    correlationId: string;
  }): Promise<boolean>;
  listModerators(): Promise<Array<{ id: string; name: string; email: string }>>;
  listAssignableEpisodes(moderatorId: string): Promise<Array<{
    id: string;
    title: string;
    seriesTitle: string;
    contentRevision: number;
    updatedAt: Date;
  }>>;
  linkEpisode(input: {
    scheduleId: string;
    episodeId: string;
    moderatorId: string;
    correlationId: string;
  }): Promise<ReleaseScheduleEntity | null>;
  listReviewQueue(reviewerId: string): Promise<ReleaseScheduleEntity[]>;
  issueDueReminders(from: Date, to: Date): Promise<number>;
  listProductionReminders(moderatorId: string): Promise<Array<{
    id: string;
    scheduleId: string;
    title: string;
    message: string;
    productionDeadline: Date;
    scheduledAt: Date;
    createdAt: Date;
  }>>;
}
