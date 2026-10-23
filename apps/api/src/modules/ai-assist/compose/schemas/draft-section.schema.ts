import { z } from "zod";

export const DraftSectionOutputSchema = z.object({ text: z.string() });

export type DraftSectionOutput = z.infer<typeof DraftSectionOutputSchema>;
