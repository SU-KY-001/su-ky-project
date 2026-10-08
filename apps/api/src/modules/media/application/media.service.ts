import { getSystemConfig } from "../../../core/config/system-config";
import { DomainError } from "../../../core/errors/domain-error";
import { env } from "../../../core/env";
import type { MediaAsset, MediaKind } from "../domain/media.entity";
import { MediaProviderError, type MediaRepository, type MediaStorageGateway } from "../domain/media.repository";

export class MediaService {
  constructor(private readonly storage: MediaStorageGateway, private readonly repository: MediaRepository) {}

  private async config(kind: MediaKind) {
    return kind === "AUDIO"
      ? { maxBytes: await getSystemConfig("media.audio.max_bytes"), formats: await getSystemConfig("media.audio.allowed_formats"), mimeTypes: await getSystemConfig("media.audio.allowed_mime_types") }
      : { maxBytes: await getSystemConfig("media.image.max_bytes"), formats: await getSystemConfig("media.image.allowed_formats"), mimeTypes: await getSystemConfig("media.image.allowed_mime_types") };
  }

  private map(asset: MediaAsset) {
    return { assetId: asset.id, kind: asset.kind, status: asset.status, format: asset.format, sizeBytes: asset.sizeBytes ? Number(asset.sizeBytes) : null, durationMs: asset.durationMs, createdAt: asset.createdAt, verifiedAt: asset.verifiedAt, previewUrl: asset.status === "READY" ? this.storage.deliveryUrl(asset) : undefined };
  }

  private providerError(error: unknown): never {
    if (error instanceof MediaProviderError) throw new DomainError(503, "MEDIA_PROVIDER_UNAVAILABLE", error.message);
    throw error;
  }

  async create(input: { kind: MediaKind; sizeBytes: number; mimeType: string }, userId: string) {
    const config = await this.config(input.kind);
    if (!config.mimeTypes.includes(input.mimeType)) throw new DomainError(422, "MEDIA_TYPE_NOT_ALLOWED", "Media type is not allowed");
    if (input.sizeBytes > config.maxBytes) throw new DomainError(422, "MEDIA_TOO_LARGE", "Media exceeds the size limit");
    const id = crypto.randomUUID();
    const segment = input.kind === "AUDIO" ? "audio" : "image";
    const asset = await this.repository.createAsset({ id, kind: input.kind, publicId: `${env.CLOUDINARY_FOLDER}/${segment}/${id}`, status: "PENDING", uploadedById: userId });
    try {
      const upload = await this.storage.signUpload({ publicId: asset.publicId, kind: asset.kind, allowedFormats: config.formats });
      return { assetId: asset.id, upload: { url: upload.url, fields: upload.fields }, expiresAt: upload.expiresAt };
    } catch (error) { return this.providerError(error); }
  }

  async get(id: string, userId: string, isAdmin: boolean) {
    const asset = await this.repository.getAsset(id);
    if (!asset || (!isAdmin && asset.uploadedById !== userId)) throw new DomainError(404, "NOT_FOUND", "Media asset not found");
    return this.map(asset);
  }

  async verify(id: string, userId: string, isAdmin: boolean, publicId: string) {
    const asset = await this.repository.getAsset(id);
    if (!asset || (!isAdmin && asset.uploadedById !== userId)) throw new DomainError(404, "NOT_FOUND", "Media asset not found");
    if (publicId !== asset.publicId) throw new DomainError(422, "MEDIA_INVALID", "Uploaded publicId does not match the media ticket");
    if (asset.status === "READY") return this.map(asset);
    const config = await this.config(asset.kind);
    try {
      const resource = await this.storage.fetchResource(asset.publicId, asset.kind);
      if (!resource) throw new DomainError(409, "MEDIA_NOT_UPLOADED", "Uploaded media was not found");
      const invalid = !config.formats.includes(resource.format.toLowerCase()) || resource.bytes > BigInt(config.maxBytes) || (asset.kind === "AUDIO" && (!resource.durationMs || resource.durationMs <= 0));
      if (invalid) {
        await this.storage.destroy(asset.publicId, asset.kind);
        await this.repository.updateStatus(id, { status: "DELETED", deletedAt: new Date() });
        throw new DomainError(422, "MEDIA_INVALID", "Uploaded media is invalid");
      }
      const updated = await this.repository.updateStatus(id, { status: "READY", version: resource.version, format: resource.format.toLowerCase(), sizeBytes: resource.bytes, durationMs: resource.durationMs, verifiedAt: new Date() });
      return this.map(updated);
    } catch (error) { return this.providerError(error); }
  }
}
