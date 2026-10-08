import { ErrorResponseSchema, type ErrorResponse } from "@repo/shared";

export class ApiError extends Error {
  constructor(readonly response: ErrorResponse) {
    super(response.message);
    this.name = "ApiError";
  }
}

export async function readJson<T>(response: { ok: boolean; json(): Promise<T> }): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new ApiError(ErrorResponseSchema.parse(body));
  return body;
}
