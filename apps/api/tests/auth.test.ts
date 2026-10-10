import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type { ErrorResponse, UserRole } from "@repo/shared";
import { errorHandler } from "../src/core/middleware";
import { app } from "../src/app";
import { createAuthGuards, type Session } from "../src/modules/auth";
import type { AppEnv } from "../src/types";

function makeSession(role: UserRole): Session {
  const now = new Date();
  return {
    user: {
      id: `test-${role}`,
      name: "Test User",
      email: `${role}@example.com`,
      emailVerified: true,
      image: null,
      role,
      banned: false,
      banReason: null,
      banExpires: null,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: `session-${role}`,
      userId: `test-${role}`,
      token: `token-${role}`,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: now,
      updatedAt: now,
    },
  };
}

function createProtectedTestApp(role: UserRole | null) {
  const { requireAuth, requireRole } = createAuthGuards(async () =>
    role ? makeSession(role) : null
  );

  return new Hono<AppEnv>()
    .onError(errorHandler)
    .get("/user-only", requireAuth, requireRole("user"), (c) =>
      c.json({ success: true })
    )
    .get("/admin", requireAuth, requireRole("admin"), (c) =>
      c.json({ success: true })
    );
}

describe("Better Auth API guards", () => {
  it("rejects protected APIs when there is no session", async () => {
    const app = createProtectedTestApp(null);
    const response = await app.request("/admin");

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error_code).toBe("AUTH_REQUIRED");
  });

  it("rejects standard User access to Admin APIs", async () => {
    const app = createProtectedTestApp("user");
    const response = await app.request("/admin");

    expect(response.status).toBe(403);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error_code).toBe("FORBIDDEN");
  });

  it("allows Admin accounts to access the Admin API", async () => {
    const adminResponse = await createProtectedTestApp("admin").request("/admin");

    expect(adminResponse.status).toBe(200);
    const body = (await adminResponse.json()) as { success: boolean };
    expect(body.success).toBe(true);
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
    const body = (await response.json()) as ErrorResponse;
    expect(body.error_code).toBe("AUTH_REQUIRED");
  });

  it("protects the mounted Admin API path", async () => {
    const response = await app.request("/api/admin");

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error_code).toBe("AUTH_REQUIRED");
  });
});
