import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import type { Session } from "../src/modules/auth";
import { createReleaseRoutes } from "../src/modules/releases/presentation/release.routes";
import type { ReleaseService } from "../src/modules/releases/application/release.service";
import type { AppEnv } from "../src/types";
import { errorHandler } from "../src/core/middleware";

const scheduleId = "00000000-0000-4000-8000-000000000001";

function fakeSession(role: "admin" | "moderator"): Session {
  return { user: { id: `${role}-1`, role } } as Session;
}

function guard(role: "admin" | "moderator"): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    c.set("session", fakeSession(role));
    c.set("requestId", "request-1");
    await next();
  };
}

function createTestApp(service: Record<string, (...args: any[]) => any>) {
  const write: MiddlewareHandler<AppEnv> = async (_c, next) => next();
  const routes = createReleaseRoutes(service as unknown as ReleaseService, {
    admin: guard("admin"),
    studio: guard("moderator"),
    write,
  });
  return new Hono<AppEnv>()
    .onError(errorHandler)
    .route("/api/admin/releases", routes.admin)
    .route("/api/studio/releases", routes.studio);
}

describe("release HTTP routes", () => {
  it("validates and creates an Admin release schedule", async () => {
    const calls: unknown[][] = [];
    const app = createTestApp({
      createSchedule: (...args: unknown[]) => {
        calls.push(args);
        return { id: scheduleId, status: "SCHEDULED" };
      },
    });
    const response = await app.request("/api/admin/releases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Lịch tháng 10",
        productionDeadline: "2026-10-19T13:00:00.000Z",
        scheduledAt: "2026-10-20T13:00:00.000Z",
        moderatorIds: ["moderator-1"],
      }),
    });
    expect(response.status).toBe(201);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[2]).toBe("request-1");
  });

  it("rejects a production deadline after the release time", async () => {
    const app = createTestApp({ createSchedule: () => ({}) });
    const response = await app.request("/api/admin/releases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Lịch sai",
        productionDeadline: "2026-10-21T13:00:00.000Z",
        scheduledAt: "2026-10-20T13:00:00.000Z",
        moderatorIds: ["moderator-1"],
      }),
    });
    expect(response.status).toBe(400);
  });

  it("returns assigned work and submits the current revision for review", async () => {
    const calls: unknown[][] = [];
    const app = createTestApp({
      assignedWork: () => [{ id: scheduleId, title: "Podcast được giao" }],
      submitReview: (...args: unknown[]) => {
        calls.push(args);
        return { id: "review-1", status: "IN_REVIEW" };
      },
    });
    const list = await app.request("/api/studio/releases/assignments");
    expect(list.status).toBe(200);
    expect(((await list.json()) as { items: unknown[] }).items).toHaveLength(1);

    const submit = await app.request(`/api/studio/releases/${scheduleId}/submit-review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentRevision: 3 }),
    });
    expect(submit.status).toBe(200);
    expect(calls[0]?.[2]).toBe(3);
  });

  it("exposes assignable episodes, review queue, reminders and episode linking", async () => {
    const calls: unknown[][] = [];
    const episodeId = "00000000-0000-4000-8000-000000000002";
    const app = createTestApp({
      assignableEpisodes: () => [{ id: episodeId }],
      reviewQueue: () => [{ id: scheduleId }],
      productionReminders: () => [{ id: "reminder-1" }],
      linkEpisode: (...args: unknown[]) => {
        calls.push(args);
        return { id: scheduleId, episodeId };
      },
    });

    for (const path of ["assignable-episodes", "review-queue", "reminders"]) {
      const response = await app.request(`/api/studio/releases/${path}`);
      expect(response.status).toBe(200);
      expect(((await response.json()) as { items: unknown[] }).items).toHaveLength(1);
    }

    const linked = await app.request(`/api/studio/releases/${scheduleId}/link-episode`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ episodeId }),
    });
    expect(linked.status).toBe(200);
    expect(calls[0]?.[2]).toBe(episodeId);
  });
});
