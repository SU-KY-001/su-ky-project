import { z } from "zod";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/apiError";
import { HistoricalPeriodSchema, PublicHistoricalEventSchema, LibrarySeriesSchema, LibrarySeriesDetailSchema, LibraryEpisodeSchema, MyWeeklyMissionsSchema, PublicHonorsSchema, PublicReleasesSchema, PlaybackSchema, ListeningProgressSchema, ListeningProgressUpdateResultSchema, ListeningHistoryResponseSchema, PublicQuizSchema, QuizAttemptResultSchema, paginatedSchema } from "@repo/shared";

async function read<S extends z.ZodTypeAny>(request: Promise<Pick<Response, "ok" | "json" | "status" | "headers">>, schema: S): Promise<z.infer<S>> {
  const response = await request;
  if (!response.ok) throw await ApiError.fromResponse(response);
  return schema.parse(await response.json());
}

export interface LibraryFilter { periodId?: string; phaseId?: string; eventId?: string; page?: number }
const options = (signal?: AbortSignal) => ({ init: { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) } });

export const libraryService = {
  periods: (signal?: AbortSignal) => read(client.api["historical-periods"].$get({}, options(signal)), z.object({ items: z.array(HistoricalPeriodSchema) })),
  events: (filter: LibraryFilter, signal?: AbortSignal) => read(client.api["historical-events"].$get({ query: { page: String(filter.page ?? 1), limit: "6", periodId: filter.periodId, phaseId: filter.phaseId } }, options(signal)), paginatedSchema(PublicHistoricalEventSchema)),
  series: (filter: LibraryFilter, signal?: AbortSignal) => read(client.api.series.$get({ query: { page: String(filter.page ?? 1), limit: "8", periodId: filter.periodId, historicalPhaseId: filter.phaseId, eventId: filter.eventId } }, options(signal)), paginatedSchema(LibrarySeriesSchema)),
  seriesDetail: (slug: string, signal?: AbortSignal) => read(client.api.series[":slug"].$get({ param: { slug } }, options(signal)), LibrarySeriesDetailSchema),
  episode: (slug: string, signal?: AbortSignal) => read(client.api.episodes[":slug"].$get({ param: { slug } }, options(signal)), LibraryEpisodeSchema),
  missions: (signal?: AbortSignal) => read(client.api.me["weekly-missions"].$get({ query: {} }, options(signal)), MyWeeklyMissionsSchema),
  honors: (period: "week" | "month", signal?: AbortSignal) => read(client.api.showcase.honors.$get({ query: { period } }, options(signal)), PublicHonorsSchema),
  releases: (from: Date, to: Date, seriesId?: string, signal?: AbortSignal) => read(client.api.showcase.releases.$get({ query: { from: from.toISOString(), to: to.toISOString(), seriesId } }, options(signal)), PublicReleasesSchema),
  playback: (narrationId: string, signal?: AbortSignal) => read(client.api.narrations[":narrationId"].playback.$get({ param: { narrationId } }, options(signal)), PlaybackSchema.extend({ progress: ListeningProgressSchema.nullable() })),
  progress: (narrationId: string, signal?: AbortSignal) => read(client.api.me["listening-progress"][":narrationId"].$get({ param: { narrationId } }, options(signal)), ListeningProgressSchema),
  saveProgress: (narrationId: string, json: { assetId: string; positionMs: number; playedBitmap: string }) => read(client.api.me["listening-progress"][":narrationId"].$put({ param: { narrationId }, json }, options()), ListeningProgressUpdateResultSchema),
  history: (query: { page?: number; limit?: number; status?: "all" | "in_progress" | "completed" }, signal?: AbortSignal) => read(client.api.me["listening-history"].$get({ query: { page: String(query.page ?? 1), limit: String(query.limit ?? 10), status: query.status ?? "all" } }, options(signal)), ListeningHistoryResponseSchema),
  quiz: (slug: string, signal?: AbortSignal) => read(client.api.episodes[":slug"].quiz.$get({ param: { slug } }, options(signal)), PublicQuizSchema),
  attempt: (quizId: string, answers: { questionId: string; optionId: string }[], key: string) => read(client.api.quizzes[":quizId"].attempts.$post({ param: { quizId }, json: { answers } }, { ...options(), headers: { "Idempotency-Key": key } }), QuizAttemptResultSchema),
};
