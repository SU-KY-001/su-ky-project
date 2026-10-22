import { z } from "zod";
import { EpisodeWorkspaceSchema } from "./studio";

export const READINESS_KEYS = [
  "BASIC_INFO",
  "THIRD_PERSON_SCRIPT",
  "THIRD_PERSON_AUDIO",
  "SCRIPT_CHANGED_AFTER_AUDIO",
  "DURATION_MISMATCH",
  "AUDIO_QUALITY",
  "AUDIO_UNANALYZED",
  "AUDIO_DURATION_UNKNOWN",
  "SCRIPT_TOO_SHORT",
  "FIRST_PERSON_INCOMPLETE",
  "ENTITY_TAGS_UNCONFIRMED",
  "ENTITY_TAGS_NONE",
  "SERIES_NOT_PUBLISHED",
  "EPISODE_DESCRIPTION",
  "EPISODE_POSTER",
  "EPISODE_LOCKED",
  "AI_REVIEW_NOT_RUN",
  "AI_REVIEW_SUMMARY",
  "AI_REVIEW_STALE",
  "AI_REVIEW_INCOMPLETE",
] as const;

export const ReadinessKeySchema = z.enum(READINESS_KEYS);
export type ReadinessKey = z.infer<typeof ReadinessKeySchema>;

export const ReadinessItemSchema = z.object({
  key: ReadinessKeySchema,
  level: z.enum(["REQUIRED", "WARNING", "INFO"]),
  state: z.enum(["OK", "MISSING", "WARN", "INFO"]),
  narration: z.enum(["THIRD_PERSON", "FIRST_PERSON"]).optional(),
  params: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});

export const EpisodeReadinessSchema = z.object({
  ready: z.boolean(),
  contentRevision: z.number().int(),
  computedAt: z.coerce.date(),
  items: z.array(ReadinessItemSchema),
});

/** Counts of what the system observed about the latest AI script review; never a claim that facts were verified. */
export const EpisodeAiSummarySchema = z.object({
  checkId: z.string().uuid(),
  status: z.enum(["RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]),
  errorCode: z.string().nullable(),
  failedBlocks: z.number().int(),
  createdAt: z.coerce.date(),
  total: z.number().int(),
  reviewed: z.number().int(),
  open: z.number().int(),
  openHigh: z.number().int(),
  applied: z.number().int(),
});

export const ReviewContentSchema = z.object({
  episode: EpisodeWorkspaceSchema,
  readiness: EpisodeReadinessSchema,
  /** Null when the AI assistant is off or no check exists (readiness carries AI_REVIEW_NOT_RUN). */
  aiSummary: EpisodeAiSummarySchema.nullable(),
});

export type ReadinessItem = z.infer<typeof ReadinessItemSchema>;
export type EpisodeReadiness = z.infer<typeof EpisodeReadinessSchema>;
export type EpisodeAiSummary = z.infer<typeof EpisodeAiSummarySchema>;
export type ReviewContent = z.infer<typeof ReviewContentSchema>;
