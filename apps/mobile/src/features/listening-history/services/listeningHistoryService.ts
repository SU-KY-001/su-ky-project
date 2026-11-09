import { ListeningHistoryQuerySchema, ListeningHistoryResponseSchema } from "@repo/shared";
import { apiClient } from "@/lib/client";
import type { ListeningHistoryOptions, ListeningHistoryPage } from "../types";

export const listeningHistoryService = {
  async list(options: ListeningHistoryOptions, signal?: AbortSignal): Promise<ListeningHistoryPage> {
    const params = ListeningHistoryQuerySchema.parse({ page: 1, limit: 10, status: "all", ...options });
    const { data } = await apiClient.get("/api/me/listening-history", { params, signal });
    return ListeningHistoryResponseSchema.parse(data);
  },
};
