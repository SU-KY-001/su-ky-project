import { z } from "zod";
import { AiCheckItemSchema, AiCheckSchema, CatalogSourceSchema, paginatedSchema, type CreateAiCheckInput, type PatchAiCheckItemInput } from "@repo/shared";
import { apiUrl, client } from "@/lib/client";
import { headers, parse } from "../services/podcastProductionService";

const checks = client.api.studio.episodes[":id"]["ai-checks"];
const CheckDetailSchema = z.object({ check: AiCheckSchema, items: z.array(AiCheckItemSchema) });
const SourcePageSchema = paginatedSchema(CatalogSourceSchema);

export const aiCheckService = {
  /** Every source in the library, archived ones excluded: the series attachment is no longer the gate. */
  sources: async (q: string) => {
    const page = await parse(client.api.studio.sources.$get({ query: { q, limit: "20" } }), SourcePageSchema);
    return page.items.filter((source) => source.archivedAt === null);
  },
  create: (id: string, json: CreateAiCheckInput, key: string) =>
    parse(checks.$post({ param: { id }, json }, headers(key)), z.object({ id: z.string().uuid() })),
  recent: (id: string) => parse(checks.$get({ param: { id } }), z.object({ items: z.array(AiCheckSchema) })),
  get: (id: string, checkId: string) => parse(checks[":checkId"].$get({ param: { id, checkId } }), CheckDetailSchema),
  cancel: (id: string, checkId: string) => parse(checks[":checkId"].cancel.$post({ param: { id, checkId } }), AiCheckSchema),
  patchItem: (id: string, checkId: string, itemId: string, json: PatchAiCheckItemInput) =>
    parse(checks[":checkId"].items[":itemId"].$patch({ param: { id, checkId, itemId }, json }), AiCheckItemSchema),
  eventsUrl: (id: string, checkId: string) => `${apiUrl}/api/studio/episodes/${id}/ai-checks/${checkId}/events/stream`,
};
