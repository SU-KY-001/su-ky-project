import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { errorHandler } from "./middleware/errorHandler";
import { createAuthGuards } from "./middleware/auth";
import { app } from "./app";
import type { AuthSession, UserRole } from "./auth";
import type { AppEnv } from "./types";

function makeSession(role: UserRole): AuthSession {
  return {
    user: {
      id: `test-${role}`,
      name: "Test User",
      email: `${role}@example.com`,
      emailVerified: true,
      image: null,
      role,
    },
    session: {
      expiresAt: new Date(Date.now() + 60_000),
    },
  };
}

function createProtectedTestApp(role: UserRole | null) {
  const { requireAuth, requireRole } = createAuthGuards(async () =>
    role ? makeSession(role) : null
  );

  return new Hono<AppEnv>()
    .onError(errorHandler)
    .get("/moderator", requireAuth, requireRole("moderator"), (c) =>
      c.json({ success: true })
    )
    .get("/admin", requireAuth, requireRole("admin"), (c) =>
      c.json({ success: true })
    );
}

describe("Better Auth API guards", () => {
  it("rejects protected APIs when there is no session", async () => {
    const app = createProtectedTestApp(null);
    const response = await app.request("/moderator");

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects Customer access to Moderator and Admin APIs", async () => {
    const app = createProtectedTestApp("customer");

    for (const path of ["/moderator", "/admin"]) {
      const response = await app.request(path);
      expect(response.status).toBe(403);
      const body = (await response.json()) as { error: { code: string } };
      expect(body.error.code).toBe("FORBIDDEN");
    }
  });

  it("allows only Moderator accounts to access the Moderator API", async () => {
    const moderatorResponse = await createProtectedTestApp("moderator").request("/moderator");
    const adminResponse = await createProtectedTestApp("admin").request("/moderator");

    expect(moderatorResponse.status).toBe(200);
    expect(adminResponse.status).toBe(403);
  });

  it("allows only Admin accounts to access the Admin API", async () => {
    const adminResponse = await createProtectedTestApp("admin").request("/admin");
    const moderatorResponse = await createProtectedTestApp("moderator").request("/admin");

    expect(adminResponse.status).toBe(200);
    expect(moderatorResponse.status).toBe(403);
  });
});

describe("Better Auth HTTP integration", () => {
  it("mounts Better Auth and returns an empty session for anonymous requests", async () => {
    const response = await app.request("/api/auth/get-session");

    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("returns 401 from the current-user endpoint without a session", async () => {
    const response = await app.request("/api/me");

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("protects the mounted Moderator and Admin API paths", async () => {
    for (const path of ["/api/moderator", "/api/admin"]) {
      const response = await app.request(path);

      expect(response.status).toBe(401);
      const body = (await response.json()) as { error: { code: string } };
      expect(body.error.code).toBe("UNAUTHORIZED");
    }
  });
});
