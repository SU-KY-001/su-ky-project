import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorCode } from "@repo/shared";

export function renderError(
  c: Context,
  status: ContentfulStatusCode,
  errorCode: ErrorCode,
  message: string
): Response {
  return c.json({ error_code: errorCode, message }, status);
}
