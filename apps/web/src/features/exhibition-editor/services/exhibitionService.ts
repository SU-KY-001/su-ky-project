import { ExhibitionPodcastOptionSchema, ExhibitionSummarySchema, ExhibitionWorkspaceSchema, ResolvedExhibitionSchema, ImageUploadPolicySchema, LibrarySeriesSchema, paginatedSchema, type ExhibitionDocument } from "@repo/shared";
import { z } from "zod";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/apiError";
import { uploadCatalogMedia } from "@/features/historical-library";

async function parse<T>(request: Promise<Pick<Response, "ok" | "status" | "headers" | "json">>, schema: z.ZodType<T>): Promise<T> {
  const response = await request;
  if (!response.ok) throw await ApiError.fromResponse(response);
  return schema.parse(await response.json());
}

const exhibitions = client.api.studio.exhibitions;
const listSchema = paginatedSchema(ExhibitionSummarySchema);
export const exhibitionService = {
  list: (q: string, status: "all" | "published" | "unpublished", page: number) => parse(exhibitions.$get({ query: { q, status, page: String(page), limit: "10" } }), listSchema),
  create: (document: ExhibitionDocument, key: string) => parse(exhibitions.$post({ json: { document } }, { headers: { "Idempotency-Key": key } }), ExhibitionWorkspaceSchema),
  get: (id: string) => parse(exhibitions[":id"].$get({ param: { id } }), ExhibitionWorkspaceSchema),
  save: (id: string, baseRevision: number, document: ExhibitionDocument) => parse(exhibitions[":id"].draft.$put({ param: { id }, json: { baseRevision, document } }), ExhibitionWorkspaceSchema),
  publish: (id: string, baseRevision: number) => parse(exhibitions[":id"].publish.$post({ param: { id }, json: { baseRevision } }), ExhibitionWorkspaceSchema),
  publicExhibition: (slug: string) => parse(client.api.exhibitions[":slug"].$get({ param: { slug } }), ResolvedExhibitionSchema),
  podcastOptions: (q: string, page: number, seriesId?: string) => parse(client.api.studio["exhibition-podcast-options"].$get({ query: { q, seriesId, page: String(page), limit: "10" } }), paginatedSchema(ExhibitionPodcastOptionSchema)),
  series: (page: number) => parse(client.api.series.$get({ query: { page: String(page), limit: "50" } }), paginatedSchema(LibrarySeriesSchema)),
  imagePolicy: () => parse(client.api.studio["media-assets"]["image-policy"].$get(), ImageUploadPolicySchema),
  uploadImage: async (file: File, signal: AbortSignal) => {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    const id = await uploadCatalogMedia(file, "IMAGE", signal);
    const media = await parse(client.api.studio["media-assets"][":id"].$get({ param: { id } }), z.object({ previewUrl: z.string().url() }));
    return { id, image: { ...dimensions, url: media.previewUrl } };
  },
};
