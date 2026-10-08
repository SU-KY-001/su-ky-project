import { z } from "zod";
import { ContentStatusSchema, HistoricalYearSchema, PaginationQuerySchema } from "../common";

const nullableUuid = z.string().uuid().nullable();
const seriesFields = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(280).optional(),
  description: z.string().trim().max(5000).nullish(),
  topicId: nullableUuid.optional(), historicalPeriodId: nullableUuid.optional(),
  startYear: HistoricalYearSchema.nullish(), endYear: HistoricalYearSchema.nullish(),
  coverImageAssetId: nullableUuid.optional(),
});
const validYearRange = (value: { startYear?: number | null; endYear?: number | null }) =>
  value.startYear == null || value.endYear == null || value.startYear <= value.endYear;
export const CreateSeriesSchema = seriesFields.refine(validYearRange, { path: ["endYear"], message: "endYear must be at least startYear" });
export const PatchSeriesSchema = seriesFields.partial().extend({ baseUpdatedAt: z.coerce.date().optional() }).refine(validYearRange, { path: ["endYear"], message: "endYear must be at least startYear" });
export const SeriesQuerySchema = PaginationQuerySchema.extend({
  status: z.union([ContentStatusSchema, z.literal("TRASH")]).optional(), q: z.string().trim().optional(), ownerId: z.string().optional(),
});
export const EpisodeOrderSchema = z.object({ episodeIds: z.array(z.string().uuid()), baseUpdatedAt: z.coerce.date().optional() });
