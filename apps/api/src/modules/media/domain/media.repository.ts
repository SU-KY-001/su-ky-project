import type { MediaAsset, MediaKind, MediaStatus } from "./media.entity";

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
  deliveryUrl(asset: Pick<MediaAsset, "publicId" | "kind" | "version" | "format">): string;
}

export class MediaProviderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MediaProviderError";
  }
}

export interface CreateMediaAssetData {
  id: string;
  kind: MediaKind;
  publicId: string;
  status: MediaStatus;
  uploadedById: string;
}

export interface UpdateMediaAssetData {
  status: MediaStatus;
  deletedAt?: Date;
  verifiedAt?: Date;
  version?: bigint;
  format?: string;
  sizeBytes?: bigint;
  durationMs?: number | null;
}

export interface MediaRepository {
  createAsset(data: CreateMediaAssetData): Promise<MediaAsset>;
  getAsset(id: string): Promise<MediaAsset | null>;
  updateStatus(id: string, data: UpdateMediaAssetData): Promise<MediaAsset>;
}
