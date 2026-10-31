import { z } from "zod";

export const ImageUploadPolicySchema = z.object({ maxBytes: z.number().int().positive(), formats: z.array(z.string()).min(1), mimeTypes: z.array(z.string()).min(1) });
export type ImageUploadPolicy = z.infer<typeof ImageUploadPolicySchema>;

export const CreateMediaAssetSchema = z.object({
  kind: z.enum(["AUDIO", "IMAGE", "DOCUMENT"]),
  fileName: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string().trim().min(1).max(100),
});
export const VerifyMediaAssetSchema = z.object({
  publicId: z.string().min(1),
  version: z.number().int().positive().optional(),
  signature: z.string().optional(),
});
