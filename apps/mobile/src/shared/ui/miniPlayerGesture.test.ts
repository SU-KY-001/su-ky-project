import { expect, test } from "bun:test";
import { shouldCaptureMiniPlayerDrag, shouldDismissMiniPlayer } from "./miniPlayerGesture";

test("only a deliberate downward drag closes the mini player", () => {
  expect(shouldCaptureMiniPlayerDrag(2, 16)).toBe(true);
  expect(shouldCaptureMiniPlayerDrag(30, 16)).toBe(false);
  expect(shouldCaptureMiniPlayerDrag(0, -30)).toBe(false);
  expect(shouldDismissMiniPlayer(56, 0)).toBe(true);
  expect(shouldDismissMiniPlayer(36, 0)).toBe(true);
  expect(shouldDismissMiniPlayer(30, 1)).toBe(true);
  expect(shouldDismissMiniPlayer(20, 1)).toBe(false);
  expect(shouldDismissMiniPlayer(30, 0.2)).toBe(false);
});
