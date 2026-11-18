import { z } from "zod";
import { QuizImportFormatSchema } from "./quiz-import";

export const ScriptImportDocumentSchema = z.object({
  fileName: z.string(),
  format: QuizImportFormatSchema,
  blocks: z.array(z.object({ text: z.string(), page: z.number().nullable(), line: z.number().nullable() })),
});
export type ScriptImportDocument = z.infer<typeof ScriptImportDocumentSchema>;
