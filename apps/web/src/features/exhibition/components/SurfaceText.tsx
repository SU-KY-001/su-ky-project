import { useEffect, useMemo, type ReactElement } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { galleryPalette, type Point3 } from "../data";

export interface TextLine { text: string; size: number; weight?: number; color?: string; gap?: number; serif?: boolean }

export function SurfaceText({ lines, width, height, position, rotation = 0, background }: {
  lines: TextLine[]; width: number; height: number; position: Point3; rotation?: number; background?: string;
}): ReactElement {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = Math.round(1024 * height / width);
    const context = canvas.getContext("2d");
    if (context) {
      if (background) { context.fillStyle = background; context.fillRect(0, 0, canvas.width, canvas.height); }
      context.textBaseline = "top";
      // Measure and wrap before drawing; long captions must never leave the bitmap.
      const layout = (scale: number): { rows: { text: string; y: number; line: TextLine }[]; bottom: number } => {
        const rows: { text: string; y: number; line: TextLine }[] = [];
        let y = 12;
        for (const line of lines) {
          context.font = `${line.weight ?? 400} ${line.size * scale}px ${line.serif ? '"Cormorant Garamond", serif' : '"Be Vietnam Pro", sans-serif'}`;
          let row = "";
          for (const word of line.text.split(" ")) {
            const next = row ? `${row} ${word}` : word;
            if (context.measureText(next).width > 1000 && row) {
              rows.push({ text: row, y, line }); y += line.size * scale * 1.5; row = word;
            } else row = next;
          }
          rows.push({ text: row, y, line });
          y += (line.size * 1.5 + (line.gap ?? 12)) * scale;
        }
        return { rows, bottom: y };
      };
      let scale = 1;
      let measured = layout(scale);
      while (measured.bottom > canvas.height - 12 && scale > 0.1) {
        scale *= 0.95;
        measured = layout(scale);
      }
      for (const row of measured.rows) {
        context.font = `${row.line.weight ?? 400} ${row.line.size * scale}px ${row.line.serif ? '"Cormorant Garamond", serif' : '"Be Vietnam Pro", sans-serif'}`;
        context.fillStyle = row.line.color ?? galleryPalette.ink;
        context.fillText(row.text, 8, row.y);
      }
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [lines, width, height, background]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position} rotation={[0, rotation, 0]}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial map={texture} transparent={!background} toneMapped={false} depthWrite={false} />
  </mesh>;
}
