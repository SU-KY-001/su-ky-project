import { prisma, type MediaAsset as MediaAssetRow } from "@repo/db";
import type { MediaAsset } from "../domain/media.entity";
import type { CreateMediaAssetData, MediaRepository, UpdateMediaAssetData } from "../domain/media.repository";
function toMediaAsset(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    kind: row.kind,
    publicId: row.publicId,
    status: row.status,
    version: row.version,
    format: row.format,
    sizeBytes: row.sizeBytes,
    durationMs: row.durationMs,
    uploadedById: row.uploadedById,
    createdAt: row.createdAt,
    verifiedAt: row.verifiedAt,
    detachedAt: row.detachedAt,
    deletedAt: row.deletedAt,
  };
}

export class PrismaMediaRepository implements MediaRepository {
  createAsset(data: CreateMediaAssetData): Promise<MediaAsset> {
    return prisma.mediaAsset.create({ data }).then(toMediaAsset);
  }

  getAsset(id: string): Promise<MediaAsset | null> {
    return prisma.mediaAsset.findUnique({ where: { id } }).then((row) => (row ? toMediaAsset(row) : null));
  }

  updateStatus(id: string, data: UpdateMediaAssetData): Promise<MediaAsset> {
    return prisma.mediaAsset.update({ where: { id }, data }).then(toMediaAsset);
  }
}
