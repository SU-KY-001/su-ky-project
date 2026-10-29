import { describe, expect, it } from "bun:test";
import { ApiError } from "./apiError";

const respond = (status: number, body: unknown) => ApiError.fromResponse({ status, headers: new Headers(), json: async () => body });

describe("ApiError.fromResponse", () => {
  it("keeps the failing fields of a validation error", async () => {
    const error = await respond(400, { error_code: "VALIDATION_ERROR", message: "Request validation failed", details: [{ path: "name", code: "too_small" }] });
    expect(error.details).toEqual([{ path: "name", code: "too_small" }]);
    expect(error.is("VALIDATION_ERROR")).toBe(true);
  });

  it("has no details when the server sends none or sends garbage, without losing the code", async () => {
    expect((await respond(409, { error_code: "STALE_WRITE", message: "x" })).details).toEqual([]);
    const garbled = await respond(400, { error_code: "VALIDATION_ERROR", message: "x", details: "nope" });
    expect(garbled.details).toEqual([]);
    expect(garbled.errorCode).toBe("VALIDATION_ERROR");
  });
});
