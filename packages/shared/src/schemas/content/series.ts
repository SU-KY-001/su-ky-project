import { z } from "zod";
import {
  ContentStatusSchema,
  HistoricalYearSchema,
  PaginationQuerySchema,
} from "../common";

const nullableUuid = z.string().uuid().nullable();
export const DEFAULT_SERIES_LANGUAGE = "vi";
const MAX_LANGUAGE_TAG_CHARS = 35;
/** BCP 47 shape (primary subtag + optional subtags), e.g. `vi`, `en-US`. */
export const LanguageTagSchema = z
  .string()
  .trim()
  .max(MAX_LANGUAGE_TAG_CHARS)
  .regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "Mã ngôn ngữ không hợp lệ (ví dụ vi, en-US)");
const seriesFields = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(280).optional(),
  description: z.string().trim().max(5000).nullish(),
  language: LanguageTagSchema.optional(),
  topicId: nullableUuid.optional(),
  historicalPhaseId: nullableUuid.optional(),
  primaryHistoricalEventId: nullableUuid.optional(),
  startYear: HistoricalYearSchema.nullish(),
  endYear: HistoricalYearSchema.nullish(),
  coverImageAssetId: nullableUuid.optional(),
  coverLandscapeAssetId: nullableUuid.optional(),
});
const validYearRange = (value: {
  startYear?: number | null;
  endYear?: number | null;
}) =>
  value.startYear == null ||
  value.endYear == null ||
  value.startYear <= value.endYear;
export const CreateSeriesSchema = seriesFields.refine(validYearRange, {
  path: ["endYear"],
  message: "endYear must be at least startYear",
});
export const PatchSeriesSchema = seriesFields
  .partial()
  .extend({ baseUpdatedAt: z.coerce.date().optional() })
  .refine(validYearRange, {
    path: ["endYear"],
    message: "endYear must be at least startYear",
  });
export const SeriesQuerySchema = PaginationQuerySchema.extend({
  status: z.union([ContentStatusSchema, z.literal("TRASH")]).optional(),
  q: z.string().trim().optional(),
  ownerId: z.string().optional(),
});
export const EpisodeOrderSchema = z.object({
  episodeIds: z.array(z.string().uuid()),
  baseUpdatedAt: z.coerce.date().optional(),
});
export const CreateSeriesSourceSchema = z
  .object({
    sourceId: z.string().uuid().optional(),
    historicalCitationId: z.string().uuid().optional(),
    locator: z.string().trim().max(255).optional(),
    excerpt: z.string().trim().nullish(),
  })
  .superRefine((v, c) => {
    if (!v.sourceId && !v.historicalCitationId)
      c.addIssue({
        code: "custom",
        message: "Cần nguồn hoặc trích dẫn lịch sử",
      });
    if (
      v.historicalCitationId &&
      (v.sourceId || v.locator !== undefined || v.excerpt !== undefined)
    )
      c.addIssue({
        code: "custom",
        message:
          "Trích dẫn lịch sử phải lấy nguyên nguồn và vị trí từ danh mục",
      });
  });
export const PublishContentSchema = z.object({
  baseUpdatedAt: z.coerce.date(),
});
export const PublicationEvidenceSchema = z.object({
  asOf: z.string(),
  event: z.object({
    id: z.string(),
    version: z.number(),
    name: z.string(),
    slug: z.string(),
    time: z.unknown(),
  }),
  sources: z.array(
    z.object({
      id: z.string(),
      sourceRevisionId: z.string(),
      sourceVersion: z.number(),
      locator: z.string(),
      excerpt: z.string().nullable(),
      verifiedAt: z.string().nullable(),
      source: z.object({
        title: z.string(),
        tier: z.string(),
        author: z.string().nullable(),
        publisher: z.string().nullable(),
        publicationYear: z.number().nullable(),
        edition: z.string().nullable(),
        isbn: z.string().nullable(),
        url: z.string().nullable(),
      }),
      file: z
        .object({
          assetId: z.string(),
          publicId: z.string(),
          kind: z.literal("DOCUMENT"),
          version: z.string().nullable(),
          format: z.string().nullable(),
        })
        .nullable(),
    }),
  ),
});
export type PublicationEvidenceDto = z.infer<typeof PublicationEvidenceSchema>;
export const PatchSeriesSourceSchema = z.object({
  locator: z.string().trim().max(255).optional(),
  excerpt: z.string().trim().nullish(),
});
export const SeriesSourceOrderSchema = z.object({
  seriesSourceIds: z.array(z.string().uuid()),
});
