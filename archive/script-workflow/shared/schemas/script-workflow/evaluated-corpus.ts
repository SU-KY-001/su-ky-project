import { z } from "zod";
import { SOURCE_TIERS } from "./research-consultation";

export const CROSS_VERIFICATION_ROLES = [
  "DISCOVERY",
  "CLAIM_SUPPORT",
] as const;

/**
 * A source after thẩm định: phân biệt nguồn khám phá vs nguồn khẳng định,
 * gắn cờ echo-chamber và các chi tiết còn tranh luận.
 */
export const EvaluatedSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(SOURCE_TIERS),
  reliabilityScore: z.number().min(1).max(10),
  crossVerificationRole: z.enum(CROSS_VERIFICATION_ROLES),
  echoChamberFlag: z.boolean(),
  debatedDetails: z.array(z.string()),
  notes: z.string(),
  url: z.string().optional(),
  locationInSource: z.string().optional(),
});

export const EvaluatedCorpusSchema = z.object({
  topic: z.string(),
  selectedFocusType: z.string(),
  evaluatedSources: z.array(EvaluatedSourceSchema),
  crossVerificationSummary: z.string(),
  singleSidedSourceWarnings: z.array(z.string()),
  flaggedInsufficientSources: z.array(z.string()),
});

export type EvaluatedSource = z.infer<typeof EvaluatedSourceSchema>;
export type EvaluatedCorpus = z.infer<typeof EvaluatedCorpusSchema>;
