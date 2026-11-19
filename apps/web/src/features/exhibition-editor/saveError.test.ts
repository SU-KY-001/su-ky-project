import { expect, test } from "bun:test";
import { ApiError } from "@/lib/apiError";
import { exhibitionSaveError } from "./saveError";

test("reports the artwork and placement rejected by the API", () => {
  const error = new ApiError(400, "VALIDATION_ERROR", "Request validation failed", "request-123", null, [{ path: "document.items.2.placement.wallId", code: "custom" }]);
  const message = exhibitionSaveError(error);
  expect(message).toContain("Tranh 3");
  expect(message).toContain("tường");
  expect(message).toContain("request-123");
});

test("does not discard structured field errors into the generic validation text", () => {
  expect(exhibitionSaveError(new ApiError(400, "VALIDATION_ERROR", "Request validation failed", null, null, [{ path: "document.items.0.title", code: "too_small" }]))).toContain("Tranh 1: tiêu đề");
});
