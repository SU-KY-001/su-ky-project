import { expect, test } from "bun:test";
import { Hono, type MiddlewareHandler } from "hono";
import { createPlaylistsRoute } from "../src/modules/playlists/playlists.routes";
import { createAuthGuards } from "../src/modules/auth/auth.middleware";
import { makeSession } from "./support/integration";
import { errorHandler } from "../src/core/middleware";
import type { AppEnv } from "../src/types";

const noop: MiddlewareHandler<AppEnv> = async (_c, next) => { await next(); };
const id = crypto.randomUUID(); const episodeId = crypto.randomUUID();
for (const role of ["user", "moderator", "admin"] as const) {
  test(`playlist operations always receive session owner for ${role}`, async () => {
    const owners: string[] = [];
    const playlist = { id, name: "Mine", createdAt: new Date(), updatedAt: new Date(), itemCount: 0 };
    const record = async (ownerId: string): Promise<typeof playlist> => { owners.push(ownerId); return playlist; };
    const service = { list: async (ownerId: string) => { owners.push(ownerId); return { items: [], page: 1, limit: 4, total: 0 }; }, get: async (ownerId: string) => { owners.push(ownerId); return { playlist, items: [], page: 1, limit: 4, total: 0 }; }, create: record, rename: record, delete: async (ownerId: string) => { owners.push(ownerId); }, add: record, remove: record, reorder: record };
    const app = new Hono<AppEnv>().onError(errorHandler).route("/playlists", createPlaylistsRoute(service, createAuthGuards(async () => makeSession("self", role)).requireAuth, noop, noop));
    const request = async (url: string, method: string, body?: object): Promise<Response> => app.request(url, { method, ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
    expect((await request("/playlists", "GET")).status).toBe(200);
    const created = await request("/playlists", "POST", { name: "Mine" });
    expect(created.status).toBe(201); expect(created.headers.get("Location")).toBe(`/api/me/playlists/${id}`);
    expect((await request(`/playlists/${id}`, "GET")).status).toBe(200);
    expect((await request(`/playlists/${id}`, "PATCH", { name: "New" })).status).toBe(200);
    expect((await request(`/playlists/${id}/items`, "POST", { episodeId })).status).toBe(200);
    expect((await request(`/playlists/${id}/items/${episodeId}`, "DELETE")).status).toBe(200);
    expect((await request(`/playlists/${id}/items/order`, "PUT", { episodeIds: [] })).status).toBe(200);
    expect((await request(`/playlists/${id}`, "DELETE")).status).toBe(204);
    expect(owners).toEqual(Array(8).fill("self"));
    expect((await request("/playlists", "POST", { name: "Mine", ownerId: "other" })).status).toBe(400);
    expect((await request(`/playlists/${id}/items`, "POST", { seriesId: episodeId })).status).toBe(400);
    expect(owners).toHaveLength(8);
  });
}
test("all playlist endpoints reject anonymous clients", async () => {
  const app = new Hono<AppEnv>().onError(errorHandler).route("/playlists", createPlaylistsRoute(undefined, createAuthGuards(async () => null).requireAuth, noop, noop));
  for (const [method, path] of [["GET", ""], ["POST", ""], ["GET", `/${id}`], ["PATCH", `/${id}`], ["DELETE", `/${id}`], ["POST", `/${id}/items`], ["DELETE", `/${id}/items/${episodeId}`], ["PUT", `/${id}/items/order`]]) expect((await app.request(`/playlists${path}`, { method })).status).toBe(401);
});
