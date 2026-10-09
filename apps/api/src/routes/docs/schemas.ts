import { z } from "zod";
import {
  ContentStatusSchema,
  EpisodeSourceSchema,
  HistoricalEntityTypeSchema,
  SourceTierSchema,
  StepTypeSchema,
  WorkflowStatusSchema,
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
  ai: z.enum(["ready", "unavailable"]),
  uptimeSeconds: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
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
    session: z.object({ id: z.string(), userId: z.string(), expiresAt: timestamp, token: z.string() }).passthrough(),
    user: AuthUserSchema,
  })
  .nullable();

export const CurrentUserResponseSchema = z.object({
  user: AuthUserSchema.pick({ id: true, name: true, email: true, emailVerified: true, image: true, role: true }),
  session: z.object({ expiresAt: timestamp }),
});

export const MessageResponseSchema = z.object({ message: z.string() });

export const TopicSchema = z.object({ id: uuid, slug: z.string(), name: z.string() });

export const SourceDocSchema = z.object({
  id: uuid,
  tier: SourceTierSchema,
  title: z.string(),
  originalTitle: z.string().nullable(),
  author: z.string().nullable(),
  translator: z.string().nullable(),
  publisher: z.string().nullable(),
  publicationYear: z.number().int().nullable(),
  edition: z.string().nullable(),
  isbn: z.string().nullable(),
  url: z.string().nullable(),
  createdById: z.string().nullable(),
  archivedAt: timestamp.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const SourceWithUsageSchema = SourceDocSchema.extend({
  usageCount: z.number().int().nonnegative().describe("Số tập đang trích dẫn nguồn này"),
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

export const ItemsOf = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item) });
export const PagedOf = paginatedSchema;

const LockSchema = z
  .object({ lockedAt: timestamp, lockedBy: z.string().nullable() })
  .nullable()
  .describe("Khoá của Admin; có khoá thì Moderator không sửa được");
const CoverSchema = z.object({ assetId: uuid, url: z.string().nullable() }).nullable();
const ChecklistItemSchema = z.object({ key: z.string(), ok: z.boolean() });

export const SeriesListItemSchema = z.object({
  id: uuid,
  title: z.string(),
  slug: z.string(),
  status: ContentStatusSchema,
  isDeleted: z.boolean(),
  lock: LockSchema,
  cover: CoverSchema,
  startYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  episodeCounts: z.object({ published: z.number().int(), total: z.number().int() }),
  updatedAt: timestamp,
});

export const SeriesDetailSchema = z.object({
  id: uuid,
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  status: ContentStatusSchema,
  isDeleted: z.boolean(),
  lock: LockSchema,
  topic: z.object({ id: uuid, name: z.string() }).nullable(),
  historicalPeriod: z.object({ id: uuid, name: z.string() }).nullable(),
  startYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  cover: CoverSchema,
  owner: z.object({ id: z.string(), name: z.string() }),
  publishedAt: timestamp.nullable(),
  updatedAt: timestamp.describe("Gửi lại làm `baseUpdatedAt` khi PATCH để phát hiện ghi đè"),
  publishChecklist: z.object({ ready: z.boolean(), items: z.array(ChecklistItemSchema) }),
  episodes: z.array(
    z.object({
      id: uuid,
      title: z.string(),
      slug: z.string(),
      sortOrder: z.number().int(),
      status: ContentStatusSchema,
      progress: z.object({
        hasSource: z.boolean(),
        hasThirdPersonScript: z.boolean(),
        hasThirdPersonAudio: z.boolean(),
        isPublished: z.boolean(),
      }),
    })
  ),
  pendingAiRuns: z.array(
    z.object({
      runId: z.number().int(),
      status: WorkflowStatusSchema,
      awaitingStep: StepTypeSchema.nullable(),
      createdAt: timestamp,
    })
  ),
});

export const SeriesEpisodeListSchema = SeriesDetailSchema.shape.episodes;

export const NarrationSchema = z.object({
  id: uuid,
  type: z.enum(["THIRD_PERSON", "FIRST_PERSON"]),
  narrator: z.object({ id: uuid, name: z.string() }).nullable(),
  scriptContent: z.string().nullable(),
  wordCount: z.number().int(),
  estimatedDurationMs: z.number().int(),
  origin: z.union([
    z.object({ kind: z.literal("AI"), scriptPublicationId: z.number().int(), episodeNo: z.number().int() }),
    z.object({ kind: z.literal("MANUAL") }),
  ]),
  audio: z
    .object({
      assetId: uuid,
      provider: z.enum(["UPLOAD", "ELEVENLABS"]).nullable(),
      durationMs: z.number().int().nullable(),
      sizeBytes: z.number().int().nullable(),
      format: z.string().nullable(),
      previewUrl: z.string().nullable(),
      attachedAt: timestamp.nullable(),
    })
    .nullable(),
  warnings: z.array(
    z.object({
      key: z.enum(["SCRIPT_CHANGED_AFTER_AUDIO", "DURATION_MISMATCH"]),
      ratio: z.number().optional(),
    })
  ),
  updatedAt: timestamp.describe("Gửi lại làm `baseUpdatedAt` khi PUT bản kể"),
});

export const EntityTagSchema = z.object({
  id: uuid,
  status: z.enum(["SUGGESTED", "CONFIRMED", "REJECTED"]),
  origin: z.string(),
  entity: z.object({ id: uuid, entityType: HistoricalEntityTypeSchema, name: z.string() }),
});

export const EpisodeWorkspaceSchema = z.object({
  id: uuid,
  seriesId: uuid,
  seriesTitle: z.string(),
  seriesStatus: ContentStatusSchema,
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number().int(),
  status: ContentStatusSchema,
  isDeleted: z.boolean(),
  lock: LockSchema,
  publishedAt: timestamp.nullable(),
  updatedAt: timestamp,
  narrations: z.array(NarrationSchema),
  sources: z.array(EpisodeSourceSchema),
  entityTags: z.array(EntityTagSchema),
  publishChecklist: z.object({
    ready: z.boolean(),
    items: z.array(ChecklistItemSchema),
    warnings: z.array(z.object({ key: z.string(), count: z.number().int().optional() })),
  }),
});

export const AiOriginalSchema = z.object({ scriptContent: z.string() });

export const MediaUploadTicketSchema = z.object({
  assetId: uuid,
  upload: z.object({
    url: z.string().url().describe("Endpoint upload trực tiếp lên Cloudinary"),
    fields: z.record(z.string()).describe("Các field form-data phải gửi kèm file, đúng thứ tự không bắt buộc"),
  }),
  expiresAt: z.union([timestamp, z.number()]).describe("Thời điểm chữ ký hết hạn"),
});

export const MediaAssetSchema = z.object({
  assetId: uuid,
  kind: z.enum(["AUDIO", "IMAGE"]),
  status: z.enum(["PENDING", "READY", "DELETED"]),
  format: z.string().nullable(),
  sizeBytes: z.number().int().nullable(),
  durationMs: z.number().int().nullable(),
  createdAt: timestamp,
  verifiedAt: timestamp.nullable(),
  previewUrl: z.string().optional().describe("Chỉ có khi `status = READY`"),
});

export const WorkflowListResponseSchema = paginatedSchema(
  z.object({
    id: z.number().int().positive(),
    topic: z.string(),
    seriesId: uuid.nullable(),
    status: WorkflowStatusSchema,
    currentStep: StepTypeSchema.nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().nullable(),
  })
);

export const StepDecisionResultSchema = z
  .object({ stepType: StepTypeSchema, action: z.enum(["CONTINUE", "RERUN", "DIRECT_EDIT"]) })
  .passthrough();

export const CreatePublicationResponseSchema = z.object({ publicationId: z.number().int().positive() });

export const PublicationsResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      approvedVersionId: z.number().int().positive(),
      approvedById: z.string(),
      finalScript: z.string(),
      totalWords: z.number().int().nonnegative(),
      estimatedDurationSeconds: z.number().int().nonnegative(),
      publishedAt: z.string(),
    })
  ),
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
    })
  ),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});

const PublicCoverSchema = z.object({ url: z.string() }).nullable();
const PercentSchema = z.number().min(0).max(100).describe("Phần trăm đã nghe, 0–100");
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
  episodeCount: z.number().int(),
  publishedAt: timestamp.nullable(),
});

export const PublicSeriesDetailDocSchema = z.object({
  id: uuid,
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  cover: PublicCoverSchema,
  episodes: z.array(
    z.object({
      id: uuid,
      slug: z.string(),
      title: z.string(),
      sortOrder: z.number().int(),
      narrations: z.array(PublicNarrationSchema),
      viewer: z
        .object({
          isCompleted: z.boolean(),
          progress: z.array(
            z.object({ narrationId: uuid, positionMs: z.number().int(), completedAt: timestamp.nullable() })
          ),
        })
        .nullable()
        .describe("`null` khi chưa đăng nhập"),
    })
  ),
});

const EpisodeLinkSchema = z.object({ id: uuid, slug: z.string(), title: z.string() }).nullable();
const PublicEntitySchema = z.object({ id: uuid, entityType: HistoricalEntityTypeSchema, name: z.string() });

export const PublicEpisodeDetailDocSchema = z.object({
  id: uuid,
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  publishedAt: timestamp.nullable(),
  series: z.object({
    id: uuid,
    slug: z.string(),
    title: z.string(),
    startYear: z.number().int().nullable(),
    endYear: z.number().int().nullable(),
    cover: PublicCoverSchema,
  }),
  narrations: z.array(PublicNarrationSchema.extend({ narrator: PublicEntitySchema.nullable() })),
  sources: z.array(
    z.object({
      title: z.string(),
      author: z.string().nullable(),
      tier: SourceTierSchema,
      locator: z.string(),
      url: z.string().nullable(),
    })
  ),
  entities: z.array(PublicEntitySchema).describe("Chỉ thẻ thực thể đã được Moderator xác nhận"),
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
        })
      ),
    })
    .nullable()
    .describe("`null` khi chưa đăng nhập"),
});

export const ListeningProgressDocSchema = z.object({
  assetId: uuid,
  positionMs: z.number().int(),
  playedBitmap: z.string().describe("Bitmap base64, mỗi bit là một giây đã nghe"),
  playedSeconds: z.number().int(),
  percent: PercentSchema,
  completedAt: timestamp.nullable(),
});

export const PlaybackDocSchema = z.object({
  narrationId: uuid,
  episodeId: uuid,
  audio: z.object({ assetId: uuid, url: z.string(), mimeType: z.string(), durationMs: z.number().int() }),
  progress: ListeningProgressDocSchema.nullable().describe("`null` khi chưa nghe lần nào"),
  sync: z.object({
    intervalMs: z.number().int().describe("Chu kỳ client nên gọi đồng bộ tiến độ"),
    completionThreshold: z.number().describe("Tỉ lệ số giây đã nghe để tính là nghe xong (0–1)"),
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
      xpAwarded: z.number().int().describe("XP của lần hoàn thành này; 0 nếu tập đã được tính trước đó"),
      totalXp: z.number().int(),
      missions: z.array(
        z.object({
          id: uuid,
          title: z.string(),
          progress: z.number().int(),
          target: z.number().int(),
          completedNow: z.boolean(),
          xpAwarded: z.number().int(),
        })
      ),
    })
    .nullable()
    .describe("Chỉ có ở lần đồng bộ khiến tập chuyển sang hoàn thành; các lần khác là `null`"),
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
  })
);
