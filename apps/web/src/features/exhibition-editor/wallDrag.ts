import { exhibitionTemplate } from "@repo/shared";
import { Plane, Vector3, type Ray } from "three";

export function artworkSpawnCandidates(roomKey: string): { wallId: string; offset: number }[] {
  const wall = exhibitionTemplate.walls.find(value => value.id === (roomKey === "room-1" ? "room-1-south" : `${roomKey}-north`));
  if (!wall) return [];
  const middle = (wall.range[0] + wall.range[1]) / 2;
  return Array.from({ length: Math.ceil((wall.range[1] - wall.range[0]) / 0.25) + 1 }, (_, index) => ({ wallId: wall.id, offset: wall.range[0] + index * 0.25 }))
    .sort((left, right) => Math.abs(left.offset - middle) - Math.abs(right.offset - middle));
}

/** Above the 0.12m wall surface, below the 0.19m artwork interaction plane. */
export function wallInteractionPosition(wallId: string, offset: number): [number, number, number] {
  const wall = exhibitionTemplate.walls.find(value => value.id === wallId);
  if (!wall) throw new Error("Không tìm thấy tường triển lãm");
  const dx = wall.b[0] - wall.a[0];
  const dz = wall.b[1] - wall.a[1];
  const length = Math.hypot(dx, dz);
  return [wall.a[0] + dx / length * offset + wall.normal[0] * 0.15, 2.15, wall.a[1] + dz / length * offset + wall.normal[1] * 0.15];
}

/** Raycast against every physical wall segment in the active room, nearest first. */
export function findWallDrop(ray: Ray, roomKey: string, width: number): { wallId: string; offset: number } | null {
  let nearest = Infinity;
  let drop: { wallId: string; offset: number } | null = null;
  for (const wall of exhibitionTemplate.walls.filter(value => value.roomKey === roomKey)) {
    const normal = new Vector3(wall.normal[0], 0, wall.normal[1]);
    if (ray.direction.dot(normal) >= -0.0001) continue;
    const point = ray.intersectPlane(new Plane().setFromNormalAndCoplanarPoint(normal, new Vector3(wall.a[0], 0, wall.a[1])), new Vector3());
    if (!point || point.y < 0.5 || point.y > 3.8) continue;
    const dx = wall.b[0] - wall.a[0];
    const dz = wall.b[1] - wall.a[1];
    const length = Math.hypot(dx, dz);
    const offset = ((point.x - wall.a[0]) * dx + (point.z - wall.a[1]) * dz) / length;
    if (offset < 0 || offset > length) continue;
    const distance = ray.origin.distanceTo(point);
    if (distance >= nearest) continue;
    nearest = distance;
    drop = offset - width / 2 >= wall.range[0] && offset + width / 2 <= wall.range[1]
      ? { wallId: wall.id, offset: Math.round(offset * 100) / 100 }
      : null;
  }
  return drop;
}
