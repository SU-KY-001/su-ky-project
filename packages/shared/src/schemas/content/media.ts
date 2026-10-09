import { z } from "zod";

export const CreateMediaAssetSchema = z.object({
  kind: z.enum(["AUDIO", "IMAGE"]), fileName: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().positive(), mimeType: z.string().trim().min(1).max(100),
});
export const VerifyMediaAssetSchema = z.object({
  publicId: z.string().min(1), version: z.number().int().positive().optional(), signature: z.string().optional(),
});
