import { z } from "zod";

export const PodcastCategoryEnum = z.enum([
  "quan-su",      // Quân sự & Chiến trận
  "van-hoa",      // Văn hóa & Tư tưởng
  "nhan-vat",     // Nhân vật & Giai thoại
  "dung-nuoc",    // Quá trình dựng nước & Nhà nước
]);

export type PodcastCategory = z.infer<typeof PodcastCategoryEnum>;

export const SeriesSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Series title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().default(""),
  coverImage: z.string().url().or(z.string()).default(""),
  periodId: z.string().uuid().nullable().optional(),
  category: PodcastCategoryEnum.default("dung-nuoc"),
  createdAt: z.date().or(z.string()).optional(),
});

export const EpisodeSchema = z.object({
  id: z.string().uuid().optional(),
  seriesId: z.string().uuid(),
  periodId: z.string().uuid().nullable().optional(),
  title: z.string().min(1, "Episode title is required"),
  slug: z.string().min(1, "Slug is required"),
  audioUrl: z.string().min(1, "Audio URL is required"),
  durationSeconds: z.number().int().positive().default(600),
  transcript: z.string().default(""),
  summary: z.string().default(""),
  orderNumber: z.number().int().default(1),
  playCount: z.number().int().default(0),
  publishedAt: z.date().or(z.string()).optional(),
});

export const EpisodeFilterQuerySchema = z.object({
  period: z.string().optional(),
  category: PodcastCategoryEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type SeriesDto = z.infer<typeof SeriesSchema>;
export type EpisodeDto = z.infer<typeof EpisodeSchema>;
export type EpisodeFilterQuery = z.infer<typeof EpisodeFilterQuerySchema>;
