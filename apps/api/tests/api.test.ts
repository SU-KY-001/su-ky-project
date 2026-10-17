import { describe, expect, it } from "bun:test";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { ErrorResponse, SystemHealthDto } from "@repo/shared";
import { app } from "../src/app";
import { errorHandler, requestId, throwOnInvalid } from "../src/core/middleware";
import type { AppEnv } from "../src/types";

describe("Su-Ky API", () => {
  it("returns bare system health data", async () => {
    const response = await app.request("/health");
    expect([200, 503]).toContain(response.status);
    const health = (await response.json()) as SystemHealthDto;
    expect(health.service).toBe("su-ky-api");
    expect(health.runtime).toBe("Bun");
    expect(["connected", "disconnected"]).toContain(health.database);
    expect(new Date(health.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("preserves a supplied request id", async () => {
    const requestIdValue = "test-request-id-12345";
    const response = await app.request("/health", {
      headers: { "X-Request-Id": requestIdValue },
    });
    expect(response.headers.get("X-Request-Id")).toBe(requestIdValue);
  });

  it("allows PATCH and Idempotency-Key in browser preflight", async () => {
    const response = await app.request("/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "PATCH",
        "Access-Control-Request-Headers": "Idempotency-Key",
      },
    });
    expect([200, 204]).toContain(response.status);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("PATCH");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("Idempotency-Key");
  });

  it("returns the minimal validation error contract", async () => {
    const validationApp = new Hono<AppEnv>()
      .use("*", requestId())
      .onError(errorHandler)
      .get(
        "/items",
        zValidator("query", z.object({ limit: z.coerce.number().int().min(1).max(50) }), throwOnInvalid),
        (c) => c.json({ limit: c.req.valid("query").limit })
      );
    const response = await validationApp.request("/items?limit=0");
    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    const error = (await response.json()) as ErrorResponse;
    expect(error).toEqual({
      error_code: "VALIDATION_ERROR",
      message: "Request validation failed",
    });
  });

  it("returns the minimal not-found error contract", async () => {
    const response = await app.request("/not-found-endpoint");
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    const error = (await response.json()) as ErrorResponse;
    expect(error).toEqual({
      error_code: "NOT_FOUND",
      message: "Route 'GET /not-found-endpoint' not found",
    });
  });
});
