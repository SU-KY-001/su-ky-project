import { describe, expect, it } from "bun:test";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { Prisma } from "@repo/db";
import { MAX_ERROR_DETAILS } from "@repo/shared";
import { errorHandler, throwOnInvalid } from "../src/core/middleware";

const PRISMA_SECRET = "Unique constraint failed on the fields: (`email`)";

function appThrowing(error: Error): Hono {
  return new Hono()
    .onError(errorHandler)
    .get("/boom", () => {
      throw error;
    });
}

async function call(error: Error): Promise<{ status: number; body: { error_code: string; message: string }; retryAfter: string | null }> {
  const response = await appThrowing(error).request("/boom");
  return { status: response.status, body: (await response.json()) as { error_code: string; message: string }, retryAfter: response.headers.get("Retry-After") };
}

const prismaError = (code: string) => new Prisma.PrismaClientKnownRequestError(PRISMA_SECRET, { code, clientVersion: "test" });

describe("errorHandler: Prisma errors", () => {
  it.each([
    ["P2002", 409, "CONFLICT"],
    ["P2003", 409, "CONFLICT"],
    ["P2025", 404, "NOT_FOUND"],
    ["P2034", 409, "WRITE_CONFLICT"],
    ["P1001", 503, "SERVICE_UNAVAILABLE"],
    ["P2024", 503, "SERVICE_UNAVAILABLE"],
  ])("%s maps to %i %s without leaking Prisma's message", async (code, status, errorCode) => {
    const result = await call(prismaError(code));
    expect(result.status).toBe(status);
    expect(result.body.error_code).toBe(errorCode);
    expect(result.body.message).not.toContain("email");
  });

  it("tells clients when to retry an unreachable database, and only then", async () => {
    expect((await call(prismaError("P1001"))).retryAfter).not.toBeNull();
    expect((await call(prismaError("P2002"))).retryAfter).toBeNull();
  });

  it("leaves unmapped Prisma codes as 500", async () => {
    expect((await call(prismaError("P2999"))).status).toBe(500);
  });

  it("treats an unreachable database as retryable but bad credentials as a plain 500", async () => {
    const init = (code?: string) => new Prisma.PrismaClientInitializationError("secret host details", "test", code);
    expect((await call(init("P1001"))).status).toBe(503);
    expect((await call(init("P1000"))).status).toBe(500);
    expect((await call(init())).status).toBe(500);
  });
});

describe("errorHandler: HTTPException", () => {
  it.each([
    [405, "METHOD_NOT_ALLOWED"],
    [415, "UNSUPPORTED_MEDIA_TYPE"],
    [429, "RATE_LIMITED"],
  ])("%i keeps its own code instead of HTTP_ERROR", async (status, errorCode) => {
    const result = await call(new HTTPException(status as 405 | 415 | 429, { message: "x" }));
    expect(result.status).toBe(status);
    expect(result.body.error_code).toBe(errorCode);
  });
});

describe("errorHandler: request validation", () => {
  const app = new Hono()
    .onError(errorHandler)
    .post("/items", zValidator("json", z.object({ name: z.string().min(1), role: z.enum(["a", "b"]).optional(), tags: z.array(z.string()).max(MAX_ERROR_DETAILS + 5) }), throwOnInvalid), (c) => c.json({ ok: true }));

  const post = (body: unknown) => app.request("/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  it("names the failing fields and never echoes what was submitted", async () => {
    const response = await post({ name: "", role: "SECRETPASSWORD", tags: [987654, 987655] });
    const raw = await response.text();
    const body = JSON.parse(raw) as { error_code: string; details: { path: string; code: string }[] };
    expect(response.status).toBe(400);
    expect(body.error_code).toBe("VALIDATION_ERROR");
    expect(body.details.map((d) => d.path).sort()).toEqual(["name", "role", "tags.0", "tags.1"]);
    expect(raw).not.toContain("98765");
    expect(raw).not.toContain("SECRETPASSWORD");
  });

  it("caps the number of reported fields", async () => {
    const body = (await (await post({ name: "x", tags: Array.from({ length: MAX_ERROR_DETAILS + 5 }, () => 1) })).json()) as { details: unknown[] };
    expect(body.details).toHaveLength(MAX_ERROR_DETAILS);
  });
});
