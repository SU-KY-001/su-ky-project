import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { ApiResponse, SystemHealthDto } from "@repo/shared";
import { app } from "../src/app";
import { errorHandler, requestId } from "../src/core/middleware";

describe("Su-Ky API Test Suite", () => {
  describe("Health Check Endpoint (GET /health)", () => {
    it("returns system health envelope adhering to SystemHealthDto", async () => {
      const res = await app.request("/health");
      expect([200, 503]).toContain(res.status);

      const body = (await res.json()) as ApiResponse<SystemHealthDto>;
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();

      const health = body.data!;
      expect(health.service).toBe("su-ky-api");
      expect(health.runtime).toBe("Bun");
      expect(typeof health.version).toBe("string");
      expect(typeof health.bunVersion).toBe("string");
      expect(["ok", "degraded", "error"]).toContain(health.status);
      expect(["connected", "disconnected"]).toContain(health.database);
      expect(typeof health.uptimeSeconds).toBe("number");
      expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(new Date(health.timestamp).toString()).not.toBe("Invalid Date");
    });

    it("echoes custom X-Request-Id if supplied by client", async () => {
      const customRequestId = "test-request-id-12345";
      const res = await app.request("/health", {
        headers: { "X-Request-Id": customRequestId },
      });

      expect(res.headers.get("X-Request-Id")).toBe(customRequestId);
    });

    it("generates and attaches UUID X-Request-Id if not provided", async () => {
      const res = await app.request("/health");
      const reqId = res.headers.get("X-Request-Id");
      expect(reqId).toBeDefined();
      expect(typeof reqId).toBe("string");
      expect(reqId!.length).toBeGreaterThan(0);
    });
  });

  describe("CORS Middleware", () => {
    it("returns CORS headers on OPTIONS preflight request", async () => {
      const res = await app.request("/health", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "GET",
        },
      });

      expect([200, 204]).toContain(res.status);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
      expect(res.headers.get("Access-Control-Expose-Headers")).toContain("X-Request-Id");
    });

    it("allows alternative localhost origins during non-production development", async () => {
      const res = await app.request("/health", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3000",
          "Access-Control-Request-Method": "GET",
        },
      });

      expect([200, 204]).toContain(res.status);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    });
  });

  describe("Route Validation & 400 Bad Request Boundaries", () => {
    it("fails 400 when limit exceeds maximum (limit > 50)", async () => {
      const res = await app.request("/api/episodes?limit=999");
      expect(res.status).toBe(400);

      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error?.code).toBe("VALIDATION_ERROR");
      expect(body.error?.message).toBe("Invalid query parameters");
      expect(body.meta?.requestId).toBeDefined();
      expect(body.meta?.timestamp).toBeDefined();
    });

    it("fails 400 when limit is less than minimum (limit < 1)", async () => {
      const res = await app.request("/api/episodes?limit=0");
      expect(res.status).toBe(400);

      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("fails 400 when page is less than minimum (page < 1)", async () => {
      const res = await app.request("/api/episodes?page=0");
      expect(res.status).toBe(400);

      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("fails 400 when category is not a valid enum value", async () => {
      const res = await app.request("/api/episodes?category=INVALID_CATEGORY");
      expect(res.status).toBe(400);

      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("404 Not Found Handling", () => {
    it("returns standard JSON error envelope on unknown GET route", async () => {
      const res = await app.request("/not-found-endpoint");
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");

      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe("NOT_FOUND");
      expect(body.error?.message).toContain("Route 'GET /not-found-endpoint' not found");
      expect(body.meta?.requestId).toBeDefined();
      expect(body.meta?.timestamp).toBeDefined();
    });

    it("returns standard JSON error envelope on unknown POST route", async () => {
      const res = await app.request("/api/v1/unknown-action", { method: "POST" });
      expect(res.status).toBe(404);

      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe("NOT_FOUND");
      expect(body.error?.message).toContain("Route 'POST /api/v1/unknown-action' not found");
    });
  });

  describe("Error Boundary & Exception Handling (onError middleware)", () => {
    it("catches unhandled exceptions and returns 500 INTERNAL_SERVER_ERROR", async () => {
      const testApp = new Hono()
        .use("*", requestId())
        .onError(errorHandler)
        .get("/crash", () => {
          throw new Error("Simulated unexpected crash");
        });

      const res = await testApp.request("/crash");
      expect(res.status).toBe(500);

      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe("INTERNAL_SERVER_ERROR");
      expect(body.error?.message).toBe("Simulated unexpected crash");
      expect(body.meta?.requestId).toBeDefined();
      expect(body.meta?.timestamp).toBeDefined();
    });

    it("catches HTTPException and preserves status code and code name", async () => {
      const testApp = new Hono()
        .use("*", requestId())
        .onError(errorHandler)
        .get("/bad-req", () => {
          throw new HTTPException(400, { message: "Malformed parameter" });
        })
        .get("/unauthorized", () => {
          throw new HTTPException(401, { message: "Access token expired" });
        })
        .get("/forbidden", () => {
          throw new HTTPException(403, { message: "Insufficient permissions" });
        })
        .get("/generic-http-error", () => {
          throw new HTTPException(502, { message: "Bad gateway upstream" });
        });

      const res400 = await testApp.request("/bad-req");
      expect(res400.status).toBe(400);
      const body400 = (await res400.json()) as ApiResponse<never>;
      expect(body400.error?.code).toBe("BAD_REQUEST");

      const res401 = await testApp.request("/unauthorized");
      expect(res401.status).toBe(401);
      const body401 = (await res401.json()) as ApiResponse<never>;
      expect(body401.success).toBe(false);
      expect(body401.error?.code).toBe("UNAUTHORIZED");
      expect(body401.error?.message).toBe("Access token expired");

      const res403 = await testApp.request("/forbidden");
      expect(res403.status).toBe(403);
      const body403 = (await res403.json()) as ApiResponse<never>;
      expect(body403.success).toBe(false);
      expect(body403.error?.code).toBe("FORBIDDEN");
      expect(body403.error?.message).toBe("Insufficient permissions");

      const res502 = await testApp.request("/generic-http-error");
      expect(res502.status).toBe(502);
      const body502 = (await res502.json()) as ApiResponse<never>;
      expect(body502.error?.code).toBe("HTTP_ERROR");
      expect(body502.error?.message).toBe("Bad gateway upstream");
    });

    it("formats unhandled ZodError into 400 VALIDATION_ERROR envelope", async () => {
      const schema = z.object({ email: z.string().email() });
      const testApp = new Hono()
        .use("*", requestId())
        .onError(errorHandler)
        .get("/validate-direct", () => {
          schema.parse({ email: "invalid-email" });
          return new Response("OK");
        });

      const res = await testApp.request("/validate-direct");
      expect(res.status).toBe(400);

      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe("VALIDATION_ERROR");
      expect(body.error?.details).toBeDefined();
    });
  });

  describe("Security Headers & Production Middlewares", () => {
    it("attaches secureHeaders on responses", async () => {
      const res = await app.request("/health");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
      expect(res.headers.get("strict-transport-security")).toBeDefined();
    });

    it("attaches ETag header on successful 200 GET requests", async () => {
      const res = await app.request("/openapi.json");
      expect(res.status).toBe(200);
      const etag = res.headers.get("etag");
      expect(etag).toBeDefined();
      expect(typeof etag).toBe("string");
      expect(etag!.length).toBeGreaterThan(0);
    });
  });

  describe("API Documentation & OpenAPI Endpoints", () => {
    it("serves OpenAPI 3.1 specification at /openapi.json", async () => {
      const res = await app.request("/openapi.json");
      expect(res.status).toBe(200);

      const spec = (await res.json()) as { openapi: string; info: { title: string } };
      expect(spec.openapi).toBe("3.1.0");
      expect(spec.info.title).toContain("Su-Ky");
    });

    it("serves interactive Scalar documentation UI at /docs", async () => {
      const res = await app.request("/docs");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      const html = await res.text();
      expect(html).toContain("Su-Ky");
    });
  });
});
