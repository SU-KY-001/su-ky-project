import { z } from "zod";
import { PaginationQuerySchema } from "./common";

export const ReleaseScheduleStatusSchema = z.enum([
  "SCHEDULED",
  "READY_TO_PUBLISH",
  "PUBLISHING",
  "RELEASED",
  "BLOCKED",
  "FAILED",
  "CANCELLED",
]);

export const EpisodeReviewStatusSchema = z.enum([
  "DRAFT",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
]);

const scheduleFields = z.object({
  title: z.string().trim().min(1).max(255),
  episodeId: z.string().uuid().nullable().optional(),
  productionDeadline: z.coerce.date(),
  scheduledAt: z.coerce.date(),
});

const validScheduleRange = (value: { productionDeadline?: Date; scheduledAt?: Date }) =>
  !value.productionDeadline || !value.scheduledAt || value.productionDeadline < value.scheduledAt;

export const CreateReleaseScheduleSchema = scheduleFields.extend({
  moderatorIds: z.array(z.string().min(1).max(36)).min(1),
}).refine(validScheduleRange, {
  path: ["productionDeadline"],
  message: "Hạn sản xuất phải trước thời gian phát hành",
});

export const UpdateReleaseScheduleSchema = scheduleFields.partial().extend({
  baseUpdatedAt: z.coerce.date(),
}).refine(validScheduleRange, {
  path: ["productionDeadline"],
  message: "Hạn sản xuất phải trước thời gian phát hành",
});

export const ReplaceReleaseAssigneesSchema = z.object({
  moderatorIds: z.array(z.string().min(1).max(36)).min(1),
});

export const SubmitEpisodeReviewSchema = z.object({
  contentRevision: z.number().int().positive(),
});

export const LinkReleaseEpisodeSchema = z.object({
  episodeId: z.string().uuid(),
});

export const ReviewEpisodeSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVE"), contentRevision: z.number().int().positive(), reviewNote: z.string().trim().max(5000).nullish() }),
  z.object({ decision: z.literal("REQUEST_CHANGES"), contentRevision: z.number().int().positive(), reviewNote: z.string().trim().min(1).max(5000) }),
]);

export const ReleaseScheduleQuerySchema = PaginationQuerySchema.extend({
  status: ReleaseScheduleStatusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const ReleaseAssignmentSchema = z.object({
  scheduleId: z.string().uuid(),
  moderatorId: z.string(),
  assignedById: z.string(),
  assignedAt: z.coerce.date(),
  removedAt: z.coerce.date().nullable(),
  moderator: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
});

export const EpisodeReviewRecordSchema = z.object({
  id: z.string().uuid(),
  scheduleId: z.string().uuid(),
  episodeId: z.string().uuid(),
  revision: z.number().int().positive(),
  status: EpisodeReviewStatusSchema,
  submittedById: z.string(),
  submittedAt: z.coerce.date(),
  reviewedById: z.string().nullable(),
  reviewedAt: z.coerce.date().nullable(),
  reviewNote: z.string().nullable(),
});

export const ReleaseScheduleRecordSchema = z.object({
  id: z.string().uuid(),
  episodeId: z.string().uuid().nullable(),
  title: z.string(),
  productionDeadline: z.coerce.date(),
  scheduledAt: z.coerce.date(),
  status: ReleaseScheduleStatusSchema,
  version: z.number().int().positive(),
  createdById: z.string(),
  publishedAt: z.coerce.date().nullable(),
  cancelledAt: z.coerce.date().nullable(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  assignments: z.array(ReleaseAssignmentSchema),
  reviews: z.array(EpisodeReviewRecordSchema),
  episode: z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]),
    contentRevision: z.number().int().positive(),
    updatedAt: z.coerce.date(),
  }).nullable(),
});

export const ReleaseSchedulePageSchema = z.object({
  items: z.array(ReleaseScheduleRecordSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const ReleaseDashboardSchema = z.object({
  upcoming: z.number().int().nonnegative(),
  ready: z.number().int().nonnegative(),
  atRisk: z.number().int().nonnegative(),
  needsAttention: z.number().int().nonnegative(),
});

export const ReleaseProgressEventSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().nullable(),
  actorType: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  changes: z.unknown(),
  correlationId: z.string().nullable(),
  jobId: z.string().nullable(),
  fromStatus: z.string().nullable(),
  toStatus: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export const ReleaseProgressListSchema = z.object({
  items: z.array(ReleaseProgressEventSchema),
});

export const AssignedReleaseListSchema = z.object({
  items: z.array(ReleaseScheduleRecordSchema),
});

export const ReleaseModeratorListSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  })),
});

export const AssignableEpisodeListSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    seriesTitle: z.string(),
    contentRevision: z.number().int().positive(),
    updatedAt: z.coerce.date(),
  })),
});

export const ReleaseReminderListSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    scheduleId: z.string().uuid(),
    title: z.string(),
    message: z.string(),
    productionDeadline: z.coerce.date(),
    scheduledAt: z.coerce.date(),
    createdAt: z.coerce.date(),
  })),
});

export type ReleaseScheduleStatus = z.infer<typeof ReleaseScheduleStatusSchema>;
export type EpisodeReviewStatus = z.infer<typeof EpisodeReviewStatusSchema>;
export type CreateReleaseScheduleInput = z.infer<typeof CreateReleaseScheduleSchema>;
export type UpdateReleaseScheduleInput = z.infer<typeof UpdateReleaseScheduleSchema>;
export type SubmitEpisodeReviewInput = z.infer<typeof SubmitEpisodeReviewSchema>;
export type ReviewEpisodeInput = z.infer<typeof ReviewEpisodeSchema>;
export type ReleaseScheduleRecord = z.infer<typeof ReleaseScheduleRecordSchema>;
export type ReleaseProgressEvent = z.infer<typeof ReleaseProgressEventSchema>;
export type ReleaseDashboard = z.infer<typeof ReleaseDashboardSchema>;
