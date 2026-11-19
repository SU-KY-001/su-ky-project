import { expect, test } from "bun:test";
import { moveItem } from "./reorder";

test("reordering retains all tracks and leaves the original unchanged", () => {
  const original = ["a", "b", "c", "d"];
  expect(moveItem(original, 0, 3)).toEqual(["b", "c", "d", "a"]);
  expect(moveItem(original, 3, 1)).toEqual(["a", "d", "b", "c"]);
  expect(moveItem(original, 0, 4)).toEqual(original);
  expect(original).toEqual(["a", "b", "c", "d"]);
});
