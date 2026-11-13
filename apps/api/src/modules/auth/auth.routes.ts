import { Hono } from "hono";
import { requireAuth } from "./auth.middleware";
import type { AppEnv } from "../../types";
import { zValidator } from "@hono/zod-validator";
import { DeleteProfileSchema, UpdateProfileSchema } from "@repo/shared";
import { rateLimit, throwOnInvalid } from "../../core/middleware";
import { DomainError } from "../../core/errors/domain-error";
import { ProfileService } from "./profile.service";
import { MAX_AVATAR_BYTES } from "./avatar-validation";
import type { MiddlewareHandler } from "hono";
import { trustedAuthOrigins } from "../../core/config/allowedOrigins";

const profileWriteOrigin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const allowed = [...trustedAuthOrigins(), new URL(process.env.BETTER_AUTH_URL || "http://localhost:3005").origin];
  const origin = c.req.header("Origin");
  const bearer = c.req.header("Authorization")?.startsWith("Bearer ");
  let refererOrigin: string | undefined;
  try { const referer = c.req.header("Referer"); if (referer) refererOrigin = new URL(referer).origin; } catch { /* Invalid referrers are untrusted. */ }
  if ((origin && !allowed.includes(origin)) || (!bearer && c.req.header("Cookie") && !origin && (!refererOrigin || !allowed.includes(refererOrigin)))) {
    throw new DomainError(403, "FORBIDDEN", "Nguồn yêu cầu không được phép cập nhật hồ sơ.");
  }
  await next();
};

export function createCurrentUserRoute(service: Pick<ProfileService, "get" | "update" | "delete" | "uploadAvatar"> = new ProfileService(), guard: MiddlewareHandler<AppEnv> = requireAuth, writeLimit: MiddlewareHandler<AppEnv> = rateLimit("write"), uploadLimit: MiddlewareHandler<AppEnv> = rateLimit("media_upload")): Hono<AppEnv> {
return new Hono<AppEnv>().use("/", guard).use("/avatar", guard).get("/", async (c) => {
  const { user, session } = c.get("session")!;
  c.header("Cache-Control", "private, no-store");

  return c.json({
    user: await service.get(user.id),
    session: {
      expiresAt: session.expiresAt,
    },
  });
}).patch("/", profileWriteOrigin, writeLimit, zValidator("json", UpdateProfileSchema, throwOnInvalid), async (c) => {
  c.header("Cache-Control", "private, no-store");
  return c.json({ user: await service.update(c.get("session")!.user.id, c.req.valid("json")) });
}).delete("/", profileWriteOrigin, writeLimit, zValidator("json", DeleteProfileSchema, throwOnInvalid), async (c) => {
  c.header("Cache-Control", "private, no-store");
  return c.json(await service.delete(c.get("session")!.user.id, c.req.valid("json")));
}).post("/avatar", profileWriteOrigin, uploadLimit, async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) throw new DomainError(400, "VALIDATION_ERROR", "Vui lòng chọn ảnh đại diện.");
  if (file.size > MAX_AVATAR_BYTES) throw new DomainError(422, "MEDIA_TOO_LARGE", "Ảnh không được vượt quá 5 MB.");
  c.header("Cache-Control", "private, no-store");
  return c.json({ user: await service.uploadAvatar(c.get("session")!.user.id, file) });
});
}

export const currentUserRoute = createCurrentUserRoute();
