export const EXHIBITION_EYE_LINE = 1.75;
export const EXHIBITION_LABEL_HEIGHT = 0.48;
export const EXHIBITION_LABEL_GAP = 0.12;

export function exhibitionArtworkLayout(width: number, aspect: number, mode?: "actual"): { width: number; height: number; centerY: number; labelCenterY: number; labelWidth: number } {
  const fittedWidth = mode === "actual" ? Math.min(width, 2.8 * aspect) : Math.min(width * 0.68, 1.45 * aspect);
  const height = fittedWidth / aspect;
  const centerY = mode === "actual" ? 2.15 : EXHIBITION_EYE_LINE;
  return {
    width: fittedWidth,
    height,
    centerY,
    labelCenterY: centerY - height / 2 - EXHIBITION_LABEL_GAP - EXHIBITION_LABEL_HEIGHT / 2,
    labelWidth: fittedWidth,
  };
}
import { exhibitionTemplate } from "./exhibition-template";
import type { ExhibitionDocument } from "./schemas/exhibition";


export function validateExhibitionPlacements(document: ExhibitionDocument, imageSizes: Record<string, { width: number; height: number }>): string[] {
  const errors: string[] = [];
  const intervals: { id: string; wallId: string; start: number; end: number }[] = [];
  for (const item of document.items) {
    const wall = exhibitionTemplate.walls.find(value => value.id === item.placement.wallId);
    const size = imageSizes[item.imageAssetId];
    if (!wall || !size || !Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) {
      errors.push(`Không xác định được tường hoặc kích thước ảnh của ${item.title}`);
      continue;
    }
    const width = exhibitionArtworkLayout(item.placement.width, size.width / size.height, item.placement.widthMode).width;
    const start = item.placement.offset - width / 2;
    const end = item.placement.offset + width / 2;
    if (start < wall.range[0] || end > wall.range[1]) errors.push(`${item.title} vượt vùng treo`);
    if (exhibitionTemplate.reservedAreas.some(area => area.wallId === wall.id && start < area.end && end > area.start)) errors.push(`${item.title} che nội dung chương`);
    if (intervals.some(other => other.wallId === wall.id && start < other.end && end > other.start)) errors.push(`${item.title} chồng lên điểm khác`);
    intervals.push({ id: item.id, wallId: wall.id, start, end });
  }
  return errors;
}
