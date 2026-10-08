import type { MediaAsset, MediaKind } from "@repo/db";

export interface StoredResource {
  version: bigint;
  format: string;
  bytes: bigint;
  durationMs: number | null;
}

export interface MediaStorageGateway {
  signUpload(input: { publicId: string; kind: MediaKind; allowedFormats: string[] }): Promise<{ url: string; fields: Record<string, string | number>; expiresAt: Date }>;
  fetchResource(publicId: string, kind: MediaKind): Promise<StoredResource | null>;
  destroy(publicId: string, kind: MediaKind): Promise<"deleted" | "not_found">;
  deliveryUrl(asset: MediaAsset): string;
}

export class MediaProviderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MediaProviderError";
  }
}
