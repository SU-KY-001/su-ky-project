import { z } from "zod";

export const PlaylistPageQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(1000000).default(1), limit: z.coerce.number().int().min(1).max(50).default(4) }).strict();
export const PlaylistNameSchema = z.object({ name: z.string().trim().min(1).max(100) }).strict();
export const PlaylistIdSchema = z.object({ id: z.string().uuid() });
export const PlaylistItemParamSchema = PlaylistIdSchema.extend({ episodeId: z.string().uuid() });
export const AddPlaylistItemSchema = z.object({ episodeId: z.string().uuid() }).strict();
export const ReorderPlaylistSchema = z.object({ episodeIds: z.array(z.string().uuid()).max(500) }).strict().refine((value) => new Set(value.episodeIds).size === value.episodeIds.length, "Thứ tự không được trùng tập");
export const PlaylistSchema = z.object({ id: z.string().uuid(), name: z.string(), createdAt: z.coerce.date(), updatedAt: z.coerce.date(), itemCount: z.number().int().nonnegative() });
export const PlaylistListSchema = z.object({ items: z.array(PlaylistSchema), page: z.number().int(), limit: z.number().int(), total: z.number().int().nonnegative() });
export const PlaylistItemSchema = z.object({ episodeId: z.string().uuid(), position: z.number().int().nonnegative(), episodeSlug: z.string(), title: z.string(), seriesTitle: z.string(), seriesSlug: z.string(), available: z.boolean(), narrations: z.array(z.object({ id: z.string().uuid(), type: z.enum(["THIRD_PERSON", "FIRST_PERSON"]), durationMs: z.number().int().positive() })) });
export const PlaylistDetailSchema = z.object({ playlist: PlaylistSchema, items: z.array(PlaylistItemSchema), page: z.number().int(), limit: z.number().int(), total: z.number().int().nonnegative() });
export type PlaylistPageQuery = z.infer<typeof PlaylistPageQuerySchema>;
export type PlaylistDto = z.infer<typeof PlaylistSchema>;
export type PlaylistListDto = z.infer<typeof PlaylistListSchema>;
export type PlaylistDetailDto = z.infer<typeof PlaylistDetailSchema>;
