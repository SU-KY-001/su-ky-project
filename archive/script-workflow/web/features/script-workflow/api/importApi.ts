import { z } from "zod";
import { ImportResultSchema, type ImportRequest, type ImportResult } from "@repo/shared";
import { isApiError } from "@/lib/apiError";
import { apiRequest } from "@/lib/apiRequest";

const BASE_PATH = "/api/script-workflows";
const HTTP_NOT_FOUND = 404;

export const ImportPreviewTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("NEW_SERIES"), seriesTitle: z.string() }),
  z.object({
    kind: z.literal("EXISTING_SERIES"),
    seriesId: z.string().uuid(),
    seriesTitle: z.string(),
    nextSortOrder: z.number(),
  }),
]);

export const WorkflowImportPreviewSchema = z.object({
  target: ImportPreviewTargetSchema,
  factCheck: z.object({ passed: z.boolean(), issueCount: z.number() }),
  basis: z.object({ factCheckerVersionId: z.number().int().positive() }),
  episodes: z.array(z.object({ episodeNo: z.number(), title: z.string(), wordCount: z.number() })),
  sources: z.array(z.object({ itemId: z.string() })),
});

export type WorkflowImportPreview = z.infer<typeof WorkflowImportPreviewSchema>;

const WrappedImportResultSchema = z.object({
  result: ImportResultSchema,
  created: z.boolean(),
});

export const ImportWorkflowResponseSchema = z.union([
  WrappedImportResultSchema,
  ImportResultSchema.transform((result) => ({ result, created: true })),
]);

export type ImportWorkflowResponse = z.infer<typeof ImportWorkflowResponseSchema>;

export function buildImportRequest(preview: WorkflowImportPreview): ImportRequest {
  return {
    basis: preview.basis,
    sourceDecisions: preview.sources.map((s) => ({ itemId: s.itemId, action: "CREATE" as const })),
    entityDecisions: [],
  };
}

/** Returns the saved ImportResult when already imported, or `null` on 404 (`NOT_IMPORTED`). */
export async function getWorkflowImport(id: number): Promise<ImportResult | null> {
  try {
    return await apiRequest(`${BASE_PATH}/${id}/import`, ImportResultSchema);
  } catch (error) {
    if (isApiError(error, HTTP_NOT_FOUND)) return null;
    throw error;
  }
}

export function getWorkflowImportPreview(id: number): Promise<WorkflowImportPreview> {
  return apiRequest(`${BASE_PATH}/${id}/import-preview`, WorkflowImportPreviewSchema);
}

export function importWorkflow(
  id: number,
  preview: WorkflowImportPreview,
  idempotencyKey: string,
): Promise<ImportWorkflowResponse> {
  return apiRequest(`${BASE_PATH}/${id}/import`, ImportWorkflowResponseSchema, {
    method: "POST",
    body: buildImportRequest(preview),
    idempotencyKey,
  });
}
