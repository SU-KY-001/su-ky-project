import { z } from "zod";
import { PaginationQuerySchema, HistoricalYearSchema } from "../common";

export const PublicSeriesListQuerySchema = PaginationQuerySchema.extend({
  topicId: z.string().uuid().optional(), historicalPhaseId: z.string().uuid().optional(), periodId: z.string().uuid().optional(),
  fromYear: HistoricalYearSchema.optional(), toYear: HistoricalYearSchema.optional(), q: z.string().trim().optional(),
});
export const UpdateListeningProgressRequestSchema = z.object({
  assetId: z.string().uuid(), positionMs: z.number().int().nonnegative(), playedBitmap: z.string().max(4096),
});
export const ListeningHistoryQuerySchema = PaginationQuerySchema.extend({ status: z.enum(["all", "in_progress", "completed"]).default("all") });

export const PublicSeriesSourceSchema = z.object({ title: z.string(), author: z.string().nullable(), tier: z.string(), locator: z.string(), url: z.string().nullable(), fileUrl: z.string().nullable() });
export const PublicSeriesListItemSchema = z.object({ id: z.string().uuid(), slug: z.string(), title: z.string(), description: z.string().nullable(), startYear: z.number().nullable(), endYear: z.number().nullable(), episodeCount: z.number().int(), publishedAt: z.coerce.date().nullable() }).passthrough();
export const PublicEpisodeDetailSchema = z.object({ id: z.string().uuid(), slug: z.string(), title: z.string(), description: z.string().nullable() }).passthrough();
export const PublicSeriesDetailSchema = z.object({ id: z.string().uuid(), slug: z.string(), title: z.string(), sources: z.array(PublicSeriesSourceSchema), episodes: z.array(z.unknown()) }).passthrough();
export const PlaybackSchema = z.object({ narrationId: z.string().uuid(), episodeId: z.string().uuid(), audio: z.object({ assetId: z.string().uuid(), url: z.string(), mimeType: z.string(), durationMs: z.number().int() }), progress: z.unknown().nullable(), sync: z.object({ intervalMs: z.number().int(), completionThreshold: z.number() }) });
export const ListeningProgressSchema = z.object({ assetId: z.string().uuid(), positionMs: z.number().int(), playedBitmap: z.string(), playedSeconds: z.number().int(), percent: z.number(), completedAt: z.coerce.date().nullable() });
export const ListeningProgressUpdateResultSchema = ListeningProgressSchema.omit({ assetId: true, playedBitmap: true }).extend({ narrationId: z.string().uuid(), completion: z.unknown().nullable() });
export const ListeningHistoryItemSchema = z.object({ episode: z.unknown(), lastListenedAt: z.coerce.date(), lastNarrationId: z.string().uuid(), lastPositionMs: z.number().int(), percent: z.number(), isCompleted: z.boolean() });

export type PublicSeriesListItemDto = z.infer<typeof PublicSeriesListItemSchema>;
export type PublicEpisodeDetailDto = z.infer<typeof PublicEpisodeDetailSchema>;
export type PublicSeriesSourceDto = z.infer<typeof PublicSeriesSourceSchema>;
export type ListeningProgressDto = z.infer<typeof ListeningProgressSchema>;
