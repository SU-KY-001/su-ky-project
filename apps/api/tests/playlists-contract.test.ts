import { expect, test } from "bun:test";
import { PlaylistNameSchema, AddPlaylistItemSchema, ReorderPlaylistSchema } from "@repo/shared";

test("playlist accepts trimmed names and rejects owner injection and series", () => {
  expect(PlaylistNameSchema.parse({ name: "  Lịch sử Việt Nam  " })).toEqual({ name: "Lịch sử Việt Nam" });
  for (const body of [{ name: " " }, { name: "A", userId: "other" }, { name: "a".repeat(101) }]) expect(PlaylistNameSchema.safeParse(body).success).toBe(false);
  expect(AddPlaylistItemSchema.safeParse({ seriesId: crypto.randomUUID() }).success).toBe(false);
});
test("reorder rejects duplicate entries and arbitrary extra properties", () => {
  const id = crypto.randomUUID();
  expect(ReorderPlaylistSchema.safeParse({ episodeIds: [id, id] }).success).toBe(false);
  expect(ReorderPlaylistSchema.safeParse({ episodeIds: [], ownerId: "other" }).success).toBe(false);
  expect(ReorderPlaylistSchema.safeParse({ episodeIds: [id] }).success).toBe(true);
});
