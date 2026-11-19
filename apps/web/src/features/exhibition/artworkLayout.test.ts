import { expect, test } from "bun:test";
import { artworkLayout, CANVAS_DEPTH, EYE_LINE, LABEL_GAP, LABEL_HEIGHT } from "./artworkLayout";

test("landscape, portrait and large canvases keep the entire caption above the skirting", () => {
  for (const [width, aspect] of [[3.6, 850 / 595], [1.3, 378 / 614], [3.7, 850 / 550], [8, 0.5]]) {
    const layout = artworkLayout(width!, aspect!);
    expect(layout.centerY).toBe(EYE_LINE);
    expect(layout.labelCenterY - LABEL_HEIGHT / 2).toBeGreaterThan(0.1);
    expect(layout.centerY - layout.height / 2 - layout.labelCenterY - LABEL_HEIGHT / 2).toBeCloseTo(LABEL_GAP);
    expect(layout.labelWidth).toBe(layout.width);
    expect(layout.centerY + layout.height / 2).toBeLessThan(4.4);
    expect(layout.width / layout.height).toBeCloseTo(aspect!);
  }
  expect(CANVAS_DEPTH).toBeGreaterThanOrEqual(0.02);
  expect(CANVAS_DEPTH).toBeLessThanOrEqual(0.03);
});
