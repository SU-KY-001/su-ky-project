import { z } from "zod";

export const PodcastRankingQuerySchema = z.object({
  scope: z.enum(["personal", "system"]).default("personal"),
  period: z.enum(["week", "month"]).default("week"),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(4),
}).strict();
export const PodcastRankingResponseSchema = z.object({
  scope: z.enum(["personal", "system"]), period: z.enum(["week", "month"]),
  window: z.object({ start: z.coerce.date(), end: z.coerce.date(), timezone: z.literal("Asia/Ho_Chi_Minh") }),
  page: z.number().int(), limit: z.number().int(), total: z.number().int().nonnegative(),
  items: z.array(z.object({ rank: z.number().int().positive(), episodeId: z.string().uuid(), episodeSlug: z.string(), title: z.string(), seriesSlug: z.string(), seriesTitle: z.string(), listenCount: z.number().int().positive() })),
});
export type PodcastRankingQuery = z.infer<typeof PodcastRankingQuerySchema>;
export type PodcastRankingResponse = z.infer<typeof PodcastRankingResponseSchema>;
