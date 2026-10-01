import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { UserRole } from "@repo/shared";
import { auth, type Session } from "../auth";
import type { AppEnv } from "../types";

type SessionResolver = (headers: Headers) => Promise<Session | null>;

const defaultGetSession: SessionResolver = (headers) =>
  auth.api.getSession({ headers });

const hasRole = (userRole: string | null | undefined, targetRole: UserRole) => {
  if (!userRole) return false;
  return userRole.split(",").map((r) => r.trim()).includes(targetRole);
};

export function createAuthGuards(getSession: SessionResolver = defaultGetSession) {
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
      const session = c.get("session") ?? (await getSession(c.req.raw.headers));
      if (!session) {
        throw new HTTPException(401, { message: "Authentication required" });
      }

      const hasRequiredRole = roles.some((role) => hasRole(session.user.role, role));
      if (!hasRequiredRole) {
        throw new HTTPException(403, { message: "Insufficient permissions" });
      }

      c.set("session", session);
      await next();
    });

  return { requireAuth, requireRole };
}

export const { requireAuth, requireRole } = createAuthGuards();
export const requireAdmin = requireRole("admin");
