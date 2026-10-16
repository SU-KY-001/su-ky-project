import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { adminReleaseService } from "./adminReleaseService";
import type { SystemHealthDto } from "@repo/shared";

const scheduleId = "00000000-0000-4000-8000-000000000001";
const originalFetch = globalThis.fetch;
let requestedUrls: string[] = [];
let responseBody: unknown;

function schedulePayload(status = "SCHEDULED") {
  return {
    id: scheduleId,
    episodeId: null,
    title: "Dấu chân Trường Sơn",
    productionDeadline: "2026-10-19T13:00:00.000Z",
    scheduledAt: "2026-10-20T13:00:00.000Z",
    status,
    version: 1,
    createdById: "admin-1",
    publishedAt: null,
    cancelledAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    assignments: [],
    reviews: [],
    episode: null,
  };
}

beforeEach(() => {
  requestedUrls = [];
  responseBody = {};
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    requestedUrls.push(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url,
    );
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("admin release service", () => {
  it("reads the actual worker health even when the healthcheck is degraded (503)", async () => {
    const health: SystemHealthDto = { status: "degraded", service: "su-ky-api", version: "0.0.1", runtime: "Bun", bunVersion: "1.4.0", database: "connected", queue: "running", releaseWorker: "stale", uptimeSeconds: 60, timestamp: new Date().toISOString() };
    globalThis.fetch = mock(async () => new Response(JSON.stringify(health), { status: 503, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
    expect(await adminReleaseService.health()).toEqual(health);
  });

  it("serializes every workspace filter", async () => {
    responseBody = { items: [], page: 2, limit: 12, total: 0 };

    await adminReleaseService.list({
      status: "SCHEDULED",
      q: "Trường Sơn",
      moderatorId: "moderator-1",
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-31T23:59:59.000Z",
      page: 2,
      limit: 12,
      scope: "REVIEW_QUEUE",
    });

    const url = new URL(requestedUrls[0]!);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      status: "SCHEDULED",
      q: "Trường Sơn",
      moderatorId: "moderator-1",
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-31T23:59:59.000Z",
      page: "2",
      limit: "12",
      scope: "REVIEW_QUEUE",
    });
  });

  it("parses readiness and workload responses with shared schemas", async () => {
    responseBody = schedulePayload("READY_TO_PUBLISH");
    const ready = await adminReleaseService.checkReadiness(scheduleId);
    expect(ready.status).toBe("READY_TO_PUBLISH");
    expect(ready.scheduledAt).toBeInstanceOf(Date);
    expect(requestedUrls.at(-1)).toEndWith(`/api/admin/releases/${scheduleId}/check-readiness`);

    responseBody = {
      items: [{ moderatorId: "moderator-1", name: "Nguyễn Minh Anh", open: 2, nearDeadline: 1 }],
    };
    const workload = await adminReleaseService.workload();
    expect(workload.items[0]).toEqual({
      moderatorId: "moderator-1",
      name: "Nguyễn Minh Anh",
      open: 2,
      nearDeadline: 1,
    });
  });
});
