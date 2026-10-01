import { Hono } from "hono";
import { requireAdmin } from "../middleware/auth";
import type { AppEnv } from "../types";

export const adminRoute = new Hono<AppEnv>()
  .use("*", requireAdmin)
  .get("/", (c) =>
    c.json({
      success: true,
      data: { message: "Admin access granted" },
    })
  );
