import { describe, expect, test } from "bun:test";
import { Hono, type MiddlewareHandler } from "hono";
import type { UserRole } from "@repo/shared";
import { createCurrentUserRoute } from "../src/modules/auth/auth.routes";
import { createAuthGuards } from "../src/modules/auth/auth.middleware";
import { makeSession } from "./support/integration";
import { errorHandler } from "../src/core/middleware";
import type { AppEnv } from "../src/types";

const noLimit: MiddlewareHandler<AppEnv> = async (_c, next) => { await next(); };
function harness(role: UserRole | null) {
  const calls: string[] = [];
  const session = makeSession("self", role ?? "user");
  const service = {
    get: async (id: string) => { calls.push(id); return session.user; },
    update: async (id: string) => { calls.push(id); return session.user; },
    delete: async (id: string) => { calls.push(id); return { success: true as const }; },
    uploadAvatar: async (id: string) => { calls.push(id); return session.user; },
  };
  const { requireAuth } = createAuthGuards(async () => role ? session : null);
  const app = new Hono<AppEnv>().onError(errorHandler).route("/api/me", createCurrentUserRoute(service, requireAuth, noLimit, noLimit));
  return { app, calls };
}
describe("profile APIs", () => {
  test("rejects a hostile-origin multipart request before avatar service", async () => {
    const { app, calls } = harness("user");
    const form = new FormData();
    form.append("file", new File([new Uint8Array([255,216,255])], "a.jpg", { type: "image/jpeg" }));
    expect((await app.request("/api/me/avatar", { method: "POST", headers: { origin: "https://attacker.test", cookie: "better-auth.session_token=victim" }, body: form })).status).toBe(403);
    expect(calls).toEqual([]);
  });
  for (const role of ["user", "moderator", "admin"] as const) {
    test(`${role} can read/update/upload/delete self`, async () => {
      const { app, calls } = harness(role);
      expect((await app.request("/api/me")).status).toBe(200);
      expect((await app.request("/api/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "New Name" }) })).status).toBe(200);
      const form = new FormData();
      form.append("file", new File([new Uint8Array([255, 216, 255])], "avatar.jpg", { type: "image/jpeg" }));
      expect((await app.request("/api/me/avatar", { method: "POST", body: form })).status).toBe(200);
      expect((await app.request("/api/me", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "secret", confirm: true }) })).status).toBe(200);
      expect(calls).toEqual(["self", "self", "self", "self"]);
    });
  }
  test("guests cannot access any profile operation", async () => {
    const { app, calls } = harness(null);
    for (const method of ["GET", "PATCH", "DELETE"]) expect((await app.request("/api/me", { method })).status).toBe(401);
    expect((await app.request("/api/me/avatar", { method: "POST" })).status).toBe(401);
    expect(calls).toEqual([]);
  });
  test("rejects foreign owner/role and missing delete confirmation before service", async () => {
    const { app, calls } = harness("admin");
    for (const body of [{ name: "Valid", userId: "other" }, { name: "Valid", role: "admin" }]) {
      expect((await app.request("/api/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).status).toBe(400);
    }
    expect((await app.request("/api/me", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "secret" }) })).status).toBe(400);
    expect(calls).toEqual([]);
  });
});
