import { v2 as cloudinary } from "cloudinary";
import type { MediaAsset, MediaKind } from "@repo/db";
import { getSystemConfig } from "../../../core/config/system-config";
import { env } from "../../../core/env";
import { MediaProviderError, type MediaStorageGateway, type StoredResource } from "../application/media-storage";

function cloudinaryType(kind: MediaKind) {
  return kind === "AUDIO" ? "authenticated" : "upload";
}
function resourceType(kind: MediaKind) {
  return kind === "AUDIO" ? "video" : "image";
}

export class CloudinaryGateway implements MediaStorageGateway {
  private configured(): void {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) throw new MediaProviderError("Cloudinary is not configured");
    cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
  }

  private async withTimeout<T>(operation: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new MediaProviderError("Cloudinary request timed out")),
        env.CLOUDINARY_TIMEOUT_MS
      );
    });
    try {
      return await Promise.race([operation, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async signUpload(input: { publicId: string; kind: MediaKind; allowedFormats: string[] }) {
    this.configured();
    const timestamp = Math.floor(Date.now() / 1000);
    const type = cloudinaryType(input.kind);
    const allowedFormats = input.allowedFormats.join(",");
    const signature = cloudinary.utils.api_sign_request({ public_id: input.publicId, timestamp, type, allowed_formats: allowedFormats }, env.CLOUDINARY_API_SECRET!);
    const ttl = await getSystemConfig("media.upload_ticket_ttl_seconds");
    return {
      url: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resourceType(input.kind)}/upload`,
      fields: { api_key: env.CLOUDINARY_API_KEY!, timestamp, signature, public_id: input.publicId, type, resource_type: resourceType(input.kind), allowed_formats: allowedFormats },
      expiresAt: new Date((timestamp + ttl) * 1000),
    };
  }

  async fetchResource(publicId: string, kind: MediaKind): Promise<StoredResource | null> {
    this.configured();
    try {
      const result = await this.withTimeout(cloudinary.api.resource(publicId, { resource_type: resourceType(kind), type: cloudinaryType(kind) }));
      return { version: BigInt(result.version), format: result.format, bytes: BigInt(result.bytes), durationMs: typeof result.duration === "number" ? Math.round(result.duration * 1000) : null };
    } catch (error) {
      if (typeof error === "object" && error && "http_code" in error && error.http_code === 404) return null;
      if (error instanceof MediaProviderError) throw error;
      throw new MediaProviderError("Cloudinary resource lookup failed", { cause: error });
    }
  }

  async destroy(publicId: string, kind: MediaKind): Promise<"deleted" | "not_found"> {
    this.configured();
    try {
      const result = await this.withTimeout(cloudinary.uploader.destroy(publicId, { resource_type: resourceType(kind), type: cloudinaryType(kind), invalidate: true }));
      return result.result === "not found" ? "not_found" : "deleted";
    } catch (error) {
      if (error instanceof MediaProviderError) throw error;
      throw new MediaProviderError("Cloudinary delete failed", { cause: error });
    }
  }

  deliveryUrl(asset: MediaAsset): string {
    this.configured();
    return cloudinary.url(asset.publicId, { resource_type: resourceType(asset.kind), type: cloudinaryType(asset.kind), sign_url: asset.kind === "AUDIO", secure: true, version: asset.version ? Number(asset.version) : undefined, format: asset.format ?? undefined });
  }
}
