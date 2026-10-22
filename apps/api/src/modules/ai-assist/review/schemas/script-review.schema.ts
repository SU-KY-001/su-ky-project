import { z } from "zod";

/** Flat, every field required (empty string instead of null) so provider structured-output modes accept it. */
export const ScriptReviewOutputSchema = z.object({
  items: z.array(
    z.object({
      blockRef: z.string(),
      kind: z.literal("FACT_DOUBT"),
      severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
      basis: z.enum(["CONTRADICTED", "NOT_FOUND"]),
      message: z.string(),
      /** Whole corrected block, or "" when there is no clear fix. */
      suggestion: z.string(),
      evidence: z.array(
        z.object({
          /** Source label as listed in <sources>: "S1", "S2"... */
          source: z.string(),
          page: z.number().int(),
          quote: z.string(),
        }),
      ),
    }),
  ),
});

export type ScriptReviewOutput = z.infer<typeof ScriptReviewOutputSchema>;
