import { Prisma, prisma } from "@repo/db";
import { ErrorResponseSchema, RETRYABLE_ERROR_CODES, type ErrorCode } from "@repo/shared";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { getSystemConfig } from "../config/system-config";
import { DomainError } from "../errors/domain-error";
import type { AppEnv } from "../../types";

const uuidV4Schema = z.string().uuid().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const RETRYABLE_CODES = new Set<ErrorCode>(RETRYABLE_ERROR_CODES);

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const idempotency = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const session = c.get("session");
    if (!session) throw new DomainError(401, "AUTH_REQUIRED", "Authentication required");

    const parsedKey = uuidV4Schema.safeParse(c.req.header("Idempotency-Key"));
    if (!parsedKey.success) {
      throw new DomainError(400, "IDEMPOTENCY_KEY_REQUIRED", "A UUID v4 Idempotency-Key is required");
    }

    const rawBody = await c.req.text();
    let parsedBody: unknown = "";
    if (rawBody.length > 0) {
      try {
        parsedBody = JSON.parse(rawBody) as unknown;
      } catch {
        throw new DomainError(400, "BAD_REQUEST", "Malformed JSON body");
      }
    }

    const route = `${c.req.method} ${c.req.routePath || c.req.path}`;
    const requestHash = await sha256(`${route}\n${c.req.path}\n${rawBody ? canonicalJson(parsedBody) : ""}`);
    const ttlHours = await getSystemConfig("idempotency.ttl_hours");
    const lockTimeoutSeconds = await getSystemConfig("idempotency.lock_timeout_seconds");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const claim = async (): Promise<boolean> => {
      const result = await prisma.idempotencyKey.createMany({
        data: [{
          userId: session.user.id,
          key: parsedKey.data,
          method: c.req.method,
          route,
          requestHash,
          status: "IN_PROGRESS",
          expiresAt,
        }],
        skipDuplicates: true,
      });
      return result.count === 1;
    };

    let ownsClaim = await claim();
    if (!ownsClaim) {
      let existing = await prisma.idempotencyKey.findUnique({
        where: { userId_key: { userId: session.user.id, key: parsedKey.data } },
      });
      if (!existing) {
        ownsClaim = await claim();
        if (!ownsClaim) {
          throw new DomainError(409, "IDEMPOTENCY_REQUEST_IN_PROGRESS", "Request is being claimed");
        }
      } else {
        if (existing.requestHash !== requestHash) {
          throw new DomainError(422, "IDEMPOTENCY_KEY_REUSED", "Idempotency-Key was used for a different request");
        }
        if (existing.status === "COMPLETED") {
          const headers = new Headers({
            "Content-Type": "application/json",
            "Idempotent-Replayed": "true",
          });
          if (existing.responseLocation) headers.set("Location", existing.responseLocation);
          return new Response(JSON.stringify(existing.responseBody), {
            status: existing.responseStatus ?? 500,
            headers,
          });
        }

        const cutoff = new Date(now.getTime() - lockTimeoutSeconds * 1000);
        if (existing.createdAt >= cutoff) {
          c.header("Retry-After", String(lockTimeoutSeconds));
          throw new DomainError(409, "IDEMPOTENCY_REQUEST_IN_PROGRESS", "Original request is still running");
        }
        const takeover = await prisma.idempotencyKey.updateMany({
          where: { id: existing.id, status: "IN_PROGRESS", createdAt: { lt: cutoff } },
          data: { createdAt: now, expiresAt, requestHash },
        });
        if (takeover.count !== 1) {
          throw new DomainError(409, "IDEMPOTENCY_REQUEST_IN_PROGRESS", "Another request reclaimed this key");
        }
      }
    }

    await next();
    const response = c.res.clone();
    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = { detail: await response.text() };
    }
    const parsedError = ErrorResponseSchema.safeParse(responseBody);
    const code = parsedError.success ? parsedError.data.error_code : undefined;
    if (response.status >= 500 || (code && RETRYABLE_CODES.has(code))) {
      await prisma.idempotencyKey.deleteMany({
        where: { userId: session.user.id, key: parsedKey.data },
      });
      return;
    }
    // Response.json guarantees JSON-compatible data; Prisma's input type only excludes undefined.
    const storedBody = responseBody as Prisma.InputJsonValue;
    await prisma.idempotencyKey.updateMany({
      where: { userId: session.user.id, key: parsedKey.data, status: "IN_PROGRESS" },
      data: {
        status: "COMPLETED",
        responseStatus: response.status,
        responseBody: storedBody,
        responseLocation: response.headers.get("Location"),
      },
    });
  });
