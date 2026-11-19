import { z } from "zod";

/**
 * Model output of the outline call. Deliberately lenient (no min/max on counts or weight): the validator clamps or
 * rejects, so an out-of-range value is not spent on a schema-correction round trip.
 */
export const OutlineOutputSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      goal: z.string(),
      points: z.array(z.string()),
      weight: z.number().int(),
    }),
  ),
});

export type OutlineOutput = z.infer<typeof OutlineOutputSchema>;
