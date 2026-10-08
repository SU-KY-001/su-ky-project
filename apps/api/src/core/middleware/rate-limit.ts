import { Prisma, prisma } from "@repo/db";
import { createMiddleware } from "hono/factory";
import { DomainError } from "../errors/domain-error";
import { getSystemConfig } from "../config/system-config";
import type { AppEnv } from "../../types";

export type RateLimitPolicy = "write" | "media_upload" | "listening_progress" | "ai_import";

interface BucketRow {
  count: number;
  windowStart: Date;
}

export const rateLimit = (policy: RateLimitPolicy) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const session = c.get("session");
    if (!session) throw new DomainError(401, "AUTH_REQUIRED", "Authentication required");

    const config = await getSystemConfig(`rate_limit.${policy}`);
    const bucketKey = `${policy}:${session.user.id}`;
    const rows = await prisma.$queryRaw<BucketRow[]>(Prisma.sql`
      INSERT INTO rate_limit_buckets (bucket_key, window_start, count)
      VALUES (
        ${bucketKey},
        to_timestamp(floor(extract(epoch from now()) / ${config.windowSeconds}) * ${config.windowSeconds}),
        1
      )
      ON CONFLICT (bucket_key, window_start)
      DO UPDATE SET count = rate_limit_buckets.count + 1
      RETURNING count, window_start AS "windowStart"
    `);
    const bucket = rows[0];
    if (!bucket) throw new Error("Rate-limit bucket update returned no row");
    if (bucket.count > config.limit) {
      const retryAt = bucket.windowStart.getTime() + config.windowSeconds * 1000;
      c.header("Retry-After", String(Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))));
      throw new DomainError(429, "RATE_LIMITED", "Rate limit exceeded");
    }
    await next();
  });
