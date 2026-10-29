import { exhibitionTemplate, type ExhibitionDocument, type ResolvedExhibition } from "@repo/shared";
import type { Artwork, Point3 } from "./data";

type Placement = ExhibitionDocument["items"][number]["placement"];
export function placementToPose(placement: Placement): { position: Point3; rotation: number } {
  const wall = exhibitionTemplate.walls.find(value => value.id === placement.wallId);
  if (!wall) throw new Error("Không tìm thấy tường triển lãm");
  const dx = wall.b[0] - wall.a[0];
  const dz = wall.b[1] - wall.a[1];
  const length = Math.hypot(dx, dz);
  return { position: [wall.a[0] + dx / length * placement.offset + wall.normal[0] * 0.19, 1.75, wall.a[1] + dz / length * placement.offset + wall.normal[1] * 0.19], rotation: Math.atan2(wall.normal[0], wall.normal[1]) };
}

export function resolvedArtworks(exhibition: ResolvedExhibition): Artwork[] {
  return exhibition.items.map(item => ({ id: item.id, image: item.image.url, aspect: item.image.width / item.image.height, title: item.title, description: item.description, date: item.displayDate, credit: item.credit, sourceUrl: item.sourceUrl, rights: item.rights, chapter: exhibition.chapters.findIndex(chapter => chapter.id === item.chapterId), width: item.placement.width, widthMode: item.placement.widthMode, ...placementToPose(item.placement) }));
}
