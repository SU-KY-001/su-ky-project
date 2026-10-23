import { z } from "zod";
import { AudioAnalysisSchema, EditorDocumentSchema } from "./editor-document";

export const NarrationTypeSchema = z.enum(["THIRD_PERSON", "FIRST_PERSON"]);
export const CreateEpisodeSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(280).optional(),
});
export const PatchEpisodeSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  slug: z.string().trim().min(1).max(280).optional(),
  description: z.string().trim().max(5000).nullish(),
  baseUpdatedAt: z.coerce.date().optional(),
});
export const PutNarrationSchema = z.object({
  scriptContent: z.string().nullish(),
  scriptDocument: EditorDocumentSchema.nullish(),
  narratorEntityId: z.string().uuid().nullish(),
  baseUpdatedAt: z.coerce.date().optional(),
});
export const AttachAudioSchema = z.object({
  assetId: z.string().uuid(),
  analysis: AudioAnalysisSchema.optional(),
  confirmReplacePublished: z.boolean().default(false),
});
export const AttachEpisodeDocumentSchema = z.object({
  assetId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
});
export const SetEpisodePosterSchema = z.object({ assetId: z.string().uuid().nullable(), fileName: z.string().trim().min(1).max(255).optional() });
export const EpisodePosterSchema = z.object({ assetId: z.string().uuid(), url: z.string().nullable(), fileName: z.string(), sizeBytes: z.number().int().nullable() });
export type EpisodePoster = z.infer<typeof EpisodePosterSchema>;
export const CreateEntityTagSchema = z.object({ entityId: z.string().uuid() });
export const PatchEntityTagSchema = z.object({
  status: z.enum(["CONFIRMED", "REJECTED"]),
});
