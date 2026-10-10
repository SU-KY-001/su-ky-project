import { z } from "zod";

export const FACT_CONFIDENCE_LEVELS = ["CONFIRMED", "DEBATED", "INSUFFICIENT"] as const;

export const FactCardSchema = z.object({
  id: z.string(),
  claim: z.string(),
  timePoint: z.string().optional(),
  location: z.string().optional(),
  entitiesInvolved: z.array(z.string()),
  sourceReference: z.string(),
  citationSnippet: z.string(),
  confidence: z.enum(FACT_CONFIDENCE_LEVELS),
  potentialRelations: z.array(z.string()),
  narrativeRelevance: z.string(),
});

export const ChronologyEntrySchema = z.object({
  time: z.string(),
  event: z.string(),
  factCardId: z.string(),
});

export const KeyEntitySchema = z.object({
  name: z.string(),
  role: z.string(),
  historicalStance: z.string(),
});

export const ResearchPackSchema = z.object({
  topic: z.string(),
  selectedNarrativeFocus: z.string(),
  factCards: z.array(FactCardSchema),
  chronologicalTimeline: z.array(ChronologyEntrySchema),
  keyEntities: z.array(KeyEntitySchema),
  identifiedResearchGaps: z.array(z.string()),
});

export type FactCard = z.infer<typeof FactCardSchema>;
export type ResearchPack = z.infer<typeof ResearchPackSchema>;
export type FactConfidence = (typeof FACT_CONFIDENCE_LEVELS)[number];
