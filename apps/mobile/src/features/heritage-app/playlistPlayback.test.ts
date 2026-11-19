import { expect, test } from "bun:test";
import { nextPlaylistMode, nextQueueIndex, playlistOrder } from "./playlistPlayback";

test("cycles modes and repeats only when enabled", () => {
  expect(nextPlaylistMode("normal")).toBe("shuffle");
  expect(nextPlaylistMode("shuffle")).toBe("repeat");
  expect(nextPlaylistMode("repeat")).toBe("normal");
  expect(nextQueueIndex(2, 3, "normal")).toBeNull();
  expect(nextQueueIndex(2, 3, "repeat")).toBe(0);
  expect(nextQueueIndex(0, 0, "repeat")).toBeNull();
});

test("shuffle preserves the current item and normal order is unchanged", () => {
  const tracks = ["a", "b", "c"].map((episodeId) => ({ episodeId }));
  const shuffled = playlistOrder(tracks, "shuffle", "b", () => 0);
  expect(shuffled.map((item) => item.episodeId)).toEqual(["b", "c", "a"]);
  expect(playlistOrder(tracks, "normal").map((item) => item.episodeId)).toEqual(["a", "b", "c"]);
  expect(tracks.map((item) => item.episodeId)).toEqual(["a", "b", "c"]);
});
