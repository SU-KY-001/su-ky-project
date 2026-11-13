import { validateExhibitionPlacements, type ExhibitionDocument } from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";

interface ImageReference {
  id: string;
  uploadedById: string;
  kind: string;
  status: string;
  verifiedAt: Date | null;
  deletedAt: Date | null;
  widthPx: number | null;
  heightPx: number | null;
}

export function validateReferences(document: ExhibitionDocument, ownerId: string, images: ImageReference[], availableNarrations: string[], audio?: ImageReference | null): void {
  if (document.audioAssetId && (!audio || audio.id !== document.audioAssetId || audio.uploadedById !== ownerId || audio.kind !== "AUDIO" || audio.status !== "READY" || !audio.verifiedAt || audio.deletedAt)) {
    throw new DomainError(400, "VALIDATION_ERROR", "Âm thanh phải thuộc người tạo và đã được xác minh");
  }
  const imageIds = new Set(document.items.map(item => item.imageAssetId));
  if (document.metadata.coverAssetId) imageIds.add(document.metadata.coverAssetId);
  const dimensions: Record<string, { width: number; height: number }> = {};
  for (const id of imageIds) {
    const image = images.find(value => value.id === id);
    if (!image || image.uploadedById !== ownerId || image.kind !== "IMAGE" || image.status !== "READY" || !image.verifiedAt || image.deletedAt || !image.widthPx || !image.heightPx || image.widthPx <= 0 || image.heightPx <= 0) {
      throw new DomainError(400, "VALIDATION_ERROR", "Ảnh phải thuộc người tạo và đã được xác minh");
    }
    dimensions[id] = { width: image.widthPx, height: image.heightPx };
  }
  const available = new Set(availableNarrations);
  if (document.items.some(item => item.narrationId && !available.has(item.narrationId))) {
    throw new DomainError(400, "VALIDATION_ERROR", "Podcast được chọn không khả dụng");
  }
  const errors = validateExhibitionPlacements(document, dimensions);
  if (errors.length) throw new DomainError(400, "VALIDATION_ERROR", errors.join("; "));
}
