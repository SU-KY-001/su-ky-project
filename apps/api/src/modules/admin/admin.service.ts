import { Prisma, prisma } from "@repo/db";
import { z } from "zod";
import { DomainError } from "../../core/errors/domain-error";
import { writeAudit } from "../../core/audit";
import {
  SYSTEM_CONFIGS,
  resetSystemConfigCache,
} from "../../core/config/system-config";
import { auth } from "../auth";
import {
  fromLegacyYearRange,
  type MissionTemplatePatchSchema,
  type UserRole,
} from "@repo/shared";
import { insertWithUniqueSlug } from "../../core/slug";

type AuditContext = { actorId: string; ipAddress: string | null };

const DAY_MS = 24 * 60 * 60 * 1000;
const AUDIT_WINDOW_MS = 7 * DAY_MS;

/** Maps only the given Prisma error code to a domain error; anything else (DB down, timeout) propagates. */
async function mapPrismaError<T>(
  run: () => Promise<T>,
  code: "P2025" | "P2002",
  mapped: DomainError,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === code
    )
      throw mapped;
    throw error;
  }
}

const configDescriptions: Record<keyof typeof SYSTEM_CONFIGS, string> = {
  "xp.episode_completion": "XP nhận khi hoàn thành một Episode",
  "xp.quiz_pass": "XP nhận lần đầu khi vượt qua một Quiz",
  "listening.completion_ratio": "Tỷ lệ nội dung cần nghe để tính hoàn thành",
  "listening.sync_interval_ms": "Chu kỳ đồng bộ tiến trình nghe (ms)",
  "listening.max_playback_rate": "Tốc độ phát tối đa được chấp nhận",
  "listening.tolerance_intervals": "Số chu kỳ dung sai khi xác minh tiến trình",
  "media.audio.max_bytes": "Dung lượng audio tối đa",
  "media.audio.allowed_formats": "Định dạng audio được phép",
  "media.audio.allowed_mime_types": "MIME audio được phép",
  "media.document.max_bytes": "Dung lượng tài liệu tối đa",
  "media.document.allowed_formats": "Định dạng tài liệu được phép",
  "media.document.allowed_mime_types": "MIME tài liệu được phép",
  "media.image.max_bytes": "Dung lượng ảnh tối đa",
  "media.image.allowed_formats": "Định dạng ảnh được phép",
  "media.image.allowed_mime_types": "MIME ảnh được phép",
  "media.upload_ticket_ttl_seconds": "Thời hạn upload ticket (giây)",
  "media.cleanup_grace_hours": "Thời gian chờ trước khi dọn media mồ côi",
  "media.cleanup_batch_size": "Số media xử lý mỗi lượt dọn",
  "script.max_chars": "Số ký tự tối đa của kịch bản",
  "script.words_per_minute": "Tốc độ đọc dùng để ước lượng thời lượng",
  "narration.duration_mismatch_ratio": "Ngưỡng cảnh báo lệch thời lượng",
  "readiness.min_script_words": "Số từ tối thiểu của kịch bản trước khi cảnh báo quá ngắn",
  "slug.max_length": "Độ dài slug tối đa",
  "slug.max_attempts": "Số lần thử tạo slug duy nhất",
  "search.similar_candidate_limit": "Số kết quả tương tự tối đa",
  "idempotency.ttl_hours": "Thời hạn idempotency key (giờ)",
  "idempotency.lock_timeout_seconds": "Thời gian khóa request idempotent",
  "rate_limit.write": "Giới hạn thao tác ghi",
  "rate_limit.media_upload": "Giới hạn upload media",
  "rate_limit.listening_progress": "Giới hạn cập nhật tiến trình nghe",
  "rate_limit.ai_check": "Giới hạn AI rà kịch bản",
  "ai_assist.enabled": "Bật trợ lý AI",
};

export class AdminService {
  async dashboard() {
    const since = new Date(Date.now() - AUDIT_WINDOW_MS);
    const [
      total,
      active,
      banned,
      moderators,
      series,
      episodes,
      publishedSeries,
      publishedEpisodes,
      listeners,
      completed,
      progress,
      audit,
      templates,
      missions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { banned: false } }),
      prisma.user.count({ where: { banned: true } }),
      prisma.user.count({ where: { role: "moderator" } }),
      prisma.series.count({ where: { deletedAt: null } }),
      prisma.episode.count({ where: { deletedAt: null } }),
      prisma.series.count({ where: { status: "PUBLISHED", deletedAt: null } }),
      prisma.episode.count({ where: { status: "PUBLISHED", deletedAt: null } }),
      prisma.$queryRaw<
        Array<{ n: number }>
      >`SELECT COUNT(DISTINCT user_id)::int AS n FROM listening_progress`.then(
        ([row]) => row?.n ?? 0,
      ),
      prisma.listeningProgress.count({ where: { completedAt: { not: null } } }),
      prisma.listeningProgress.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
      prisma.missionTemplate.count({ where: { isActive: true } }),
      prisma.weeklyMission.count(),
    ]);
    return {
      users: { total, active, banned, moderators },
      content: { series, episodes, publishedSeries, publishedEpisodes },
      listening: {
        totalListeners: listeners,
        completedEpisodes: completed,
        progressUpdates: progress,
      },
      operations: {
        auditEventsLast7Days: audit,
        activeMissionTemplates: templates,
        weeklyMissions: missions,
      },
    };
  }

  async listUsers(query: {
    page: number;
    limit: number;
    q?: string;
    role?: UserRole;
    status?: "active" | "banned";
  }) {
    const where: Prisma.UserWhereInput = {
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { email: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { banned: query.status === "banned" } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.user.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }

  async createUser(
    input: { name: string; email: string; password: string; role: UserRole },
    audit: AuditContext,
  ) {
    if (await prisma.user.findUnique({ where: { email: input.email } }))
      throw new DomainError(409, "CONFLICT", "Email đã được sử dụng");
    // signUpEmail is Better Auth's own write and cannot join the Prisma transaction; only role + audit are atomic.
    await auth.api.signUpEmail({
      body: { name: input.name, email: input.email, password: input.password },
    });
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { email: input.email },
        data: { role: input.role },
      });
      await writeAudit(tx, {
        ...audit,
        action: "user.created",
        resourceType: "user",
        resourceId: user.id,
        changes: { name: user.name, email: user.email, role: user.role },
      });
      return user;
    });
  }

  async updateUser(
    id: string,
    input: { name?: string; role?: UserRole },
    audit: AuditContext,
  ) {
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current)
      throw new DomainError(404, "NOT_FOUND", "Không tìm thấy tài khoản");
    if (id === audit.actorId && input.role && input.role !== "admin")
      throw new DomainError(
        409,
        "CONFLICT",
        "Admin không thể tự hạ quyền của mình",
      );
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: input });
      await writeAudit(tx, {
        ...audit,
        action:
          input.role && input.role !== current.role
            ? "user.role_changed"
            : "user.updated",
        resourceType: "user",
        resourceId: id,
        changes: {
          before: { name: current.name, role: current.role },
          after: { name: user.name, role: user.role },
        },
      });
      return user;
    });
  }

  async banUser(
    id: string,
    input: { reason: string; expiresAt?: Date | null },
    audit: AuditContext,
  ) {
    if (id === audit.actorId)
      throw new DomainError(
        409,
        "CONFLICT",
        "Admin không thể tự khóa tài khoản của mình",
      );
    return mapPrismaError(
      () =>
        prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id },
            data: {
              banned: true,
              banReason: input.reason,
              banExpires: input.expiresAt ?? null,
            },
          });
          await tx.session.deleteMany({ where: { userId: id } });
          await writeAudit(tx, {
            ...audit,
            action: "user.banned",
            resourceType: "user",
            resourceId: id,
            changes: {
              reason: input.reason,
              expiresAt: input.expiresAt?.toISOString() ?? null,
            },
          });
          return user;
        }),
      "P2025",
      new DomainError(404, "NOT_FOUND", "Không tìm thấy tài khoản"),
    );
  }

  async unbanUser(id: string, audit: AuditContext) {
    return mapPrismaError(
      () =>
        prisma.$transaction(async (tx) => {
          const user = await tx.user.update({
            where: { id },
            data: { banned: false, banReason: null, banExpires: null },
          });
          await writeAudit(tx, {
            ...audit,
            action: "user.unbanned",
            resourceType: "user",
            resourceId: id,
            changes: {},
          });
          return user;
        }),
      "P2025",
      new DomainError(404, "NOT_FOUND", "Không tìm thấy tài khoản"),
    );
  }

  async listContent(query: {
    page: number;
    limit: number;
    q?: string;
    status?: "DRAFT" | "PUBLISHED" | "HIDDEN" | "DELETED";
  }) {
    const where: Prisma.SeriesWhereInput = {
      ...(query.q ? { title: { contains: query.q, mode: "insensitive" } } : {}),
      ...(query.status === "DELETED"
        ? { deletedAt: { not: null } }
        : query.status
          ? { status: query.status, deletedAt: null }
          : {}),
    };
    const [items, total] = await Promise.all([
      prisma.series.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          episodes: {
            select: {
              id: true,
              title: true,
              status: true,
              deletedAt: true,
              adminLockedAt: true,
              updatedAt: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.series.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }

  async interveneContent(
    kind: "series" | "episodes",
    id: string,
    action: "hide" | "trash" | "restore",
    audit: AuditContext,
  ) {
    const now = new Date();
    if (kind === "series") {
      const current = await prisma.series.findUnique({
        where: { id },
        include: {
          _count: { select: { episodes: { where: { deletedAt: null } } } },
        },
      });
      if (!current)
        throw new DomainError(404, "NOT_FOUND", "Không tìm thấy series");
      if (action === "trash" && current._count.episodes > 0)
        throw new DomainError(
          409,
          "HAS_DEPENDENCIES",
          "Không thể xóa series còn episode hoạt động",
        );
      const data: Prisma.SeriesUpdateInput =
        action === "hide"
          ? {
              status: "HIDDEN",
              adminLockedAt: now,
              adminLockedBy: { connect: { id: audit.actorId } },
            }
          : action === "trash"
            ? {
                deletedAt: now,
                statusBeforeDelete: current.status,
                adminLockedAt: now,
                adminLockedBy: { connect: { id: audit.actorId } },
              }
            : {
                deletedAt: null,
                status: current.statusBeforeDelete ?? "DRAFT",
                statusBeforeDelete: null,
                adminLockedAt: null,
                adminLockedBy: { disconnect: true },
              };
      return prisma.$transaction(async (tx) => {
        const row = await tx.series.update({ where: { id }, data });
        await writeAudit(tx, {
          ...audit,
          action: `content.series_${action}`,
          resourceType: "series",
          resourceId: id,
          changes: {
            before: { status: current.status, deletedAt: current.deletedAt },
            after: { status: row.status, deletedAt: row.deletedAt },
          },
        });
        return row;
      });
    }
    const current = await prisma.episode.findUnique({
      where: { id },
      include: { series: { select: { deletedAt: true } } },
    });
    if (!current)
      throw new DomainError(404, "NOT_FOUND", "Không tìm thấy episode");
    if (action === "restore" && current.series.deletedAt)
      throw new DomainError(
        409,
        "HAS_DEPENDENCIES",
        "Cần khôi phục series trước episode",
      );
    const data: Prisma.EpisodeUpdateInput =
      action === "hide"
        ? {
            status: "HIDDEN",
            adminLockedAt: now,
            adminLockedBy: { connect: { id: audit.actorId } },
          }
        : action === "trash"
          ? {
              deletedAt: now,
              statusBeforeDelete: current.status,
              adminLockedAt: now,
              adminLockedBy: { connect: { id: audit.actorId } },
            }
          : {
              deletedAt: null,
              status: current.statusBeforeDelete ?? "DRAFT",
              statusBeforeDelete: null,
              adminLockedAt: null,
              adminLockedBy: { disconnect: true },
            };
    return prisma.$transaction(async (tx) => {
      const row = await tx.episode.update({ where: { id }, data });
      await writeAudit(tx, {
        ...audit,
        action: `content.episode_${action}`,
        resourceType: "episode",
        resourceId: id,
        changes: {
          before: { status: current.status, deletedAt: current.deletedAt },
          after: { status: row.status, deletedAt: row.deletedAt },
        },
      });
      return row;
    });
  }

  async listTopics(query: {
    page: number;
    limit: number;
    q?: string;
    status?: "active" | "inactive";
  }) {
    const where: Prisma.TopicWhereInput = {
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
      ...(query.status ? { isActive: query.status === "active" } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.topic.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }

  async createTopic(
    input: { name: string; sortOrder: number; isActive: boolean },
    audit: AuditContext,
  ) {
    return prisma.$transaction(async (tx) => {
      let id = "";
      await insertWithUniqueSlug(input.name, async (slug) => {
        const result = await tx.topic.createMany({
          data: [{ ...input, slug, createdById: audit.actorId }],
          skipDuplicates: true,
        });
        if (!result.count) return false;
        id = (
          await tx.topic.findUniqueOrThrow({
            where: { slug },
            select: { id: true },
          })
        ).id;
        return true;
      });
      const row = await tx.topic.findUniqueOrThrow({ where: { id } });
      await writeAudit(tx, {
        ...audit,
        action: "topic.created",
        resourceType: "topic",
        resourceId: id,
        changes: { after: input },
      });
      return row;
    });
  }

  async patchTopic(
    id: string,
    input: { name?: string; sortOrder?: number; isActive?: boolean },
    audit: AuditContext,
  ) {
    const current = await prisma.topic.findUnique({ where: { id } });
    if (!current)
      throw new DomainError(404, "NOT_FOUND", "Không tìm thấy chủ đề");
    return prisma.$transaction(async (tx) => {
      const row = await tx.topic.update({ where: { id }, data: input });
      await writeAudit(tx, {
        ...audit,
        action: "topic.updated",
        resourceType: "topic",
        resourceId: id,
        changes: {
          before: current,
          after: row,
        } as unknown as Prisma.InputJsonValue,
      });
      return row;
    });
  }

  async listHistoricalPeriods(query: {
    page: number;
    limit: number;
    q?: string;
    status?: "active" | "inactive";
  }) {
    const where: Prisma.HistoricalPeriodWhereInput = {
      deletedAt: null,
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
      ...(query.status ? { isActive: query.status === "active" } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.historicalPeriod.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.historicalPeriod.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }

  async createHistoricalPeriod(
    input: {
      name: string;
      summary?: string | null;
      startYear: number | null;
      endYear: number | null;
      sortOrder: number;
      isActive: boolean;
    },
    audit: AuditContext,
  ) {
    const time = fromLegacyYearRange(
      { startYear: input.startYear, endYear: input.endYear },
      "CLOSED",
    ) as Prisma.InputJsonValue;
    return prisma.$transaction(async (tx) => {
      let id = "";
      await insertWithUniqueSlug(input.name, async (slug) => {
        const result = await tx.historicalPeriod.createMany({
          data: [{ ...input, slug, time, createdById: audit.actorId }],
          skipDuplicates: true,
        });
        if (!result.count) return false;
        id = (
          await tx.historicalPeriod.findUniqueOrThrow({
            where: { slug },
            select: { id: true },
          })
        ).id;
        return true;
      });
      const row = await tx.historicalPeriod.findUniqueOrThrow({
        where: { id },
      });
      await writeAudit(tx, {
        ...audit,
        action: "historical_period.created",
        resourceType: "historical_period",
        resourceId: id,
        changes: { after: input },
      });
      return row;
    });
  }

  async patchHistoricalPeriod(
    id: string,
    input: {
      name?: string;
      summary?: string | null;
      startYear?: number | null;
      endYear?: number | null;
      sortOrder?: number;
      isActive?: boolean;
    },
    audit: AuditContext,
  ) {
    const current = await prisma.historicalPeriod.findFirst({
      where: { id, deletedAt: null },
    });
    if (!current)
      throw new DomainError(404, "NOT_FOUND", "Không tìm thấy thời kỳ lịch sử");
    const startYear =
      input.startYear === undefined ? current.startYear : input.startYear;
    const endYear =
      input.endYear === undefined ? current.endYear : input.endYear;
    if (startYear !== null && endYear !== null && startYear > endYear)
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Năm kết thúc phải lớn hơn hoặc bằng năm bắt đầu",
      );
    return prisma.$transaction(async (tx) => {
      const row = await tx.historicalPeriod.update({
        where: { id },
        data: {
          ...input,
          time: fromLegacyYearRange(
            { startYear, endYear },
            "CLOSED",
          ) as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
      await writeAudit(tx, {
        ...audit,
        action: "historical_period.updated",
        resourceType: "historical_period",
        resourceId: id,
        changes: {
          before: current,
          after: row,
        } as unknown as Prisma.InputJsonValue,
      });
      return row;
    });
  }

  async listConfigs() {
    const rows = await prisma.systemConfig.findMany({
      include: { updatedBy: { select: { id: true, name: true } } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return Object.entries(SYSTEM_CONFIGS).map(([key, definition]) => {
      const row = byKey.get(key);
      return {
        key,
        value: row?.value ?? definition.defaultValue,
        defaultValue: definition.defaultValue,
        description:
          row?.description ??
          configDescriptions[key as keyof typeof SYSTEM_CONFIGS],
        source: row ? ("database" as const) : ("default" as const),
        updatedAt: row?.updatedAt ?? null,
        updatedBy: row?.updatedBy ?? null,
      };
    });
  }

  async updateConfig(key: string, value: unknown, audit: AuditContext) {
    if (!(key in SYSTEM_CONFIGS))
      throw new DomainError(
        404,
        "NOT_FOUND",
        "Cấu hình không được phép chỉnh sửa",
      );
    const definition = SYSTEM_CONFIGS[key as keyof typeof SYSTEM_CONFIGS];
    const parsed = (definition.schema as z.ZodType<unknown>).safeParse(value);
    if (!parsed.success)
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Giá trị cấu hình không hợp lệ",
      );
    const previous = await prisma.systemConfig.findUnique({ where: { key } });
    await prisma.$transaction(async (tx) => {
      await tx.systemConfig.upsert({
        where: { key },
        create: {
          key,
          value: parsed.data as Prisma.InputJsonValue,
          description: configDescriptions[key as keyof typeof SYSTEM_CONFIGS],
          updatedById: audit.actorId,
        },
        update: {
          value: parsed.data as Prisma.InputJsonValue,
          updatedById: audit.actorId,
        },
      });
      await writeAudit(tx, {
        ...audit,
        action: "system_config.updated",
        resourceType: "system_config",
        resourceId: key,
        changes: {
          before: previous?.value ?? null,
          after: parsed.data as Prisma.InputJsonValue,
        },
      });
    });
    resetSystemConfigCache();
    return (await this.listConfigs()).find((item) => item.key === key)!;
  }

  async listAudit(query: {
    page: number;
    limit: number;
    actorId?: string;
    action?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action
        ? { action: { contains: query.action, mode: "insensitive" } }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }

  listMissionTemplates() {
    return prisma.missionTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  }
  async createMissionTemplate(
    input: {
      title: string;
      description?: string | null;
      activityType: "COMPLETE_EPISODE" | "PASS_QUIZ";
      targetCount: number;
      xpReward: number;
    },
    audit: AuditContext,
  ) {
    return prisma.$transaction(async (tx) => {
      const row = await tx.missionTemplate.create({
        data: { ...input, createdById: audit.actorId },
      });
      await writeAudit(tx, {
        ...audit,
        action: "mission_template.created",
        resourceType: "mission_template",
        resourceId: row.id,
        changes: input,
      });
      return row;
    });
  }
  async patchMissionTemplate(
    id: string,
    input: z.infer<typeof MissionTemplatePatchSchema>,
    audit: AuditContext,
  ) {
    return mapPrismaError(
      () =>
        prisma.$transaction(async (tx) => {
          const row = await tx.missionTemplate.update({
            where: { id },
            data: input,
          });
          await writeAudit(tx, {
            ...audit,
            action: "mission_template.updated",
            resourceType: "mission_template",
            resourceId: id,
            changes: input as Prisma.InputJsonValue,
          });
          return row;
        }),
      "P2025",
      new DomainError(404, "NOT_FOUND", "Không tìm thấy mẫu nhiệm vụ"),
    );
  }
  listWeeklyMissions() {
    return prisma.weeklyMission.findMany({
      include: {
        missionTemplate: true,
        _count: { select: { userMissions: true } },
      },
      orderBy: { weekStartDate: "desc" },
    });
  }
  async activateWeeklyMission(
    input: { missionTemplateId: string; weekStartDate: Date },
    audit: AuditContext,
  ) {
    const { weekStartDate } = input;
    if (
      weekStartDate.getUTCDay() !== 1 ||
      weekStartDate.getTime() % DAY_MS !== 0
    )
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Tuần nhiệm vụ phải bắt đầu vào 00:00 UTC thứ Hai",
      );
    const template = await prisma.missionTemplate.findUnique({
      where: { id: input.missionTemplateId },
    });
    if (!template || !template.isActive)
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Mẫu nhiệm vụ không khả dụng",
      );
    return mapPrismaError(
      () =>
        prisma.$transaction(async (tx) => {
          const row = await tx.weeklyMission.create({
            data: {
              missionTemplateId: template.id,
              weekStartDate,
              title: template.title,
              activityType: template.activityType,
              targetCount: template.targetCount,
              xpReward: template.xpReward,
              activatedAt: new Date(),
              activatedById: audit.actorId,
            },
          });
          await writeAudit(tx, {
            ...audit,
            action: "weekly_mission.activated",
            resourceType: "weekly_mission",
            resourceId: row.id,
            changes: {
              missionTemplateId: template.id,
              weekStartDate: weekStartDate.toISOString(),
            },
          });
          return row;
        }),
      "P2002",
      new DomainError(
        409,
        "CONFLICT",
        "Mẫu nhiệm vụ đã được kích hoạt cho tuần này",
      ),
    );
  }
}
