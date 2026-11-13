import { exhibitionArtworkLayout } from "@repo/shared";

export type Point2 = readonly [number, number];
export type Point3 = [number, number, number];

export interface Artwork {
  id: string;
  image: string;
  aspect: number;
  title: string;
  description: string;
  date: string;
  credit: string;
  sourceUrl: string;
  rights: string;
  chapter: number;
  position: Point3;
  rotation: number;
  width: number;
  widthMode?: "actual";
}

export interface Wall { a: Point2; b: Point2 }
export const walls: Wall[] = [
  { a: [-6, 12], b: [6, 12] },
  { a: [-6, -40], b: [-6, 12] }, { a: [6, -40], b: [6, 12] },
  { a: [-6, -8], b: [2, -8] }, { a: [5, -8], b: [6, -8] },
  { a: [-6, -24], b: [2, -24] }, { a: [5, -24], b: [6, -24] },
  { a: [-6, -40], b: [6, -40] },
  { a: [2, -8], b: [2, -9.4] }, { a: [5, -8], b: [5, -9.4] },
  { a: [2, -24], b: [2, -25.4] }, { a: [5, -24], b: [5, -25.4] },
];

export const benches = [2, -16, -32];
export const benchWalls: Wall[] = benches.flatMap(z => [
  { a: [-1.4, z - 0.45] as Point2, b: [1.4, z - 0.45] as Point2 },
  { a: [-1.4, z + 0.45] as Point2, b: [1.4, z + 0.45] as Point2 },
  { a: [-1.4, z - 0.45] as Point2, b: [-1.4, z + 0.45] as Point2 },
  { a: [1.4, z - 0.45] as Point2, b: [1.4, z + 0.45] as Point2 },
]);

export function galleryReturns(artworks: Pick<Artwork, "position" | "rotation" | "width" | "aspect" | "widthMode">[]): Wall[] {
  return [5, -3, -13, -19, -29, -35].flatMap(z => [-1, 1].flatMap(side => {
    const blocksArtwork = artworks.some(artwork => Math.sign(Math.sin(artwork.rotation)) === -side && Math.abs(artwork.position[2] - z) < exhibitionArtworkLayout(artwork.width, artwork.aspect, artwork.widthMode).width / 2 + 0.45);
    const blocksChapter = side === -1 && Math.abs(z + 35.4) < 1.75;
    return blocksArtwork || blocksChapter ? [] : [{ a: [side * 6, z] as Point2, b: [side * 5.2, z] as Point2 }];
  }));
}

export const floorAreas = [
  { x: 0, z: 2, width: 12, depth: 20 },
  { x: 0, z: -16, width: 12, depth: 16 },
  { x: 0, z: -32, width: 12, depth: 16 },
];

export const galleryPalette = {
  wall: "#c4bcb2", floor: "#8c8882", ceiling: "#302c29", trim: "#625e59",
  frame: "#282522", mount: "#ddd5c9", ink: "#30343b", muted: "#50555e",
  light: "#fff2df", rail: "#33302d", bench: "#8e8982",
};

export function chapterAt(_x: number, z: number): number {
  return z < -24 ? 2 : z < -8 ? 1 : 0;
}
