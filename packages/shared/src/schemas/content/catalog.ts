import { z } from "zod";
import { HistoricalYearSchema, PaginationQuerySchema } from "../common";

export const SourceTierSchema = z.enum([
  "TIER_1_CHINH_SU",
  "TIER_2_KHAO_CO",
  "TIER_3_KHOA_HOC",
  "TIER_4_DA_SU",
]);
export const HistoricalEntityTypeSchema = z.enum(["FIGURE", "EVENT"]);

export const SourceInputSchema = z.object({
  tier: SourceTierSchema,
  title: z.string().trim().min(1).max(500),
  originalTitle: z.string().trim().max(500).nullish(),
  author: z.string().trim().max(255).nullish(),
  translator: z.string().trim().max(255).nullish(),
  publisher: z.string().trim().max(255).nullish(),
  publicationYear: z.number().int().nullish(),
  edition: z.string().trim().max(100).nullish(),
  isbn: z.string().trim().max(32).nullish(),
  url: z.string().url().nullish(),
});
export const PatchSourceSchema = SourceInputSchema.partial();
export const SourceQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().optional(),
  tier: SourceTierSchema.optional(),
  includeArchived: z.preprocess(
    (value) => value === "true" ? true : value === "false" ? false : value,
    z.boolean().default(false)
  ),
});

export const HistoricalEntityInputSchema = z.object({
  entityType: HistoricalEntityTypeSchema,
  name: z.string().trim().min(1).max(255),
  aliases: z.array(z.string().trim().min(1).max(255)).default([]),
  startYear: HistoricalYearSchema.nullish(),
  endYear: HistoricalYearSchema.nullish(),
  summary: z.string().trim().max(5000).nullish(),
});
export const PatchHistoricalEntitySchema = HistoricalEntityInputSchema.partial();
export const HistoricalEntityQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().optional(),
  type: HistoricalEntityTypeSchema.optional(),
});

export const HistoricalPeriodSchema = z.object({
  id: z.string().uuid(), slug: z.string(), name: z.string(),
  startYear: z.number().int().nullable(), endYear: z.number().int().nullable(),
});
export const EpisodeSourceSchema = z.object({
  id: z.string().uuid(), sortOrder: z.number().int(), locator: z.string(), excerpt: z.string().nullable(), origin: z.enum(["AI", "MODERATOR"]),
  source: z.object({ id: z.string().uuid(), tier: SourceTierSchema, title: z.string(), author: z.string().nullable(), publicationYear: z.number().int().nullable(), url: z.string().nullable() }),
});
export type HistoricalPeriodDto = z.infer<typeof HistoricalPeriodSchema>;
export type EpisodeSourceDto = z.infer<typeof EpisodeSourceSchema>;
