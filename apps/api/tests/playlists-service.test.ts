import { expect, test } from "bun:test";
import { PlaylistService, validatePlaylistOrder } from "../src/modules/playlists/playlists.service";
import type { PrismaClient } from "@repo/db";

test("reorder requires exactly every current episode", () => {
  expect(() => validatePlaylistOrder(["a", "b"], ["b", "a"])).not.toThrow();
  expect(() => validatePlaylistOrder([], [])).not.toThrow();
  for (const order of [["a"], ["b", "a", "c"], ["a", "a"], ["b", "foreign"]]) expect(() => validatePlaylistOrder(["a", "b"], order)).toThrow();
});
test("foreign owner is rejected before every playlist mutation", async () => {
  const calls: string[] = [];
  const db = { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({ $queryRaw: async (query: { values: unknown[] }) => { expect(query.values).toEqual(["playlist", "other"]); return []; }, playlist: { delete: async () => calls.push("delete"), update: async () => calls.push("update") } }) } as unknown as PrismaClient;
  const service = new PlaylistService(db);
  for (const operation of [() => service.rename("other", "playlist", "New"), () => service.delete("other", "playlist"), () => service.add("other", "playlist", "ep"), () => service.remove("other", "playlist", "ep"), () => service.reorder("other", "playlist", [])]) await expect(operation()).rejects.toMatchObject({ status: 404 });
  expect(calls).toEqual([]);
});
test("add is duplicate-safe, appends position and reorder keeps exact order", async () => {
  const rows: Array<{ episodeId: string; position: number }> = [];
  const playlist = { id: "playlist", name: "Mine", ownerId: "self", createdAt: new Date(), updatedAt: new Date() };
  const metadata = (): object => ({ ...playlist, _count: { items: rows.length } });
  const tx = {
    $queryRaw: async () => [{ id: "playlist" }],
    $executeRaw: async (query: { values: unknown[] }) => {
      for (let i = 0; i < query.values.length - 1; i += 2) rows.find((row) => row.episodeId === query.values[i])!.position = query.values[i + 1] as number;
    },
    playlist: { findUniqueOrThrow: async () => metadata(), update: async () => metadata() },
    episode: { findFirst: async () => ({ id: "episode" }) },
    playlistItem: {
      findUnique: async ({ where }: { where: { playlistId_episodeId: { episodeId: string } } }) => rows.find((row) => row.episodeId === where.playlistId_episodeId.episodeId),
      count: async () => rows.length,
      aggregate: async () => ({ _max: { position: rows.length ? Math.max(...rows.map((row) => row.position)) : null } }),
      create: async ({ data }: { data: { episodeId: string; position: number } }) => { rows.push({ ...data }); },
      findMany: async () => rows,
      update: async ({ where, data }: { where: { playlistId_episodeId: { episodeId: string } }; data: { position: number } }) => { rows.find((row) => row.episodeId === where.playlistId_episodeId.episodeId)!.position = data.position; },
    },
  };
  const db = { $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as PrismaClient;
  const service = new PlaylistService(db);
  await service.add("self", "playlist", "one"); await service.add("self", "playlist", "two"); await service.add("self", "playlist", "one");
  expect(rows.map((row) => row.position)).toEqual([0, 1]);
  expect(rows).toHaveLength(2);
  await service.reorder("self", "playlist", ["two", "one"]);
  expect(rows.find((row) => row.episodeId === "two")?.position).toBe(0);
  await expect(service.reorder("self", "playlist", ["one"])).rejects.toMatchObject({ status: 409 });
});
