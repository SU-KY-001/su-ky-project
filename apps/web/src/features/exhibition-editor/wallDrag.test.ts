import { expect, test } from "bun:test";
import { Ray, Vector3 } from "three";
import { findWallDrop, wallInteractionPosition, artworkSpawnCandidates } from "./wallDrag";
import { exhibitionTemplate } from "@repo/shared";

test("new artworks start at the middle of the first room rear wall instead of spreading over walls", () => {
  const candidates = artworkSpawnCandidates("room-1");
  expect(candidates[0]).toEqual({ wallId: "room-1-south", offset: 6 });
  expect(candidates.every(point => point.wallId === "room-1-south")).toBe(true);
});

test("dragging follows the wall under the pointer instead of the original wall", () => {
  const ray = (x: number, z: number) => new Ray(new Vector3(0, 2.15, 2), new Vector3(x, 0, z).normalize());
  expect(findWallDrop(ray(-6, 0), "room-1", 1.5)?.wallId).toBe("room-1-west");
  expect(findWallDrop(ray(6, 0), "room-1", 1.5)?.wallId).toBe("room-1-east");
  expect(findWallDrop(ray(0, 10), "room-1", 1.5)?.wallId).toBe("room-1-south");
});

test("wall interaction surface is behind placeholders and in front of the physical wall on every side", () => {
  for (const wall of exhibitionTemplate.walls) {
    const offset = (wall.range[0] + wall.range[1]) / 2;
    const point = wallInteractionPosition(wall.id, offset);
    const dx = wall.b[0] - wall.a[0];
    const dz = wall.b[1] - wall.a[1];
    const length = Math.hypot(dx, dz);
    const surfaceDepth = (point[0] - wall.a[0] - dx / length * offset) * wall.normal[0] + (point[2] - wall.a[1] - dz / length * offset) * wall.normal[1];
    expect(surfaceDepth).toBeGreaterThan(0.12);
    expect(surfaceDepth).toBeLessThan(0.19);
  }
});

test("does not project a drop through a wall or outside the hanging height", () => {
  expect(findWallDrop(new Ray(new Vector3(0, 8, 2), new Vector3(1, 0, 0)), "room-1", 1.5)).toBeNull();
  expect(findWallDrop(new Ray(new Vector3(0, 2.15, 2), new Vector3(0, 0, 0)), "room-1", 1.5)).toBeNull();
});
