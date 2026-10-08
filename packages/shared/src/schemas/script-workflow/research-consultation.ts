import { z } from "zod";

export const SOURCE_TIERS = [
  "TIER_1_CHINH_SU",
  "TIER_2_KHAO_CO",
  "TIER_3_KHOA_HOC",
  "TIER_4_DA_SU",
] as const;

export const SOURCE_TIER_LABELS: Record<(typeof SOURCE_TIERS)[number], string> = {
  TIER_1_CHINH_SU: "Tier 1 · Chính sử",
  TIER_2_KHAO_CO: "Tier 2 · Khảo cổ học",
  TIER_3_KHOA_HOC: "Tier 3 · Khoa học tự nhiên",
  TIER_4_DA_SU: "Tier 4 · Dã sử & Thần phả",
};

export const NARRATIVE_FOCUS_TYPES = [
  "DIEN_BIEN",
  "NGUYEN_NHAN",
  "NHAN_VAT",
  "CO_CHE_DIA_LOI",
  "Y_NGHIA_LICH_SU",
] as const;

export const SourceItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  authorOrOrigin: z.string(),
  tier: z.enum(SOURCE_TIERS),
  tierDescription: z.string(),
  reliabilityScore: z.number().min(1).max(10),
  crossVerificationNotes: z.string(),
  isPrimaryAssertionSource: z.boolean(),
  url: z.string().optional(),
  locationInSource: z.string().optional(),
});

export const NarrativeMenuOptionSchema = z.object({
  focusType: z.enum(NARRATIVE_FOCUS_TYPES),
  focusLabel: z.string(),
  angleDescription: z.string(),
  seriesTitle: z.string(),
  episodeTitles: z.tuple([z.string(), z.string(), z.string()]),
  recommendedBecause: z.string(),
});

export const NarrativeFocusSelectionSchema = z.object({
  selectedFocusType: z.enum(NARRATIVE_FOCUS_TYPES).or(z.literal("CUSTOM")),
  seriesTitle: z.string(),
  episodeTitles: z.tuple([z.string(), z.string(), z.string()]),
  editorialNotes: z.string().optional(),
});

export const ResearchConsultationSchema = z.object({
  topic: z.string(),
  historicalTimeframe: z.string(),
  geographicScope: z.string(),
  sourcesCatalogue: z.array(SourceItemSchema),
  narrativeMenu: z.array(NarrativeMenuOptionSchema),
  initialResearchQuestions: z.array(z.string()),
});

export type SourceItem = z.infer<typeof SourceItemSchema>;
export type NarrativeMenuOption = z.infer<typeof NarrativeMenuOptionSchema>;
export type NarrativeFocusSelection = z.infer<typeof NarrativeFocusSelectionSchema>;
export type ResearchConsultation = z.infer<typeof ResearchConsultationSchema>;
export type SourceTier = (typeof SOURCE_TIERS)[number];
export type NarrativeFocusType = (typeof NARRATIVE_FOCUS_TYPES)[number];
