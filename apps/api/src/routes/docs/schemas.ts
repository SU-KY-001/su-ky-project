import { CatalogSourceSchema } from "@repo/shared";
import { z } from "zod";
import {
  ContentStatusSchema,
  EpisodeReviewStatusSchema,
  HistoricalEntityTypeSchema,
  ReleaseModeratorWorkloadSchema,
  ReleaseScheduleStatusSchema,
  ReleaseReassignmentTicketStatusSchema,
  SeriesSourceSchema,
  SourceTierSchema,
  paginatedSchema,
} from "@repo/shared";

/**
 * Response shapes for endpoints whose handlers build plain objects (content mappers,
 * services) rather than parsing through a shared zod schema. They exist only to describe
 * the contract in OpenAPI; keep them aligned with `content.mappers.ts`, `media.service.ts`
 * and `catalog.entity.ts` when those change.
 */

const uuid = z.string().uuid();
const timestamp = z.coerce.date();

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  service: z.string(),
  version: z.string(),
  runtime: z.string(),
  bunVersion: z.string(),
  database: z.enum(["connected", "disconnected"]),
  queue: z.enum(["running", "stopped"]),
  releaseWorker: z.enum(["running", "stale", "stopped"]),
  uptimeSeconds: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
});

export const ReleaseAssignmentDocSchema = z.object({
  scheduleId: uuid,
  moderatorId: z.string(),
  assignedById: z.string(),
  assignedAt: timestamp,
  removedAt: timestamp.nullable(),
  moderator: z.object({ id: z.string(), name: z.string(), email: z.string().email() }),
});

export const EpisodeReviewDocSchema = z.object({
  id: uuid,
  scheduleId: uuid,
  episodeId: uuid,
  revision: z.number().int().positive(),
  status: EpisodeReviewStatusSchema,
  submittedById: z.string(),
  submittedAt: timestamp,
  reviewedById: z.string().nullable(),
  reviewedAt: timestamp.nullable(),
  reviewNote: z.string().nullable(),
});

export const ReleaseScheduleDocSchema = z.object({
  id: uuid,
  episodeId: uuid.nullable(),
  title: z.string(),
  productionDeadline: timestamp,
  scheduledAt: timestamp,
  status: ReleaseScheduleStatusSchema,
  version: z.number().int().positive(),
  createdById: z.string(),
  publishedAt: timestamp.nullable(),
  cancelledAt: timestamp.nullable(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
  assignments: z.array(ReleaseAssignmentDocSchema),
  reviews: z.array(EpisodeReviewDocSchema),
  episode: z.object({
    id: uuid,
    title: z.string(),
    status: ContentStatusSchema,
    contentRevision: z.number().int().positive(),
    updatedAt: timestamp,
  }).nullable(),
  reassignmentTicket: z.object({
    id: uuid,
    status: ReleaseReassignmentTicketStatusSchema,
    reason: z.string(),
    decisionReason: z.string().nullable(),
    createdAt: timestamp,
    updatedAt: timestamp,
  }).nullable().optional(),
});

export const ReleaseProgressDocSchema = z.object({
  id: uuid,
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
  createdAt: timestamp,
});

export const ReleaseDashboardDocSchema = z.object({
  upcoming: z.number().int().nonnegative(),
  ready: z.number().int().nonnegative(),
  atRisk: z.number().int().nonnegative(),
  needsAttention: z.number().int().nonnegative(),
});

export const ReleaseModeratorWorkloadDocSchema = ReleaseModeratorWorkloadSchema;

export const ReleaseActionResultDocSchema = z.object({
  result: z.enum(["WAITING", "BLOCKED", "IGNORED", "RELEASED", "RETRY", "FAILED"]),
});

export const ReleaseStatusResultDocSchema = z.object({
  status: ReleaseScheduleStatusSchema,
});

export const AuthUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  image: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});

export const AuthSessionResultSchema = z.object({
  token: z.string().nullable().optional(),
  user: AuthUserSchema,
});

export const GetSessionResponseSchema = z
  .object({
    session: z
      .object({
        id: z.string(),
        userId: z.string(),
        expiresAt: timestamp,
        token: z.string(),
      })
      .passthrough(),
    user: AuthUserSchema,
  })
  .nullable();

export const CurrentUserResponseSchema = z.object({
  user: AuthUserSchema.pick({
    id: true,
    name: true,
    email: true,
    emailVerified: true,
    image: true,
    role: true,
  }),
  session: z.object({ expiresAt: timestamp }),
});

export const MessageResponseSchema = z.object({ message: z.string() });

export const TopicSchema = z.object({
  id: uuid,
  slug: z.string(),
  name: z.string(),
});

export const SourceDocSchema = CatalogSourceSchema;

export const SourceWithUsageSchema = SourceDocSchema.extend({
  historicalUsageCount: z.number().int().nonnegative(),
  usageCount: z
    .number()
    .int()
    .nonnegative()
    .describe("Số series đang trích dẫn nguồn này"),
});

export const HistoricalEntityDocSchema = z.object({
  id: uuid,
  entityType: HistoricalEntityTypeSchema,
  name: z.string(),
  slug: z.string(),
  aliases: z.array(z.string()),
  startYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  summary: z.string().nullable(),
  createdById: z.string().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const ItemsOf = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item) });
export const PagedOf = paginatedSchema;

export {
  SeriesListItemSchema,
  SeriesDetailSchema,
  SeriesEpisodeListSchema,
  NarrationSchema,
  EntityTagSchema,
  EpisodeWorkspaceSchema,
} from "@repo/shared";
export const MediaUploadTicketSchema = z.object({
  assetId: uuid,
  upload: z.object({
    url: z.string().url().describe("Endpoint upload trực tiếp lên Cloudinary"),
    fields: z
      .record(z.string())
      .describe(
        "Các field form-data phải gửi kèm file, đúng thứ tự không bắt buộc",
      ),
  }),
  expiresAt: z
    .union([timestamp, z.number()])
    .describe("Thời điểm chữ ký hết hạn"),
});

export const MediaAssetSchema = z.object({
  assetId: uuid,
  kind: z.enum(["AUDIO", "IMAGE", "DOCUMENT"]),
  status: z.enum(["PENDING", "READY", "DELETED"]),
  format: z.string().nullable(),
  sizeBytes: z.number().int().nullable(),
  durationMs: z.number().int().nullable(),
  createdAt: timestamp,
  verifiedAt: timestamp.nullable(),
  previewUrl: z.string().optional().describe("Chỉ có khi `status = READY`"),
});

export const HistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      episode: z.object({
        id: uuid,
        slug: z.string(),
        title: z.string(),
        available: z.boolean(),
        series: z.object({ slug: z.string(), title: z.string() }),
      }),
      lastListenedAt: timestamp,
      lastNarrationId: uuid,
      lastPositionMs: z.number().int(),
      percent: z.number(),
      isCompleted: z.boolean(),
    }),
  ),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});

const PublicCoverSchema = z.object({ url: z.string() }).nullable();
const PercentSchema = z
  .number()
  .min(0)
  .max(100)
  .describe("Phần trăm đã nghe, 0–100");
const PublicNarrationSchema = z.object({
  id: uuid.describe("Dùng cho playback và đồng bộ tiến độ"),
  type: z.enum(["THIRD_PERSON", "FIRST_PERSON"]),
  durationMs: z.number().int().nullable(),
  available: z.boolean().describe("`true` khi audio đã `READY`"),
});

export const PublicSeriesListItemDocSchema = z.object({
  id: uuid,
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  cover: PublicCoverSchema,
  coverLandscape: PublicCoverSchema,
  episodeCount: z.number().int(),
  publishedAt: timestamp.nullable(),
});

const PublicSeriesSourceDocSchema = z.object({
  publisher: z.string().nullable().optional(),
  edition: z.string().nullable().optional(),
  publicationYear: z.number().nullable().optional(),
  isbn: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  verifiedAt: z.string().nullable().optional(),
  sourceVersion: z.number().optional(),
  verificationStatus: z.enum(["PENDING", "VERIFIED", "WITHDRAWN"]),
  title: z.string(),
  author: z.string().nullable(),
  tier: SourceTierSchema,
  locator: z.string(),
  url: z.string().nullable(),
  fileUrl: z.string().nullable().describe("PDF đã upload của nguồn, nếu có"),
});

export const PublicSeriesDetailDocSchema = z.object({
  evidenceAsOf: z.string().nullable(),
  evidenceWarning: z
    .enum(["LEGACY_UNVERIFIED", "SOURCE_VERIFICATION_WITHDRAWN"])
    .nullable(),
  historicalEvent: z.unknown().optional(),
  id: uuid,
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  cover: PublicCoverSchema,
  coverLandscape: PublicCoverSchema,
  sources: z.array(PublicSeriesSourceDocSchema),
  episodes: z.array(
    z.object({
      id: uuid,
      slug: z.string(),
      title: z.string(),
      sortOrder: z.number().int(),
      description: z.string().nullable(),
      poster: PublicCoverSchema.describe("Poster IMAGE đã sẵn sàng; null nếu chưa có"),
      narrations: z.array(PublicNarrationSchema),
      viewer: z
        .object({
          isCompleted: z.boolean(),
          progress: z.array(
            z.object({
              narrationId: uuid,
              positionMs: z.number().int(),
              completedAt: timestamp.nullable(),
            }),
          ),
        })
        .nullable()
        .describe("`null` khi chưa đăng nhập"),
    }),
  ),
});

const EpisodeLinkSchema = z
  .object({ id: uuid, slug: z.string(), title: z.string() })
  .nullable();
const PublicEntitySchema = z.object({
  id: uuid,
  entityType: HistoricalEntityTypeSchema,
  name: z.string(),
});

export const PublicEpisodeDetailDocSchema = z.object({
  id: uuid,
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  publishedAt: timestamp.nullable(),
  series: z.object({
    evidenceAsOf: z.string().nullable(),
    evidenceWarning: z
      .enum(["LEGACY_UNVERIFIED", "SOURCE_VERIFICATION_WITHDRAWN"])
      .nullable(),
    historicalEvent: z.unknown().optional(),
    id: uuid,
    slug: z.string(),
    title: z.string(),
    startYear: z.number().int().nullable(),
    endYear: z.number().int().nullable(),
    cover: PublicCoverSchema,
    coverLandscape: PublicCoverSchema,
    sources: z
      .array(PublicSeriesSourceDocSchema)
      .describe("Trích dẫn thuộc series; mọi tập của series dùng chung"),
  }),
  narrations: z.array(
    PublicNarrationSchema.extend({ narrator: PublicEntitySchema.nullable() }),
  ),
  entities: z
    .array(PublicEntitySchema)
    .describe("Chỉ thẻ thực thể đã được Moderator xác nhận"),
  previousEpisode: EpisodeLinkSchema,
  nextEpisode: EpisodeLinkSchema,
  hasQuiz: z.boolean(),
  viewer: z
    .object({
      isCompleted: z.boolean(),
      progress: z.array(
        z.object({
          narrationId: uuid,
          positionMs: z.number().int(),
          percent: PercentSchema,
          completedAt: timestamp.nullable(),
        }),
      ),
    })
    .nullable()
    .describe("`null` khi chưa đăng nhập"),
});

export const ListeningProgressDocSchema = z.object({
  assetId: uuid,
  positionMs: z.number().int(),
  playedBitmap: z
    .string()
    .describe("Bitmap base64, mỗi bit là một giây đã nghe"),
  playedSeconds: z.number().int(),
  percent: PercentSchema,
  completedAt: timestamp.nullable(),
});

export const PlaybackDocSchema = z.object({
  narrationId: uuid,
  episodeId: uuid,
  audio: z.object({
    assetId: uuid,
    url: z.string(),
    mimeType: z.string(),
    durationMs: z.number().int(),
  }),
  progress: ListeningProgressDocSchema.nullable().describe(
    "`null` khi chưa nghe lần nào",
  ),
  sync: z.object({
    intervalMs: z
      .number()
      .int()
      .describe("Chu kỳ client nên gọi đồng bộ tiến độ"),
    completionThreshold: z
      .number()
      .describe("Tỉ lệ số giây đã nghe để tính là nghe xong (0–1)"),
  }),
});

export const ListeningProgressUpdateDocSchema = z.object({
  narrationId: uuid,
  positionMs: z.number().int(),
  playedSeconds: z.number().int(),
  percent: PercentSchema,
  completedAt: timestamp.nullable(),
  completion: z
    .object({
      xpAwarded: z
        .number()
        .int()
        .describe("XP của lần hoàn thành này; 0 nếu tập đã được tính trước đó"),
      totalXp: z.number().int(),
      missions: z.array(
        z.object({
          id: uuid,
          title: z.string(),
          progress: z.number().int(),
          target: z.number().int(),
          completedNow: z.boolean(),
          xpAwarded: z.number().int(),
        }),
      ),
    })
    .nullable()
    .describe(
      "Chỉ có ở lần đồng bộ khiến tập chuyển sang hoàn thành; các lần khác là `null`",
    ),
});

export const TimelineResponseSchema = ItemsOf(
  z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    startYear: z.number().int(),
    endYear: z.number().int().nullable().optional(),
    description: z.string(),
    episodesCount: z.number().int().optional(),
    seriesCount: z.number().int().optional(),
  }),
);
