import { prisma, Prisma } from "@repo/db";
import type { ReleaseScheduleStatus } from "@repo/shared";
import type {
  AppendReleaseAuditRecord,
  CreateEpisodeReviewRecord,
  CreateReleaseScheduleRecord,
  DecideEpisodeReviewRecord,
  EpisodeReviewEntity,
  PendingOutboxEvent,
  ReleaseProgressEvent,
  ReleaseRepository,
  ReleaseScheduleEntity,
  UpdateReleaseScheduleRecord,
  ReleaseScheduleListFilter,
} from "../domain/release.repository";

const scheduleInclude = {
  assignments: {
    where: { removedAt: null },
    orderBy: { assignedAt: "asc" as const },
    include: {
      moderator: { select: { id: true, name: true, email: true } },
    },
  },
  reviews: { orderBy: { submittedAt: "desc" as const } },
  episode: {
    select: {
      id: true,
      title: true,
      status: true,
      contentRevision: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ReleaseScheduleInclude;

function scheduleEventPayload(scheduleId: string, version: number, scheduledAt: Date) {
  return {
    scheduleId,
    scheduleVersion: version,
    scheduledAt: scheduledAt.toISOString(),
  } satisfies Prisma.InputJsonObject;
}

function asSchedule(
  row: Prisma.ReleaseScheduleGetPayload<{ include: typeof scheduleInclude }>,
): ReleaseScheduleEntity {
  return row;
}

export class PrismaReleaseRepository implements ReleaseRepository {
  async createSchedule(input: CreateReleaseScheduleRecord): Promise<ReleaseScheduleEntity> {
    const created = await prisma.$transaction(async (tx) => {
      const schedule = await tx.releaseSchedule.create({
        data: {
          title: input.title,
          episodeId: input.episodeId,
          productionDeadline: input.productionDeadline,
          scheduledAt: input.scheduledAt,
          createdById: input.createdById,
          assignments: {
            create: input.moderatorIds.map((moderatorId) => ({
              moderatorId,
              assignedById: input.createdById,
            })),
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventType: "release.schedule.created",
          aggregateType: "release_schedule",
          aggregateId: schedule.id,
          payload: scheduleEventPayload(schedule.id, schedule.version, schedule.scheduledAt),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: input.createdById,
          actorType: "ADMIN",
          action: "release_schedule.created",
          resourceType: "release_schedule",
          resourceId: schedule.id,
          changes: {
            title: schedule.title,
            episodeId: schedule.episodeId,
            moderatorIds: input.moderatorIds,
            productionDeadline: schedule.productionDeadline.toISOString(),
            scheduledAt: schedule.scheduledAt.toISOString(),
          },
          correlationId: input.correlationId,
          toStatus: schedule.status,
        },
      });
      return schedule;
    });

    return asSchedule(
      await prisma.releaseSchedule.findUniqueOrThrow({
        where: { id: created.id },
        include: scheduleInclude,
      }),
    );
  }

  async findSchedule(id: string): Promise<ReleaseScheduleEntity | null> {
    const schedule = await prisma.releaseSchedule.findUnique({
      where: { id },
      include: scheduleInclude,
    });
    return schedule ? asSchedule(schedule) : null;
  }

  async updateSchedule(
    id: string,
    input: UpdateReleaseScheduleRecord,
  ): Promise<ReleaseScheduleEntity | null> {
    const changed = await prisma.$transaction(async (tx) => {
      const current = await tx.releaseSchedule.findUnique({ where: { id } });
      if (!current || current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
        return false;

      const isReschedule =
        input.scheduledAt !== undefined &&
        input.scheduledAt.getTime() !== current.scheduledAt.getTime();
      const nextVersion = current.version + (isReschedule ? 1 : 0);
      const schedule = await tx.releaseSchedule.update({
        where: { id },
        data: {
          title: input.title,
          episodeId: input.episodeId,
          productionDeadline: input.productionDeadline,
          scheduledAt: input.scheduledAt,
          version: nextVersion,
          status: isReschedule ? "SCHEDULED" : undefined,
          failureCode: isReschedule ? null : undefined,
          failureMessage: isReschedule ? null : undefined,
        },
      });

      if (isReschedule) {
        await tx.outboxEvent.create({
          data: {
            eventType: "release.schedule.rescheduled",
            aggregateType: "release_schedule",
            aggregateId: schedule.id,
            payload: scheduleEventPayload(schedule.id, schedule.version, schedule.scheduledAt),
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          actorType: "ADMIN",
          action: isReschedule
            ? "release_schedule.rescheduled"
            : "release_schedule.updated",
          resourceType: "release_schedule",
          resourceId: schedule.id,
          changes: {
            title: input.title ?? current.title,
            episodeId:
              input.episodeId === undefined ? current.episodeId : input.episodeId,
            productionDeadline: (
              input.productionDeadline ?? current.productionDeadline
            ).toISOString(),
            scheduledAt: (input.scheduledAt ?? current.scheduledAt).toISOString(),
            version: schedule.version,
          },
          correlationId: input.correlationId,
          fromStatus: current.status,
          toStatus: schedule.status,
        },
      });
      return true;
    });
    return changed ? this.findSchedule(id) : null;
  }

  async replaceAssignees(
    scheduleId: string,
    moderatorIds: string[],
    actorId: string,
    correlationId: string,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const active = await tx.productionAssignment.findMany({
        where: { scheduleId, removedAt: null },
        select: { moderatorId: true },
      });
      const currentIds = new Set(active.map((item) => item.moderatorId));
      const nextIds = new Set(moderatorIds);
      const removedIds = [...currentIds].filter((id) => !nextIds.has(id));
      const addedIds = moderatorIds.filter((id) => !currentIds.has(id));

      if (removedIds.length) {
        await tx.productionAssignment.updateMany({
          where: { scheduleId, moderatorId: { in: removedIds }, removedAt: null },
          data: { removedAt: new Date() },
        });
      }
      if (addedIds.length) {
        await tx.productionAssignment.createMany({
          data: addedIds.map((moderatorId) => ({
            scheduleId,
            moderatorId,
            assignedById: actorId,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          actorId,
          actorType: "ADMIN",
          action: "release_schedule.assignees_changed",
          resourceType: "release_schedule",
          resourceId: scheduleId,
          changes: { addedIds, removedIds, moderatorIds },
          correlationId,
        },
      });
    });
  }

  async isModeratorAssigned(scheduleId: string, moderatorId: string): Promise<boolean> {
    return (
      (await prisma.productionAssignment.count({
        where: { scheduleId, moderatorId, removedAt: null },
      })) > 0
    );
  }

  async createReview(input: CreateEpisodeReviewRecord): Promise<EpisodeReviewEntity> {
    return prisma.$transaction(async (tx) => {
      const review = await tx.episodeReview.create({
        data: {
          scheduleId: input.scheduleId,
          episodeId: input.episodeId,
          revision: input.revision,
          submittedById: input.submittedById,
          status: "IN_REVIEW",
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: input.submittedById,
          actorType: "MODERATOR",
          action: "episode.review_submitted",
          resourceType: "release_schedule",
          resourceId: input.scheduleId,
          changes: {
            reviewId: review.id,
            episodeId: review.episodeId,
            revision: review.revision,
          },
          correlationId: input.correlationId,
        },
      });
      return review;
    });
  }

  async decideReview(input: DecideEpisodeReviewRecord): Promise<EpisodeReviewEntity> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.episodeReview.findUniqueOrThrow({
        where: { id: input.reviewId },
      });
      const review = await tx.episodeReview.update({
        where: { id: input.reviewId },
        data: {
          status: input.status,
          reviewedById: input.reviewedById,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: input.reviewedById,
          actorType: "MODERATOR",
          action:
            input.status === "APPROVED"
              ? "episode.approved"
              : "episode.changes_requested",
          resourceType: "release_schedule",
          resourceId: review.scheduleId,
          changes: {
            reviewId: review.id,
            episodeId: review.episodeId,
            revision: review.revision,
            reviewNote: review.reviewNote,
          },
          correlationId: input.correlationId,
          fromStatus: current.status,
          toStatus: review.status,
        },
      });
      return review;
    });
  }

  async findLatestReview(scheduleId: string): Promise<EpisodeReviewEntity | null> {
    return prisma.episodeReview.findFirst({
      where: { scheduleId },
      orderBy: { submittedAt: "desc" },
    });
  }

  async setStatus(input: {
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
  }): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.releaseSchedule.findUnique({
        where: { id: input.scheduleId },
        select: { status: true },
      });
      if (!current || !input.from.includes(current.status)) return false;
      const changed = await tx.releaseSchedule.updateMany({
        where: { id: input.scheduleId, status: { in: input.from } },
        data: {
          status: input.to,
          failureCode: input.failureCode,
          failureMessage: input.failureMessage,
          publishedAt: input.publishedAt,
          cancelledAt: input.cancelledAt,
        },
      });
      if (changed.count !== 1) return false;
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          actorType: input.actorType,
          action: input.action,
          resourceType: "release_schedule",
          resourceId: input.scheduleId,
          changes: {
            failureCode: input.failureCode ?? null,
            failureMessage: input.failureMessage ?? null,
          },
          correlationId: input.correlationId,
          jobId: input.jobId,
          fromStatus: current.status,
          toStatus: input.to,
        },
      });
      return true;
    });
  }

  async claimForPublishing(
    scheduleId: string,
    version: number,
    jobId?: string,
  ): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const changed = await tx.releaseSchedule.updateMany({
        where: { id: scheduleId, version, status: "READY_TO_PUBLISH" },
        data: { status: "PUBLISHING" },
      });
      if (changed.count !== 1) return false;
      await tx.auditLog.create({
        data: {
          actorId: null,
          actorType: "SYSTEM",
          action: "release.started",
          resourceType: "release_schedule",
          resourceId: scheduleId,
          changes: { version },
          jobId,
          fromStatus: "READY_TO_PUBLISH",
          toStatus: "PUBLISHING",
        },
      });
      return true;
    });
  }

  async appendAudit(input: AppendReleaseAuditRecord): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorType: input.actorType,
        action: input.action,
        resourceType: "release_schedule",
        resourceId: input.scheduleId,
        changes: (input.changes ?? {}) as Prisma.InputJsonObject,
        correlationId: input.correlationId,
        jobId: input.jobId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
      },
    });
  }

  async listProgress(scheduleId: string): Promise<ReleaseProgressEvent[]> {
    return prisma.auditLog.findMany({
      where: { resourceType: "release_schedule", resourceId: scheduleId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        actorId: true,
        actorType: true,
        action: true,
        resourceType: true,
        resourceId: true,
        changes: true,
        correlationId: true,
        jobId: true,
        fromStatus: true,
        toStatus: true,
        createdAt: true,
      },
    });
  }

  async listPendingOutbox(limit = 100): Promise<PendingOutboxEvent[]> {
    return prisma.outboxEvent.findMany({
      where: { dispatchedAt: null },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async markOutboxDispatched(id: string, dispatchedAt: Date): Promise<void> {
    await prisma.outboxEvent.update({
      where: { id },
      data: { dispatchedAt, attempts: { increment: 1 }, lastError: null },
    });
  }

  async markOutboxFailed(id: string, error: string): Promise<void> {
    await prisma.outboxEvent.update({
      where: { id },
      data: { attempts: { increment: 1 }, lastError: error.slice(0, 10_000) },
    });
  }

  listDueScheduleIds(now: Date, limit = 100) {
    return prisma.releaseSchedule.findMany({
      where: {
        scheduledAt: { lte: now },
        status: { in: ["SCHEDULED", "READY_TO_PUBLISH"] },
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
      select: { id: true, version: true },
    });
  }

  listStuckPublishingIds(before: Date, limit = 100) {
    return prisma.releaseSchedule.findMany({
      where: { status: "PUBLISHING", updatedAt: { lte: before } },
      orderBy: { updatedAt: "asc" },
      take: limit,
      select: { id: true, version: true },
    });
  }

  async dashboardCounts(now: Date, atRiskAfter: Date) {
    const [upcoming, ready, atRisk, needsAttention] = await prisma.$transaction([
      prisma.releaseSchedule.count({
        where: { scheduledAt: { gt: now }, status: "SCHEDULED" },
      }),
      prisma.releaseSchedule.count({ where: { status: "READY_TO_PUBLISH" } }),
      prisma.releaseSchedule.count({
        where: {
          status: "SCHEDULED",
          scheduledAt: { gt: now, lte: atRiskAfter },
        },
      }),
      prisma.releaseSchedule.count({
        where: { status: { in: ["BLOCKED", "FAILED"] } },
      }),
    ]);
    return { upcoming, ready, atRisk, needsAttention };
  }

  async listModeratorWorkload(now: Date, nearDeadlineBefore: Date) {
    const activeStatuses: ReleaseScheduleStatus[] = [
      "SCHEDULED",
      "READY_TO_PUBLISH",
      "PUBLISHING",
      "BLOCKED",
      "FAILED",
    ];
    const [openRows, nearDeadlineRows] = await prisma.$transaction([
      prisma.productionAssignment.groupBy({
        by: ["moderatorId"],
        orderBy: { moderatorId: "asc" },
        where: {
          removedAt: null,
          schedule: { status: { in: activeStatuses } },
        },
        _count: { moderatorId: true },
      }),
      prisma.productionAssignment.groupBy({
        by: ["moderatorId"],
        orderBy: { moderatorId: "asc" },
        where: {
          removedAt: null,
          schedule: {
            status: { in: activeStatuses },
            productionDeadline: { gte: now, lte: nearDeadlineBefore },
          },
        },
        _count: { moderatorId: true },
      }),
    ]);
    const openByModerator = new Map(
      openRows.map((row) => [
        row.moderatorId,
        typeof row._count === "object" ? row._count.moderatorId ?? 0 : 0,
      ]),
    );
    const nearDeadlineByModerator = new Map(
      nearDeadlineRows.map((row) => [
        row.moderatorId,
        typeof row._count === "object" ? row._count.moderatorId ?? 0 : 0,
      ]),
    );
    const moderators = await prisma.user.findMany({
      where: { id: { in: [...openByModerator.keys()] } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    });
    return moderators.map((moderator) => ({
      moderatorId: moderator.id,
      name: moderator.name,
      open: openByModerator.get(moderator.id) ?? 0,
      nearDeadline: nearDeadlineByModerator.get(moderator.id) ?? 0,
    }));
  }

  async listSchedules(filter: ReleaseScheduleListFilter) {
    const where: Prisma.ReleaseScheduleWhereInput = {
      status: filter.status,
      title: filter.q
        ? { contains: filter.q, mode: "insensitive" }
        : undefined,
      assignments: filter.moderatorId
        ? { some: { moderatorId: filter.moderatorId, removedAt: null } }
        : undefined,
      scheduledAt:
        filter.from || filter.to
          ? { gte: filter.from, lte: filter.to }
          : undefined,
    };
    const [items, total] = await prisma.$transaction([
      prisma.releaseSchedule.findMany({
        where,
        include: scheduleInclude,
        orderBy: { scheduledAt: "asc" },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      prisma.releaseSchedule.count({ where }),
    ]);
    return { items: items.map(asSchedule), total };
  }

  async listAssignedSchedules(moderatorId: string) {
    const items = await prisma.releaseSchedule.findMany({
      where: {
        assignments: { some: { moderatorId, removedAt: null } },
        status: { notIn: ["CANCELLED"] },
      },
      include: scheduleInclude,
      orderBy: [{ productionDeadline: "asc" }, { scheduledAt: "asc" }],
    });
    return items.map(asSchedule);
  }

  async retrySchedule(input: {
    scheduleId: string;
    actorId: string;
    correlationId: string;
  }): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const schedule = await tx.releaseSchedule.findUnique({
        where: { id: input.scheduleId },
      });
      if (!schedule || schedule.status !== "FAILED") return false;
      const changed = await tx.releaseSchedule.updateMany({
        where: { id: schedule.id, status: "FAILED", version: schedule.version },
        data: {
          status: "READY_TO_PUBLISH",
          failureCode: null,
          failureMessage: null,
        },
      });
      if (changed.count !== 1) return false;
      await tx.outboxEvent.create({
        data: {
          eventType: "release.retry_requested",
          aggregateType: "release_schedule",
          aggregateId: schedule.id,
          payload: scheduleEventPayload(schedule.id, schedule.version, new Date()),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          actorType: "ADMIN",
          action: "release.retry_scheduled",
          resourceType: "release_schedule",
          resourceId: schedule.id,
          changes: { version: schedule.version },
          correlationId: input.correlationId,
          fromStatus: "FAILED",
          toStatus: "READY_TO_PUBLISH",
        },
      });
      return true;
    });
  }

  listModerators() {
    return prisma.user.findMany({
      where: { role: { contains: "moderator" }, banned: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
  }

  async listAssignableEpisodes(moderatorId: string) {
    const episodes = await prisma.episode.findMany({
      where: {
        status: "DRAFT",
        deletedAt: null,
        series: { ownerId: moderatorId, deletedAt: null },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        contentRevision: true,
        updatedAt: true,
        series: { select: { title: true } },
      },
    });
    return episodes.map(({ series, ...episode }) => ({
      ...episode,
      seriesTitle: series.title,
    }));
  }

  async linkEpisode(input: {
    scheduleId: string;
    episodeId: string;
    moderatorId: string;
    correlationId: string;
  }): Promise<ReleaseScheduleEntity | null> {
    const linked = await prisma.$transaction(async (tx) => {
      const assignment = await tx.productionAssignment.findFirst({
        where: {
          scheduleId: input.scheduleId,
          moderatorId: input.moderatorId,
          removedAt: null,
        },
      });
      if (!assignment) return false;
      const episode = await tx.episode.findFirst({
        where: {
          id: input.episodeId,
          status: "DRAFT",
          deletedAt: null,
          series: { ownerId: input.moderatorId, deletedAt: null },
        },
        select: { id: true },
      });
      if (!episode) return false;
      const changed = await tx.releaseSchedule.updateMany({
        where: {
          id: input.scheduleId,
          status: { in: ["SCHEDULED", "BLOCKED", "FAILED"] },
        },
        data: {
          episodeId: input.episodeId,
          status: "SCHEDULED",
          failureCode: null,
          failureMessage: null,
        },
      });
      if (changed.count !== 1) return false;
      await tx.auditLog.create({
        data: {
          actorId: input.moderatorId,
          actorType: "MODERATOR",
          action: "release_schedule.episode_linked",
          resourceType: "release_schedule",
          resourceId: input.scheduleId,
          changes: { episodeId: input.episodeId },
          correlationId: input.correlationId,
        },
      });
      return true;
    });
    return linked ? this.findSchedule(input.scheduleId) : null;
  }

  async listReviewQueue(reviewerId: string) {
    const schedules = await prisma.releaseSchedule.findMany({
      where: {
        status: { in: ["SCHEDULED", "BLOCKED"] },
        reviews: { some: { status: "IN_REVIEW" } },
        assignments: {
          none: { moderatorId: reviewerId, removedAt: null },
        },
      },
      include: scheduleInclude,
      orderBy: { productionDeadline: "asc" },
    });
    return schedules.map(asSchedule);
  }

  async issueDueReminders(from: Date, to: Date): Promise<number> {
    const schedules = await prisma.releaseSchedule.findMany({
      where: {
        status: { in: ["SCHEDULED", "BLOCKED"] },
        productionDeadline: { gt: from, lte: to },
      },
      select: {
        id: true,
        title: true,
        version: true,
        productionDeadline: true,
        assignments: {
          where: { removedAt: null },
          select: { moderatorId: true },
        },
      },
    });
    let issued = 0;
    for (const schedule of schedules) {
      for (const assignment of schedule.assignments) {
        issued += await prisma.$transaction(async (tx) => {
          const created = await tx.releaseReminder.createMany({
            data: [{
              scheduleId: schedule.id,
              moderatorId: assignment.moderatorId,
              scheduleVersion: schedule.version,
              message: `Nhiệm vụ “${schedule.title}” sắp đến hạn sản xuất`,
            }],
            skipDuplicates: true,
          });
          if (!created.count) return 0;
          await tx.auditLog.create({
            data: {
              actorId: null,
              actorType: "SYSTEM",
              action: "release.reminder_sent",
              resourceType: "release_schedule",
              resourceId: schedule.id,
              changes: {
                moderatorId: assignment.moderatorId,
                productionDeadline: schedule.productionDeadline.toISOString(),
                scheduleVersion: schedule.version,
              },
              correlationId: `reminder:${schedule.id}:${schedule.version}`,
            },
          });
          return 1;
        });
      }
    }
    return issued;
  }

  async listProductionReminders(moderatorId: string) {
    const reminders = await prisma.releaseReminder.findMany({
      where: { moderatorId },
      include: {
        schedule: {
          select: {
            title: true,
            productionDeadline: true,
            scheduledAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return reminders.map(({ schedule, ...reminder }) => ({
      id: reminder.id,
      scheduleId: reminder.scheduleId,
      message: reminder.message,
      createdAt: reminder.createdAt,
      title: schedule.title,
      productionDeadline: schedule.productionDeadline,
      scheduledAt: schedule.scheduledAt,
    }));
  }
}
