import { z } from "zod";
import { QuizWorkspaceSchema, QuizWorkspaceListSchema, SeriesListItemSchema, SeriesDetailSchema, paginatedSchema,
  type QuizDraftData, type QuizWorkspace } from "@repo/shared";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/apiError";
const studio = client.api.studio;
async function parse<S extends z.ZodTypeAny>(request: Promise<Pick<Response, "ok" | "json" | "status" | "headers">>, schema: S): Promise<z.infer<S>> {
  const response = await request; if (!response.ok) throw await ApiError.fromResponse(response); return schema.parse(await response.json());
}
export const quizService = {
  list: () => parse(studio["quiz-workspaces"].$get(), QuizWorkspaceListSchema),
  read: (episodeId: string) => parse(studio.episodes[":episodeId"]["quiz-workspace"].$get({ param: { episodeId } }), QuizWorkspaceSchema),
  save: (episodeId: string, revision: number, data: QuizDraftData): Promise<QuizWorkspace> => parse(studio.episodes[":episodeId"]["quiz-workspace"].$put({ param: { episodeId }, json: { revision, data } }), QuizWorkspaceSchema),
  activate: (episodeId: string, revision: number): Promise<QuizWorkspace> => parse(studio.episodes[":episodeId"]["quiz-workspace"].activate.$post({ param: { episodeId }, json: { revision } }), QuizWorkspaceSchema),
  series: (page: number) => parse(studio.series.$get({ query: { page: String(page), limit: "50" } }), paginatedSchema(SeriesListItemSchema)),
  seriesDetail: (id: string) => parse(studio.series[":id"].$get({ param: { id } }), SeriesDetailSchema),
};
