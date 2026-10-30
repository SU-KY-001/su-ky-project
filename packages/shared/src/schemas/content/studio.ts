import { z } from "zod";
import { ContentStatusSchema } from "../common";
import { SeriesSourceSchema, HistoricalEntityTypeSchema } from "./catalog";
import { AudioAnalysisSchema, EditorDocumentSchema } from "./editor-document";
import { DialogueSchema } from "./dialogue";
import { EpisodePosterSchema } from "./episode";
import { EpisodeReadinessSchema } from "./readiness";
import { PublicationApprovalSchema } from "./publication-review";
const uuid = z.string().uuid(),
  timestamp = z.coerce.date();
const LockSchema = z
  .object({ lockedAt: timestamp, lockedBy: z.string().nullable() })
  .nullable()
  .describe("Khoá của Admin; có khoá thì Moderator không sửa được");
const CoverSchema = z
  .object({ assetId: uuid, url: z.string().nullable() })
  .nullable();
const ChecklistItemSchema = z.object({ key: z.string(), ok: z.boolean() });

export const SeriesListItemSchema = z.object({
  id: uuid,
  title: z.string(),
  slug: z.string(),
  status: ContentStatusSchema,
  isDeleted: z.boolean(),
  lock: LockSchema,
  cover: CoverSchema,
  coverLandscape: CoverSchema,
  startYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  episodeCounts: z.object({
    published: z.number().int(),
    total: z.number().int(),
  }),
  updatedAt: timestamp,
});

export const SeriesDetailSchema = z.object({
  id: uuid,
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  language: z.string().describe("Ngôn ngữ nội dung (BCP 47), mặc định `vi`"),
  status: ContentStatusSchema,
  isDeleted: z.boolean(),
  lock: LockSchema,
  topic: z.object({ id: uuid, name: z.string() }).nullable(),
  primaryHistoricalEventId: uuid.nullable(),
  publicationEvidence: z.unknown().nullable(),
  historicalPhase: z
    .object({
      id: uuid,
      name: z.string(),
      period: z.object({ id: uuid, name: z.string() }),
    })
    .nullable()
    .describe("Giai đoạn; Thời kỳ suy ra qua `historicalPhase.period`"),
  startYear: z
    .number()
    .int()
    .nullable()
    .describe(
      "Năm bắt đầu (đóng, tính cả năm này). Âm = TCN, không có năm 0, không giới hạn trên",
    ),
  endYear: z
    .number()
    .int()
    .nullable()
    .describe(
      "Năm kết thúc (đóng, tính cả năm này; khác `endYear` của Giai đoạn là loại trừ)",
    ),
  cover: CoverSchema,
  coverLandscape: CoverSchema,
  owner: z
    .object({ id: z.string(), name: z.string() })
    .describe("Người chịu trách nhiệm nội dung của series (không có vai trò biên tập viên riêng)"),
  publishedAt: timestamp.nullable(),
  updatedAt: timestamp.describe(
    "Gửi lại làm `baseUpdatedAt` khi PATCH để phát hiện ghi đè",
  ),
  publishChecklist: z.object({
    ready: z.boolean(),
    items: z.array(ChecklistItemSchema),
  }),
  sources: z.array(SeriesSourceSchema),
  episodes: z.array(
    z.object({
      id: uuid,
      title: z.string(),
      slug: z.string(),
      sortOrder: z.number().int(),
      status: ContentStatusSchema,
      poster: EpisodePosterSchema.nullable().optional(),
      progress: z.object({
        hasThirdPersonScript: z.boolean(),
        hasThirdPersonAudio: z.boolean(),
        isPublished: z.boolean(),
      }),
    }),
  ),
});

export const SeriesEpisodeListSchema = SeriesDetailSchema.shape.episodes;

/** Server-side reading speed, so every client estimates duration from the same `script.words_per_minute`. */
export const ScriptConfigSchema = z.object({ wordsPerMinute: z.number().int().positive() });
export type ScriptConfig = z.infer<typeof ScriptConfigSchema>;

export const NarrationSchema = z.object({
  id: uuid,
  type: z.enum(["THIRD_PERSON", "FIRST_PERSON"]),
  narrator: z.object({ id: uuid, name: z.string() }).nullable(),
  scriptContent: z.string().nullable(),
  scriptDocument: EditorDocumentSchema.nullable(),
  dialogue: DialogueSchema.nullable(),
  audioAnalysis: AudioAnalysisSchema.nullable(),
  wordCount: z.number().int(),
  estimatedDurationMs: z.number().int(),
  audio: z
    .object({
      assetId: uuid,
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
    }),
  ),
  updatedAt: timestamp.describe("Gửi lại làm `baseUpdatedAt` khi PUT bản kể"),
});

export const EpisodeAttachmentSchema = z.object({
  id: uuid,
  fileName: z.string(),
  createdAt: timestamp,
  asset: z.object({
    assetId: uuid,
    format: z.string().nullable(),
    sizeBytes: z.number().int().nullable(),
    previewUrl: z.string().nullable(),
  }),
});

export const EntityTagSchema = z.object({
  id: uuid,
  status: z.enum(["SUGGESTED", "CONFIRMED", "REJECTED"]),
  origin: z.string(),
  entity: z.object({
    id: uuid,
    entityType: HistoricalEntityTypeSchema,
    name: z.string(),
  }),
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
  attachments: z.array(EpisodeAttachmentSchema),
  poster: EpisodePosterSchema.nullable().optional(),
  entityTags: z.array(EntityTagSchema),
  publishChecklist: z.object({
    ready: z.boolean(),
    items: z.array(ChecklistItemSchema),
    warnings: z.array(
      z.object({ key: z.string(), count: z.number().int().optional() }),
    ),
  }),
  readiness: EpisodeReadinessSchema,
  /** Approval covering the current revision (review or admin exception); null when none exists or it is for an older revision. */
  publicationApproval: PublicationApprovalSchema.nullable(),
});

export type StudioSeriesDetailDto = z.infer<typeof SeriesDetailSchema>;
export type StudioSeriesListItemDto = z.infer<typeof SeriesListItemSchema>;
export type EpisodeWorkspaceDto = z.infer<typeof EpisodeWorkspaceSchema>;
export type EpisodeAttachmentDto = z.infer<typeof EpisodeAttachmentSchema>;
