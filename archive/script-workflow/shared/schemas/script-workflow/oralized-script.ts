import { z } from "zod";

export const OralizedEpisodeScriptSchema = z.object({
  episodeNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  episodeTitle: z.string(),
  spokenNarration: z
    .string()
    .describe(
      "Văn nói thuần túy cho TTS: không dấu gạch ngang đầu dòng, không dấu hai chấm, không câu cụt lủn, có liên từ nối mượt mà"
    ),
  wordCount: z.number().int().nonnegative(),
  estimatedDurationSeconds: z.number().int().nonnegative(),
  breathAndPacingNotes: z.string(),
});

export const OralizedScriptSchema = z.object({
  seriesTitle: z.string(),
  episodes: z.tuple([
    OralizedEpisodeScriptSchema,
    OralizedEpisodeScriptSchema,
    OralizedEpisodeScriptSchema,
  ]),
  totalWordCount: z.number().int().nonnegative(),
});

export type OralizedEpisodeScript = z.infer<typeof OralizedEpisodeScriptSchema>;
export type OralizedScript = z.infer<typeof OralizedScriptSchema>;
