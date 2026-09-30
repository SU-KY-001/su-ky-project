import { Hono } from "hono";
import { requireAuth, requireRole } from "../middleware/auth";
import type { AppEnv } from "../types";

export const moderatorRoute = new Hono<AppEnv>()
  .use("*", requireAuth, requireRole("moderator"))
  .get("/", (c) =>
    c.json({
      success: true,
      data: { message: "Moderator access granted" },
    })
  );

export const adminRoute = new Hono<AppEnv>()
  .use("*", requireAuth, requireRole("admin"))
  .get("/", (c) =>
    c.json({
      success: true,
      data: { message: "Admin access granted" },
    })
  );
