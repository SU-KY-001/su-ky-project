/**
 * Pure domain entity mirroring the `MediaAsset` Prisma row
 * (packages/db/prisma/schema.prisma). Kept hand-written and free of
 * @repo/db imports so domain/application layers stay persistence-agnostic.
 */
export type MediaKind = "AUDIO" | "IMAGE" | "DOCUMENT";
export type MediaStatus = "PENDING" | "READY" | "DELETED";

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  publicId: string;
  status: MediaStatus;
  version: bigint | null;
  format: string | null;
  sizeBytes: bigint | null;
  durationMs: number | null;
  uploadedById: string;
  createdAt: Date;
  verifiedAt: Date | null;
  detachedAt: Date | null;
  deletedAt: Date | null;
}
