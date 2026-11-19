import type { Point2, Wall } from "./data";

export const PLAYER_RADIUS = 0.3;
export const WALL_HALF_DEPTH = 0.12;

export function distanceToWall(x: number, z: number, wall: Wall): number {
  const dx = wall.b[0] - wall.a[0];
  const dz = wall.b[1] - wall.a[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((x - wall.a[0]) * dx + (z - wall.a[1]) * dz) / lengthSquared)) : 0;
  return Math.hypot(x - wall.a[0] - dx * t, z - wall.a[1] - dz * t);
}

/** Small swept steps prevent tunnelling, including when a frame takes unusually long. */
export function movePlayer(position: Point2, delta: Point2, walls: readonly Wall[]): Point2 {
  const steps = Math.max(1, Math.ceil(Math.hypot(...delta) / 0.1));
  const margin = PLAYER_RADIUS + WALL_HALF_DEPTH;
  let [x, z] = position;
  for (let step = 0; step < steps; step++) {
    const nx = x + delta[0] / steps;
    if (walls.every(wall => distanceToWall(nx, z, wall) >= margin)) x = nx;
    const nz = z + delta[1] / steps;
    if (walls.every(wall => distanceToWall(x, nz, wall) >= margin)) z = nz;
  }
  return [x, z];
}
