import { z } from "zod";

export const PodcastEpisodeDraftSchema = z.object({
  episodeNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  episodeTitle: z.string(),
  narration: z.string(),
  wordCount: z.number().int().nonnegative(),
  estimatedDurationSeconds: z.number().int().nonnegative(),
});

export const PodcastScriptDraftSchema = z.object({
  seriesTitle: z.string(),
  episodes: z.tuple([
    PodcastEpisodeDraftSchema,
    PodcastEpisodeDraftSchema,
    PodcastEpisodeDraftSchema,
  ]),
  totalWordCount: z.number().int().nonnegative(),
});

export type PodcastEpisodeDraft = z.infer<typeof PodcastEpisodeDraftSchema>;
export type PodcastScriptDraft = z.infer<typeof PodcastScriptDraftSchema>;
