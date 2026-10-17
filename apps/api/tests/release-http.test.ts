import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import type { Session } from "../src/modules/auth";
import { createReleaseRoutes } from "../src/modules/releases/presentation/release.routes";
import type { ReleaseService } from "../src/modules/releases/application/release.service";
import type { AppEnv } from "../src/types";
import { errorHandler } from "../src/core/middleware";
import { ReleaseScheduleQuerySchema } from "@repo/shared";

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
  it("exposes Admin review decisions and requires a note for requested changes", async () => {
    const calls: unknown[][] = [];
    const app = createTestApp({ reviewEpisode: (...args: unknown[]) => {
      calls.push(args);
      return { status: "APPROVED", revision: 3 };
    } });
    const response = await app.request(`/api/admin/releases/${scheduleId}/review`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "APPROVE", contentRevision: 3 }),
    });
    expect(response.status).toBe(200);
    expect(calls[0]?.[0]).toMatchObject({ user: { role: "admin" } });
    expect(calls[0]?.[2]).toMatchObject({ decision: "APPROVE", contentRevision: 3 });
    const invalid = await app.request(`/api/admin/releases/${scheduleId}/review`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "REQUEST_CHANGES", contentRevision: 3 }),
    });
    expect(invalid.status).toBe(400);
    expect(calls).toHaveLength(1);
  });
  it("accepts trimmed search and moderator filters", () => {
    expect(ReleaseScheduleQuerySchema.parse({
      q: "  trường sơn  ",
      moderatorId: "moderator-1",
      scope: "REVIEW_QUEUE",
    })).toMatchObject({
      q: "trường sơn",
      moderatorId: "moderator-1",
      scope: "REVIEW_QUEUE",
    });
    expect(() => ReleaseScheduleQuerySchema.parse({ q: "x".repeat(256) })).toThrow();
    expect(() => ReleaseScheduleQuerySchema.parse({ scope: "UNKNOWN" })).toThrow();
  });

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
        moderatorId: "moderator-1",
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
        moderatorId: "moderator-1",
      }),
    });
    expect(response.status).toBe(400);
  });

  it("forwards paginated Admin release scopes to the application service", async () => {
    const calls: unknown[][] = [];
    const app = createTestApp({
      listSchedules: (...args: unknown[]) => {
        calls.push(args);
        return { items: [], page: 2, limit: 10, total: 0 };
      },
    });

    const response = await app.request(
      "/api/admin/releases?scope=HISTORY&page=2&limit=10",
    );

    expect(response.status).toBe(200);
    expect(calls[0]?.[1]).toMatchObject({ scope: "HISTORY", page: 2, limit: 10 });
  });

  it("checks readiness through the explicit Admin command", async () => {
    const calls: unknown[][] = [];
    const app = createTestApp({
      checkReadiness: (...args: unknown[]) => {
        calls.push(args);
        return { id: scheduleId, status: "READY_TO_PUBLISH" };
      },
    });

    const response = await app.request(
      `/api/admin/releases/${scheduleId}/check-readiness`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: scheduleId,
      status: "READY_TO_PUBLISH",
    });
    expect(calls).toHaveLength(1);
    expect((calls[0]?.[0] as Session).user.role).toBe("admin");
    expect(calls[0]?.slice(1)).toEqual([scheduleId, "request-1"]);
  });

  it("returns moderator workload for the Admin workspace", async () => {
    const calls: unknown[][] = [];
    const app = createTestApp({
      workload: (...args: unknown[]) => {
        calls.push(args);
        return [{ moderatorId: "moderator-1", name: "Moderator A", open: 3, nearDeadline: 1 }];
      },
    });

    const response = await app.request("/api/admin/releases/workload");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [{ moderatorId: "moderator-1", name: "Moderator A", open: 3, nearDeadline: 1 }],
    });
    expect((calls[0]?.[0] as Session).user.role).toBe("admin");
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

  it("creates and cancels a reassignment ticket for the assigned Moderator", async () => {
    const calls: unknown[][] = [];
    const ticketId = "00000000-0000-4000-8000-000000000003";
    const app = createTestApp({
      createReassignmentTicket: (...args: unknown[]) => {
        calls.push(args);
        return { id: ticketId, status: "PENDING" };
      },
      cancelReassignmentTicket: (...args: unknown[]) => {
        calls.push(args);
        return { id: ticketId, status: "CANCELLED" };
      },
    });

    const created = await app.request(
      `/api/studio/releases/${scheduleId}/reassignment-tickets`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Tôi không thể tiếp tục vì lịch công tác đột xuất." }),
      },
    );
    expect(created.status).toBe(201);
    expect(calls[0]?.slice(1)).toEqual([
      scheduleId,
      "Tôi không thể tiếp tục vì lịch công tác đột xuất.",
      "request-1",
    ]);

    const cancelled = await app.request(
      `/api/studio/releases/reassignment-tickets/${ticketId}/cancel`,
      { method: "POST" },
    );
    expect(cancelled.status).toBe(200);
    expect(calls[1]?.slice(1)).toEqual([ticketId, "request-1"]);
  });

  it("requires a rejection reason and a replacement when Admin resolves a ticket", async () => {
    const calls: unknown[][] = [];
    const ticketId = "00000000-0000-4000-8000-000000000003";
    const app = createTestApp({
      approveReassignmentTicket: (...args: unknown[]) => {
        calls.push(args);
        return { id: ticketId, status: "APPROVED" };
      },
      rejectReassignmentTicket: (...args: unknown[]) => {
        calls.push(args);
        return { id: ticketId, status: "REJECTED" };
      },
    });

    const invalidReject = await app.request(
      `/api/admin/releases/reassignment-tickets/${ticketId}/reject`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "" }),
      },
    );
    expect(invalidReject.status).toBe(400);

    const approved = await app.request(
      `/api/admin/releases/reassignment-tickets/${ticketId}/approve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ replacementModeratorId: "moderator-2" }),
      },
    );
    expect(approved.status).toBe(200);
    expect(calls[0]?.slice(1)).toEqual([ticketId, "moderator-2", "request-1"]);
  });
});
