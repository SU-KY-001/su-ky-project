import { ResolvedExhibitionSchema, type ResolvedExhibition } from "@repo/shared";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/apiError";

export async function publicExhibition(slug: string, signal: AbortSignal): Promise<ResolvedExhibition> {
  const response = await client.api.exhibitions[":slug"].$get({ param: { slug } }, { init: { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) } });
  if (!response.ok) throw await ApiError.fromResponse(response);
  return ResolvedExhibitionSchema.parse(await response.json());
}
