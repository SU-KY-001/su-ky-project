import { z } from "zod";
import { NARRATIVE_FOCUS_TYPES } from "./research-consultation";

export const SpdcCycleSchema = z.object({
  situation: z.string(),
  problem: z.string(),
  decision: z.string(),
  consequence: z.string(),
});

export const PacingPlanSchema = z.object({
  summaryMoments: z.array(z.string()),
  detailedSceneMoments: z.array(z.string()),
});

export const StoryEpisodeOutlineSchema = z.object({
  episodeNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  episodeTitle: z.string(),
  centralQuestion: z.string(),
  spdcCycle: SpdcCycleSchema,
  narrativeBeats: z.array(z.string()),
  pacingPlan: PacingPlanSchema,
  hookEnd: z.string(),
});

/** Một chu kỳ SPDC cố định trên mỗi tập; giữ tuple để Zod ép đúng 3 tập. */
export const StoryOutlineSchema = z.object({
  seriesTitle: z.string(),
  narrativeFocus: z.string(),
  scale: z.literal("3_EPISODES"),
  episodes: z.tuple([
    StoryEpisodeOutlineSchema,
    StoryEpisodeOutlineSchema,
    StoryEpisodeOutlineSchema,
  ]),
});

export const StoryOutlineInputSchema = z.object({
  focusType: z.enum(NARRATIVE_FOCUS_TYPES).or(z.literal("CUSTOM")),
});

export type SpdcCycle = z.infer<typeof SpdcCycleSchema>;
export type StoryEpisodeOutline = z.infer<typeof StoryEpisodeOutlineSchema>;
export type StoryOutline = z.infer<typeof StoryOutlineSchema>;
