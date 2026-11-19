import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type { AppEnv } from "../src/types";
import type { Session } from "../src/modules/auth";
import { studioQuizRoute } from "../src/modules/gamification/gamification.routes";

const EPISODE_ID = "11111111-1111-4111-8111-111111111111";

// Mounted quiz middleware must not deny Admin access to unrelated studio content routes.
const app = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    c.set("session", { user: { id: "admin", role: "admin" } } as Session);
    await next();
  })
  .route("/api/studio", studioQuizRoute)
  .post("/api/studio/episodes/:id/publish", (c) => c.body(null, 204));

describe("studio role isolation", () => {
  it("lets an Admin reach the content publication handler", async () => {
    expect((await app.request(`/api/studio/episodes/${EPISODE_ID}/publish`, { method: "POST" })).status).toBe(204);
  });

  it("keeps moderator-only quiz routes unavailable to Admin", async () => {
    expect((await app.request(`/api/studio/episodes/${EPISODE_ID}/quiz`)).status).toBe(403);
  });
});
