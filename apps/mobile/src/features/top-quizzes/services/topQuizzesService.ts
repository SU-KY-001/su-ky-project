import { TopQuizzesQuerySchema, TopQuizzesResponseSchema, type TopQuizzesResponse } from "@repo/shared";
import { apiClient } from "@/lib/client";

export const topQuizzesService = {
  async list(page: number, limit: number, signal?: AbortSignal): Promise<TopQuizzesResponse> {
    const { data } = await apiClient.get("/api/me/top-quizzes", { params: TopQuizzesQuerySchema.parse({ page, limit }), signal });
    return TopQuizzesResponseSchema.parse(data);
  },
};
