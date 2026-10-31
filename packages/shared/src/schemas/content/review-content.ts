import { z } from "zod";
import { EpisodeWorkspaceSchema } from "./studio";
import { EpisodeAiSummarySchema, EpisodeReadinessSchema } from "./readiness";

export const ReviewContentSchema = z.object({
  episode: EpisodeWorkspaceSchema,
  readiness: EpisodeReadinessSchema,
  /** Null when the AI assistant is off or no check exists. */
  aiSummary: EpisodeAiSummarySchema.nullable(),
});

export type ReviewContent = z.infer<typeof ReviewContentSchema>;
