import { z } from "zod";
import { PaginationQuerySchema } from "./common";
import { UserRoleEnum } from "./auth";

export const AdminUserQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(255).optional(),
  role: UserRoleEnum.optional(),
  status: z.enum(["active", "banned"]).optional(),
});

export const AdminCreateUserSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  role: UserRoleEnum.default("user"),
});

export const AdminUpdateUserSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  role: UserRoleEnum.optional(),
});

export const AdminBanUserSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const AdminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: UserRoleEnum,
  banned: z.boolean(),
  banReason: z.string().nullable(),
  banExpires: z.coerce.date().nullable(),
  totalXp: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const AdminDashboardSchema = z.object({
  users: z.object({
    total: z.number().int(),
    active: z.number().int(),
    banned: z.number().int(),
    moderators: z.number().int(),
  }),
  content: z.object({
    series: z.number().int(),
    episodes: z.number().int(),
    publishedSeries: z.number().int(),
    publishedEpisodes: z.number().int(),
  }),
  listening: z.object({
    totalListeners: z.number().int(),
    completedEpisodes: z.number().int(),
    progressUpdates: z.number().int(),
  }),
  operations: z.object({
    auditEventsLast7Days: z.number().int(),
    activeMissionTemplates: z.number().int(),
    weeklyMissions: z.number().int(),
  }),
});

export const AdminAuditQuerySchema = PaginationQuerySchema.extend({
  actorId: z.string().optional(),
  action: z.string().trim().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const AdminAuditLogSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  changes: z.unknown(),
  ipAddress: z.string().nullable(),
  createdAt: z.coerce.date(),
  actor: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string().nullable(),
    })
    .nullable(),
});

export const AdminConfigUpdateSchema = z.object({ value: z.unknown() });
export const AdminConfigSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  defaultValue: z.unknown(),
  description: z.string().nullable(),
  source: z.enum(["database", "default"]),
  updatedAt: z.coerce.date().nullable(),
  updatedBy: z.object({ id: z.string(), name: z.string() }).nullable(),
});

export const AdminContentQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(255).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN", "DELETED"]).optional(),
});
export const AdminContentActionSchema = z.object({
  action: z.enum(["hide", "trash", "restore"]),
});
export const AdminContentEpisodeSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]),
  deletedAt: z.coerce.date().nullable(),
  adminLockedAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date(),
});
export const AdminContentSeriesSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]),
  deletedAt: z.coerce.date().nullable(),
  adminLockedAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date(),
  owner: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
  episodes: z.array(AdminContentEpisodeSchema),
});

export const AdminCatalogQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(255).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
export const AdminTopicInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  sortOrder: z.number().int().min(0).max(32767).default(0),
  isActive: z.boolean().default(true),
});
export const AdminTopicPatchSchema = AdminTopicInputSchema.partial();
export const AdminTopicSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
const adminYear = z.number().int().max(1945).nullable();
const AdminHistoricalPeriodBaseSchema = z.object({
  name: z.string().trim().min(1).max(255),
  summary: z.string().trim().max(5000).nullable().optional(),
  startYear: adminYear.default(null),
  endYear: adminYear.default(null),
  sortOrder: z.number().int().min(0).max(32767).default(0),
  isActive: z.boolean().default(true),
});
const validAdminPeriod = (value: {
  startYear?: number | null;
  endYear?: number | null;
}) =>
  value.startYear == null ||
  value.endYear == null ||
  value.startYear <= value.endYear;
export const AdminHistoricalPeriodInputSchema =
  AdminHistoricalPeriodBaseSchema.refine(validAdminPeriod, {
    path: ["endYear"],
    message: "Năm kết thúc phải lớn hơn hoặc bằng năm bắt đầu",
  });
export const AdminHistoricalPeriodPatchSchema =
  AdminHistoricalPeriodBaseSchema.partial().refine(validAdminPeriod, {
    path: ["endYear"],
    message: "Năm kết thúc phải lớn hơn hoặc bằng năm bắt đầu",
  });
export const AdminHistoricalPeriodSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  summary: z.string().nullable(),
  startYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const MissionActivityTypeSchema = z.enum([
  "COMPLETE_EPISODE",
  "PASS_QUIZ",
]);
export const MissionTemplateInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).nullable().optional(),
  activityType: MissionActivityTypeSchema,
  targetCount: z.number().int().positive(),
  xpReward: z.number().int().nonnegative(),
});
export const MissionTemplatePatchSchema =
  MissionTemplateInputSchema.partial().extend({
    isActive: z.boolean().optional(),
  });
export const ActivateWeeklyMissionSchema = z.object({
  missionTemplateId: z.string().uuid(),
  weekStartDate: z.coerce.date(),
});
export const AdminMissionTemplateSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  activityType: MissionActivityTypeSchema,
  targetCount: z.number().int(),
  xpReward: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
// passthrough: the list endpoint also embeds the source template and a `_count` of participants.
export const AdminWeeklyMissionSchema = z
  .object({
    id: z.string().uuid(),
    missionTemplateId: z.string().uuid(),
    weekStartDate: z.coerce.date(),
    title: z.string(),
    activityType: MissionActivityTypeSchema,
    targetCount: z.number().int(),
    xpReward: z.number().int(),
    activatedAt: z.coerce.date(),
  })
  .passthrough();

export type AdminUserDto = z.infer<typeof AdminUserSchema>;
export type AdminDashboardDto = z.infer<typeof AdminDashboardSchema>;
