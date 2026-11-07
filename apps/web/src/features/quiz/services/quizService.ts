import { z } from "zod";
import { QuizWorkspaceSchema, QuizWorkspaceListSchema, SeriesListItemSchema, SeriesDetailSchema, paginatedSchema,
  ImageUploadPolicySchema, EpisodePosterSchema, QuizImportDocumentSchema, QuizImportPreviewSchema, QUIZ_IMPORT_LIMITS, type QuizImportPreview, type QuizDraftData, type QuizWorkspace } from "@repo/shared";
import { uploadCatalogMedia } from "@/features/historical-library";
import { client, apiUrl } from "@/lib/client";
import { ApiError } from "@/lib/apiError";
const studio = client.api.studio;
async function parse<S extends z.ZodTypeAny>(request: Promise<Pick<Response, "ok" | "json" | "status" | "headers">>, schema: S): Promise<z.infer<S>> {
  const response = await request; if (!response.ok) throw await ApiError.fromResponse(response); return schema.parse(await response.json());
}
export const quizService = {
  previewDocument: (file: File, defaultTime: number, signal: AbortSignal, onUploaded?: () => void): Promise<QuizImportPreview> => new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Đã dừng đọc tài liệu", "AbortError")); return; }
    const xhr = new XMLHttpRequest();
    const abort = (): void => { xhr.abort(); };
    const cleanup = (): void => signal.removeEventListener("abort", abort);
    xhr.open("POST", `${apiUrl}/api/studio/quiz-import/preview`); xhr.withCredentials = true; xhr.timeout = QUIZ_IMPORT_LIMITS.clientMs;
    xhr.upload.onload = () => onUploaded?.();
    xhr.onload = () => {
      cleanup();
      void parse(Promise.resolve(new Response(xhr.responseText, { status: xhr.status })), QuizImportPreviewSchema).then(resolve, reject);
    };
    xhr.onerror = () => { cleanup(); reject(new Error("Mất kết nối khi đọc tài liệu. Hãy kiểm tra mạng và thử lại.")); };
    xhr.ontimeout = () => { cleanup(); reject(new Error("Đọc tài liệu quá thời gian. Hãy chia nhỏ hoặc lưu lại thành DOCX/TXT rồi thử lại.")); };
    xhr.onabort = () => { cleanup(); reject(new DOMException("Đã dừng đọc tài liệu", "AbortError")); };
    signal.addEventListener("abort", abort, { once: true });
    const form = new FormData(); form.set("file", file); form.set("defaultTime", String(defaultTime)); xhr.send(form);
  }),
  extractDocument: (file: File, signal: AbortSignal) => {
    const form = new FormData(); form.set("file", file);
    return parse(fetch(`${apiUrl}/api/studio/quiz-import/extract`, { method: "POST", credentials: "include", body: form, signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) }), QuizImportDocumentSchema);
  },
  imagePolicy: () => parse(studio["media-assets"]["image-policy"].$get(), ImageUploadPolicySchema),
  image: (id: string) => parse(studio["media-assets"][":id"].$get({ param: { id } }), z.object({ previewUrl: z.string().optional() })),
  uploadImage: async (file: File, signal: AbortSignal) => {
    const assetId = await uploadCatalogMedia(file, "IMAGE", signal);
    const image = await parse(studio["media-assets"][":id"].$get({ param: { id: assetId } }, { init: { signal } }), z.object({ previewUrl: z.string() }));
    return EpisodePosterSchema.parse({ assetId, url: image.previewUrl, fileName: file.name, sizeBytes: file.size });
  },
  list: () => parse(studio["quiz-workspaces"].$get(), QuizWorkspaceListSchema),
  read: (episodeId: string) => parse(studio.episodes[":episodeId"]["quiz-workspace"].$get({ param: { episodeId } }), QuizWorkspaceSchema),
  save: (episodeId: string, revision: number, data: QuizDraftData): Promise<QuizWorkspace> => parse(studio.episodes[":episodeId"]["quiz-workspace"].$put({ param: { episodeId }, json: { revision, data } }), QuizWorkspaceSchema),
  activate: (episodeId: string, revision: number): Promise<QuizWorkspace> => parse(studio.episodes[":episodeId"]["quiz-workspace"].activate.$post({ param: { episodeId }, json: { revision } }), QuizWorkspaceSchema),
  series: (page: number) => parse(studio.series.$get({ query: { page: String(page), limit: "50" } }), paginatedSchema(SeriesListItemSchema)),
  seriesDetail: (id: string) => parse(studio.series[":id"].$get({ param: { id } }), SeriesDetailSchema),
};
