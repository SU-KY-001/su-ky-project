import { describe, expect, test } from "bun:test";
import { distanceToWall, movePlayer, PLAYER_RADIUS, WALL_HALF_DEPTH } from "./movement";

const wall = { a: [0, -5], b: [0, 5] } as const;
describe("gallery walking", () => {
  test("does not tunnel through a wall with a large step", () => {
    const position = movePlayer([-2, 0], [8, 0], [wall]);
    expect(position[0]).toBeLessThanOrEqual(-PLAYER_RADIUS - WALL_HALF_DEPTH);
  });
  test("slides along walls instead of getting stuck", () => {
    const position = movePlayer([-0.5, 0], [2, 2], [wall]);
    expect(position[0]).toBeLessThanOrEqual(-0.42);
    expect(position[1]).toBeCloseTo(2);
  });
  test("can pass through a doorway in both directions", () => {
    const doorway = [{ a: [0, -8], b: [0, -2] }, { a: [0, 2], b: [0, 8] }] as const;
    expect(movePlayer([-2, 0], [4, 0], doorway)[0]).toBeCloseTo(2);
    expect(movePlayer([2, 0], [-4, 0], doorway)[0]).toBeCloseTo(-2);
  });
  test("protects diagonal walls and their endpoints", () => {
    const diagonal = { a: [0, 0], b: [3, 3] } as const;
    const position = movePlayer([0, 3], [4, -4], [diagonal]);
    expect(distanceToWall(...position, diagonal)).toBeGreaterThanOrEqual(0.42);
    expect(distanceToWall(-1, 0, diagonal)).toBe(1);
  });
});
