import type { z } from "zod";
import { ApiError } from "./apiError";
import { apiUrl } from "./client";

const IDEMPOTENCY_HEADER = "Idempotency-Key";

type ApiRequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

/**
 * Fetches `path` with the session cookie, throws ApiError on non-2xx and parses the
 * body with a shared schema (no casts on `hc` response unions).
 */
export async function apiRequest<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  { method = "GET", body, idempotencyKey, signal }: ApiRequestOptions = {},
): Promise<z.infer<S>> {
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (idempotencyKey) headers.set(IDEMPOTENCY_HEADER, idempotencyKey);

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw await ApiError.fromResponse(response);
  return schema.parse(await response.json());
}
