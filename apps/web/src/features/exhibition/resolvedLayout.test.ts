import { expect, test } from "bun:test";
import { placementToPose } from "./resolvedLayout";

test("wall offset maps to a position and rotation facing into the room", () => {
  const pose = placementToPose({ wallId: "room-1-west", offset: 7.5, width: 2 });
  expect(pose.position[0]).toBeCloseTo(-5.81);
  expect(pose.position[2]).toBeCloseTo(-0.5);
  expect(pose.rotation).toBeCloseTo(Math.PI / 2);
});
