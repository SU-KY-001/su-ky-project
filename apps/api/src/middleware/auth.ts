import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth, type AuthSession, type UserRole } from "../auth";
import type { AppEnv } from "../types";

type SessionResolver = (headers: Headers) => Promise<AuthSession | null>;

const resolveSession: SessionResolver = (headers) =>
  auth.api.getSession({ headers });

export function createAuthGuards(getSession: SessionResolver = resolveSession) {
  const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
    const session = await getSession(c.req.raw.headers);
    if (!session) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    c.set("session", session);
    await next();
  });

  const requireRole = (...roles: UserRole[]) =>
    createMiddleware<AppEnv>(async (c, next) => {
      const session = c.get("session");
      if (!session) {
        throw new HTTPException(401, { message: "Authentication required" });
      }

      const userRole = session.user.role;
      const hasRequiredRole = Array.isArray(userRole)
        ? roles.some((role) => userRole.includes(role))
        : roles.some((role) => role === userRole);

      if (!hasRequiredRole) {
        throw new HTTPException(403, { message: "Insufficient permissions" });
      }

      await next();
    });

  return { requireAuth, requireRole };
}

export const { requireAuth, requireRole } = createAuthGuards();
