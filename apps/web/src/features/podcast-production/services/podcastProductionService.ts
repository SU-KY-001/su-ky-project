import { z } from "zod";
import {
  SeriesListItemSchema,
  SeriesDetailSchema,
  EpisodeWorkspaceSchema,
  NarrationSchema,
  SeriesSourceSchema,
  paginatedSchema,
  CreateSeriesSchema,
  PatchSeriesSchema,
  PatchEpisodeSchema,
  PutNarrationSchema,
} from "@repo/shared";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/apiError";
const studio = client.api.studio;
async function parse<S extends z.ZodTypeAny>(
  request: Promise<Pick<Response, "ok" | "json" | "status" | "headers">>,
  schema: S,
): Promise<z.infer<S>> {
  const r = await request;
  if (!r.ok) throw await ApiError.fromResponse(r);
  return schema.parse(r.status === 204 ? undefined : await r.json());
}
const headers = (key: string) => ({ headers: { "Idempotency-Key": key } });
export const podcastProductionService = {
  series: (q = "", page = 1) =>
    parse(
      studio.series.$get({ query: { q, page: String(page), limit: "20" } }),
      paginatedSchema(SeriesListItemSchema),
    ),
  detail: (id: string) =>
    parse(studio.series[":id"].$get({ param: { id } }), SeriesDetailSchema),
  create: (json: z.input<typeof CreateSeriesSchema>, key: string) =>
    parse(studio.series.$post({ json }, headers(key)), SeriesDetailSchema),
  patch: (id: string, json: z.input<typeof PatchSeriesSchema>) =>
    parse(
      studio.series[":id"].$patch({ param: { id }, json }),
      SeriesDetailSchema,
    ),
  append: (seriesId: string, title: string, key: string) =>
    parse(
      studio.series[":seriesId"].episodes.$post(
        { param: { seriesId }, json: { title } },
        headers(key),
      ),
      EpisodeWorkspaceSchema,
    ),
  episode: (id: string) =>
    parse(
      studio.episodes[":id"].$get({ param: { id } }),
      EpisodeWorkspaceSchema,
    ),
  patchEpisode: (id: string, json: z.input<typeof PatchEpisodeSchema>) =>
    parse(
      studio.episodes[":id"].$patch({ param: { id }, json }),
      EpisodeWorkspaceSchema,
    ),
  script: (id: string, json: z.input<typeof PutNarrationSchema>) =>
    parse(
      studio.episodes[":id"].narrations[":type"].$put({
        param: { id, type: "THIRD_PERSON" },
        json,
      }),
      NarrationSchema,
    ),
  audio: (id: string, assetId: string) =>
    parse(
      studio.episodes[":id"].narrations[":type"].audio.$put({
        param: { id, type: "THIRD_PERSON" },
        json: { assetId },
      }),
      NarrationSchema,
    ),
  addCitation: (id: string, historicalCitationId: string, key: string) =>
    parse(
      studio.series[":id"].sources.$post(
        { param: { id }, json: { historicalCitationId } },
        headers(key),
      ),
      SeriesSourceSchema,
    ),
  removeSource: (id: string, childId: string) =>
    parse(
      studio.series[":id"].sources[":childId"].$delete({
        param: { id, childId },
      }),
      z.void(),
    ),
  publishSeries: (id: string, baseUpdatedAt: Date) =>
    parse(
      studio.series[":id"].publish.$post({
        param: { id },
        json: { baseUpdatedAt },
      }),
      SeriesDetailSchema,
    ),
  publishEpisode: (id: string, baseUpdatedAt: Date) =>
    parse(
      studio.episodes[":id"].publish.$post({
        param: { id },
        json: { baseUpdatedAt },
      }),
      EpisodeWorkspaceSchema,
    ),
  hideSeries: (id: string) =>
    parse(
      studio.series[":id"].hide.$post({ param: { id } }),
      SeriesDetailSchema,
    ),
  hideEpisode: (id: string) =>
    parse(
      studio.episodes[":id"].hide.$post({ param: { id } }),
      EpisodeWorkspaceSchema,
    ),
  topics: () =>
    parse(
      client.api.topics.$get(),
      z.object({
        items: z.array(z.object({ id: z.string(), name: z.string() })),
      }),
    ),
};
