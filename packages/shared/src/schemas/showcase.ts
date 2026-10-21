import { z } from "zod";
import { PublicSeriesListItemSchema } from "./listening";

const cover = z.object({ url: z.string() }).nullable();
export const LibrarySeriesSchema = PublicSeriesListItemSchema.extend({ cover, coverLandscape: cover });
export const LibraryNarrationSchema = z.object({ id: z.string().uuid(), type: z.enum(["FIRST_PERSON", "THIRD_PERSON"]), durationMs: z.number().nullable(), available: z.boolean() });
export const LibraryChapterSchema = z.object({ id: z.string().uuid(), slug: z.string(), title: z.string(), sortOrder: z.number(), narrations: z.array(LibraryNarrationSchema) });
export const LibrarySeriesDetailSchema = z.object({ id: z.string().uuid(), slug: z.string(), title: z.string(), description: z.string().nullable(), cover, episodes: z.array(LibraryChapterSchema), historicalEvent: z.object({ id: z.string(), name: z.string() }).optional() });
export const LibraryEpisodeSchema = z.object({ id: z.string().uuid(), slug: z.string(), title: z.string(), description: z.string().nullable(), hasQuiz: z.boolean(), narrations: z.array(LibraryNarrationSchema.extend({ narrator: z.object({ name: z.string() }).nullable() })) });
export const PublicHonorsQuerySchema = z.object({ period: z.enum(["week", "month"]).default("week") });
export const PublicHonorsSchema = z.object({ period: z.enum(["week", "month"]), from: z.coerce.date(), to: z.coerce.date(), items: z.array(z.object({ rank: z.number().int(), name: z.string(), image: z.string().nullable(), xp: z.number().int() })) });
export const PublicReleaseQuerySchema = z.object({ from: z.coerce.date(), to: z.coerce.date(), seriesId: z.string().uuid().optional() }).refine((v) => v.to > v.from && v.to.getTime() - v.from.getTime() <= 62 * 86400000, { message: "Khoảng lịch phải lớn hơn 0 và không quá 62 ngày" });
export const PublicReleasesSchema = z.object({ items: z.array(z.object({ id: z.string().uuid(), title: z.string(), scheduledAt: z.coerce.date(), released: z.boolean(), episodeSlug: z.string(), series: z.object({ id: z.string().uuid(), title: z.string(), slug: z.string() }) })) });
export type LibrarySeries = z.infer<typeof LibrarySeriesSchema>;
export type LibraryChapter = z.infer<typeof LibraryChapterSchema>;
export type LibraryNarration = z.infer<typeof LibraryNarrationSchema>;
