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
  AttachAudioSchema,
  AttachEpisodeDocumentSchema,
  EpisodeAttachmentSchema,
  EpisodePosterSchema,
  ImageUploadPolicySchema,
} from "@repo/shared";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/apiError";
import { uploadCatalogMedia } from "@/features/historical-library/services/catalogMediaService";
const studio = client.api.studio;
export async function parse<S extends z.ZodTypeAny>(
  request: Promise<Pick<Response, "ok" | "json" | "status" | "headers">>,
  schema: S,
): Promise<z.infer<S>> {
  const r = await request;
  if (!r.ok) throw await ApiError.fromResponse(r);
  return schema.parse(r.status === 204 ? undefined : await r.json());
}
export const headers = (key: string) => ({ headers: { "Idempotency-Key": key } });
export const NATIONAL_HISTORY_TOPIC_SLUG = "lich-su-dan-toc";
export const podcastProductionService = {
  imagePolicy: (signal?: AbortSignal) => parse(studio["media-assets"]["image-policy"].$get({}, { init: { signal } }), ImageUploadPolicySchema),
  async uploadPoster(file: File, signal: AbortSignal) {
    const assetId = await uploadCatalogMedia(file, "IMAGE", signal);
    const asset = await parse(studio["media-assets"][":id"].$get({ param: { id: assetId } }, { init: { signal } }), z.object({ previewUrl: z.string() }));
    return EpisodePosterSchema.parse({ assetId, url: asset.previewUrl, fileName: file.name, sizeBytes: file.size });
  },
  poster: (id: string, poster: z.infer<typeof EpisodePosterSchema> | null) => parse(studio.episodes[":id"].poster.$put({ param: { id }, json: { assetId: poster?.assetId ?? null, fileName: poster?.fileName } }), EpisodeWorkspaceSchema),
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
  audio: (
    id: string,
    json: z.input<typeof AttachAudioSchema>,
  ) =>
    parse(
      studio.episodes[":id"].narrations[":type"].audio.$put({
        param: { id, type: "THIRD_PERSON" },
        json,
      }),
      NarrationSchema,
    ),
  attachments: (id: string) =>
    parse(
      studio.episodes[":id"].attachments.$get({ param: { id } }),
      z.object({ items: z.array(EpisodeAttachmentSchema) }),
    ),
  attachDocument: (
    id: string,
    json: z.input<typeof AttachEpisodeDocumentSchema>,
    key: string,
  ) =>
    parse(
      studio.episodes[":id"].attachments.$post(
        { param: { id }, json },
        headers(key),
      ),
      EpisodeAttachmentSchema,
    ),
  removeDocument: (id: string, childId: string) =>
    parse(
      studio.episodes[":id"].attachments[":childId"].$delete({
        param: { id, childId },
      }),
      z.void(),
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
        items: z.array(
          z.object({ id: z.string(), slug: z.string(), name: z.string() }),
        ),
      }),
    ),
};
