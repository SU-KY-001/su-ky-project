import { z } from "zod";

export const NarrationTypeSchema = z.enum(["THIRD_PERSON", "FIRST_PERSON"]);
export const CreateEpisodeSchema = z.object({ title: z.string().trim().min(1).max(255), slug: z.string().trim().min(1).max(280).optional() });
export const PatchEpisodeSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(), slug: z.string().trim().min(1).max(280).optional(),
  description: z.string().trim().max(5000).nullish(), baseUpdatedAt: z.coerce.date().optional(),
});
export const PutNarrationSchema = z.object({
  scriptContent: z.string().nullish(), narratorEntityId: z.string().uuid().nullish(), baseUpdatedAt: z.coerce.date().optional(),
});
export const AttachAudioSchema = z.object({
  assetId: z.string().uuid(), provider: z.enum(["UPLOAD", "ELEVENLABS"]), confirmReplacePublished: z.boolean().default(false),
});
export const CreateEpisodeSourceSchema = z.object({ sourceId: z.string().uuid(), locator: z.string().trim().max(255).default(""), excerpt: z.string().trim().nullish() });
export const PatchEpisodeSourceSchema = z.object({ locator: z.string().trim().max(255).optional(), excerpt: z.string().trim().nullish() });
export const EpisodeSourceOrderSchema = z.object({ episodeSourceIds: z.array(z.string().uuid()) });
export const CreateEntityTagSchema = z.object({ entityId: z.string().uuid() });
export const PatchEntityTagSchema = z.object({ status: z.enum(["CONFIRMED", "REJECTED"]) });
