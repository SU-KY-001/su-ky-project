import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../types";

export const currentUserRoute = new Hono<AppEnv>().get("/", requireAuth, (c) => {
  const { user, session } = c.get("session")!;

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
      },
      session: {
        expiresAt: session.expiresAt,
      },
    },
  });
});
