import type { z } from "zod";
import type { ListeningHistoryItemSchema, ListeningHistoryResponseSchema } from "@repo/shared";

export type ListeningHistoryItem = z.infer<typeof ListeningHistoryItemSchema>;
export type ListeningHistoryPage = z.infer<typeof ListeningHistoryResponseSchema>;
export type ListeningHistoryStatus = "all" | "in_progress" | "completed";
export interface ListeningHistoryOptions {
  page?: number;
  limit?: number;
  status?: ListeningHistoryStatus;
}
