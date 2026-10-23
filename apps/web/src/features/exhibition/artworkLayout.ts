export const CANVAS_DEPTH = 0.025;
export const LABEL_HEIGHT = 0.48;
export const LABEL_GAP = 0.12;
export const EYE_LINE = 1.75;

/** Keep the complete image and its caption between the skirting and the ceiling. */
export function artworkLayout(width: number, aspect: number): { width: number; height: number; centerY: number; labelCenterY: number; labelWidth: number } {
  const fittedWidth = Math.min(width * 0.68, 1.45 * aspect);
  const height = fittedWidth / aspect;
  return {
    width: fittedWidth,
    height,
    centerY: EYE_LINE,
    labelCenterY: EYE_LINE - height / 2 - LABEL_GAP - LABEL_HEIGHT / 2,
    labelWidth: fittedWidth,
  };
}
