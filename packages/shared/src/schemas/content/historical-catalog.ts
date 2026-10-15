import { z } from "zod";
import { PaginationQuerySchema } from "../common";
import { HistoricalTimeSchema } from "../historical-time";
import { HistoricalEntityTypeSchema, SourceTierSchema } from "./catalog";

export const HistoricalReviewStatusSchema = z.enum([
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "CHANGES_REQUESTED",
]);
export const SourceVerificationStatusSchema = z.enum([
  "PENDING",
  "VERIFIED",
  "REJECTED",
]);
export const BaseVersionSchema = z.object({
  baseVersion: z.number().int().positive(),
});
const text = z.string().trim().min(1).max(255);
export const HistoricalNodeInputSchema = z.object({
  name: text,
  summary: z.string().trim().max(5000).default(""),
  time: HistoricalTimeSchema,
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(32767).default(0),
});
const taxonomyTime = (value: { time?: z.infer<typeof HistoricalTimeSchema> }) =>
  !value.time ||
  value.time.kind === "UNKNOWN" ||
  (value.time.kind === "RANGE" &&
    (!value.time.start || value.time.start.precision === "YEAR") &&
    (!value.time.end ||
      (value.time.end.precision === "YEAR" &&
        value.time.end.year < 2147483647)));
export const CreateHistoricalPeriodSchema = HistoricalNodeInputSchema.refine(
  taxonomyTime,
  { path: ["time"], message: "Thời kỳ sử dụng khoảng năm" },
);
export const PatchHistoricalPeriodSchema = HistoricalNodeInputSchema.partial()
  .extend({ baseVersion: z.number().int().positive() })
  .refine(taxonomyTime, {
    path: ["time"],
    message: "Thời kỳ sử dụng khoảng năm",
  });
export const CreateHistoricalPhaseSchema = HistoricalNodeInputSchema.extend({
  periodId: z.string().uuid(),
}).refine(taxonomyTime, {
  path: ["time"],
  message: "Giai đoạn sử dụng khoảng năm",
});
export const PatchHistoricalPhaseSchema = HistoricalNodeInputSchema.partial()
  .extend({
    periodId: z.string().uuid().optional(),
    baseVersion: z.number().int().positive(),
  })
  .refine(taxonomyTime, {
    path: ["time"],
    message: "Giai đoạn sử dụng khoảng năm",
  });
const bool = z.preprocess(
  (v) => (v === "true" ? true : v === "false" ? false : v),
  z.boolean(),
);
export const HistoricalCatalogQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().optional(),
  includeDeleted: bool.default(false),
  includePhases: bool.default(true),
  periodId: z.string().uuid().optional(),
  historicalPhaseId: z.string().uuid().optional(),
  type: HistoricalEntityTypeSchema.optional(),
  reviewStatus: HistoricalReviewStatusSchema.optional(),
});
export const HistoricalCitationInputSchema = z.object({
  sourceId: z.string().uuid(),
  locator: z.string().trim().max(255).default(""),
  excerpt: z.string().trim().max(10000).nullish(),
  note: z.string().trim().max(2000).nullish(),
  baseVersion: z.number().int().positive(),
});
export const PatchHistoricalCitationSchema =
  HistoricalCitationInputSchema.partial().extend({
    baseVersion: z.number().int().positive(),
  });
export const SubmitHistoricalReviewSchema = BaseVersionSchema.extend({
  expectedStatus: HistoricalReviewStatusSchema,
});
export const HistoricalEntityReviewSchema = SubmitHistoricalReviewSchema.extend(
  {
    decision: z.enum(["APPROVE", "REQUEST_CHANGES"]),
    note: z.string().trim().min(1).max(2000),
  },
);
export const SourceReviewSchema = BaseVersionSchema.extend({
  expectedStatus: SourceVerificationStatusSchema,
  decision: z.enum(["VERIFY", "REJECT"]),
  note: z.string().trim().min(1).max(2000),
});
export const HistoricalReadinessSchema = z.object({
  ready: z.boolean(),
  reasons: z.array(z.string()),
});
const timestamp = z.coerce.date();
const parent = z.object({ id: z.string().uuid(), name: z.string() });
export const CatalogSourceSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    tier: SourceTierSchema,
    author: z.string().nullable(),
    publisher: z.string().nullable(),
    publicationYear: z.number().nullable(),
    edition: z.string().nullable(),
    isbn: z.string().nullable(),
    url: z.string().nullable(),
    fileAssetId: z.string().uuid().nullable(),
    version: z.number().int(),
    verificationStatus: SourceVerificationStatusSchema,
    verifiedVersion: z.number().int().nullable(),
    verifiedAt: timestamp.nullable(),
    verificationNote: z.string().nullable(),
    createdById: z.string().nullable(),
    archivedAt: timestamp.nullable(),
    file: z
      .object({
        assetId: z.string(),
        url: z.string(),
        format: z.string().nullable(),
        sizeBytes: z.number().nullable(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();
export const HistoricalCitationSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  sourceRevisionId: z.string().uuid(),
  sourceVersion: z.number(),
  currentSourceVersion: z.number(),
  locator: z.string(),
  excerpt: z.string().nullable(),
  note: z.string().nullable(),
  sortOrder: z.number(),
  outdated: z.boolean(),
  source: CatalogSourceSchema,
});
const nodeFields = {
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  summary: z.string().nullable(),
  time: HistoricalTimeSchema,
  timeLabel: z.string(),
  startYear: z.number().nullable(),
  endYear: z.number().nullable(),
  version: z.number().int(),
  deletedAt: timestamp.nullable(),
  createdById: z.string().nullable(),
  updatedAt: timestamp,
  childCount: z.number(),
  sourceCount: z.number(),
  citationCount: z.number(),
  podcastCount: z.number(),
  citations: z.array(HistoricalCitationSchema).default([]),
  warnings: z.array(z.string()).default([]),
};
export const HistoricalPhaseDetailSchema = z.object({
  ...nodeFields,
  periodId: z.string().uuid(),
  isActive: z.boolean(),
  period: parent.optional(),
});
export const HistoricalPeriodDetailSchema = z.object({
  ...nodeFields,
  isActive: z.boolean(),
  phases: z.array(HistoricalPhaseDetailSchema).default([]),
});
export const HistoricalEntityDetailSchema = z.object({
  ...nodeFields,
  entityType: HistoricalEntityTypeSchema,
  aliases: z.array(z.string()),
  historicalPhaseId: z.string().uuid().nullable(),
  historicalPhase: HistoricalPhaseDetailSchema.nullable(),
  reviewStatus: HistoricalReviewStatusSchema,
  reviewedVersion: z.number().nullable(),
  reviewedAt: timestamp.nullable(),
  reviewNote: z.string().nullable(),
  displayStatus: z.enum([
    "DRAFT",
    "MISSING_SOURCE",
    "NEEDS_REVIEW",
    "COMPLETE",
  ]),
  readiness: HistoricalReadinessSchema,
});
export const CatalogSummarySchema = z.object({
  periods: z.number(),
  phases: z.number(),
  events: z.number(),
  missingSources: z.number(),
  readyForPodcast: z.number(),
});
export const PublicHistoricalSourceSchema = CatalogSourceSchema.pick({
  id: true,
  title: true,
  tier: true,
  author: true,
  publisher: true,
  publicationYear: true,
  edition: true,
  isbn: true,
  url: true,
  file: true,
  verificationStatus: true,
  verifiedAt: true,
}).strip();
export const PublicHistoricalEventSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  summary: z.string(),
  time: HistoricalTimeSchema,
  timeLabel: z.string(),
  parent: z.object({ period: parent, phase: parent }),
  reviewedAt: timestamp,
  citations: z.array(
    z.object({
      locator: z.string(),
      excerpt: z.string().nullable(),
      source: PublicHistoricalSourceSchema,
    }),
  ),
});
export type PublicHistoricalEventDto = z.infer<
  typeof PublicHistoricalEventSchema
>;
export type HistoricalPeriodDetailDto = z.infer<
  typeof HistoricalPeriodDetailSchema
>;
export type HistoricalPhaseDetailDto = z.infer<
  typeof HistoricalPhaseDetailSchema
>;
export type HistoricalEntityDetailDto = z.infer<
  typeof HistoricalEntityDetailSchema
>;
export type HistoricalCitationDto = z.infer<typeof HistoricalCitationSchema>;
export type CatalogSourceDto = z.infer<typeof CatalogSourceSchema>;
export type HistoricalReadinessDto = z.infer<typeof HistoricalReadinessSchema>;
export type CatalogSummaryDto = z.infer<typeof CatalogSummarySchema>;
export interface CatalogActor {
  userId: string;
  role: string | null | undefined;
}
export interface Paged<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
