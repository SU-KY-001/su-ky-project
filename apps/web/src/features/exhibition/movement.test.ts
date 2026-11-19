import { describe, expect, test } from "bun:test";
import { distanceToWall, movePlayer, PLAYER_RADIUS, WALL_HALF_DEPTH } from "./movement";
import { walls, benchWalls, chapterAt, galleryReturns } from "./data";

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
  test("the aligned gallery doors connect all three rooms without crossing walls", () => {
    const first = movePlayer([3.5, 0], [0, -16], walls);
    expect(first[1]).toBeCloseTo(-16);
    const second = movePlayer(first, [0, -16], walls);
    expect(second[1]).toBeCloseTo(-32);
    expect(chapterAt(...first)).toBe(1);
    expect(chapterAt(...second)).toBe(2);
    expect(movePlayer([0, 0], [0, -16], walls)[1]).toBeGreaterThan(-8);
  });
  test("the deep portal sides stop a visitor moving through the jamb", () => {
    const position = movePlayer([3.5, -8.7], [-3, 0], walls);
    expect(position[0]).toBeGreaterThan(2);
    expect(movePlayer([3.5, -7], [0, -3], walls)[1]).toBeCloseTo(-10);
  });
  test("wall returns avoid artwork and block movement into the remaining returns", () => {
    const returns = galleryReturns([{ position: [-5.81, 1.75, 5], rotation: Math.PI / 2, width: 3, aspect: 1.5 }]);
    expect(returns.some(wall => wall.a[0] === -6 && wall.a[1] === 5)).toBe(false);
    const right = returns.find(wall => wall.a[0] === 6 && wall.a[1] === 5)!;
    expect(movePlayer([4.8, 5], [2, 0], [right])[0]).toBeLessThan(5.2);
  });
  test("a visitor cannot walk through the central museum bench", () => {
    expect(movePlayer([0, 5], [0, -6], [...walls, ...benchWalls])[1]).toBeGreaterThan(2.4);
  });
});
