import { z } from "zod";

/** No max(count) here: the validator keeps the first `count` variants, so extras cost nothing. */
export const RewriteOutputSchema = z.object({
  variants: z.array(z.object({ text: z.string() })),
});

export type RewriteOutput = z.infer<typeof RewriteOutputSchema>;
