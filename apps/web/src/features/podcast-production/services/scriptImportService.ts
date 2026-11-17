import { ScriptImportDocumentSchema, type ScriptImportDocument } from "@repo/shared";
import { apiUrl } from "@/lib/client";
import { ApiError } from "@/lib/apiError";

export async function extractScriptDocument(file: File, signal: AbortSignal): Promise<ScriptImportDocument> {
  const form = new FormData(); form.set("file", file);
  const response = await fetch(`${apiUrl}/api/studio/script-import/extract`, { method: "POST", credentials: "include", body: form, signal: AbortSignal.any([signal, AbortSignal.timeout(75000)]) });
  if (!response.ok) throw await ApiError.fromResponse(response);
  return ScriptImportDocumentSchema.parse(await response.json());
}
