import { describe, expect, it } from "bun:test";
import { ApiError } from "@/lib/apiError";
import { describeStartError } from "./aiCheck/messages";
import { describeComposeError } from "./compose/composeMessages";

const err = (status: number, code: string | null) => new ApiError(status, code, "server message", null, null);

describe("ApiError.is", () => {
  it("matches only the exact code", () => {
    expect(err(409, "STALE_WRITE").is("STALE_WRITE")).toBe(true);
    expect(err(409, "STALE_WRITE").is("CONFLICT")).toBe(false);
    expect(err(401, null).is("STALE_WRITE")).toBe(false);
  });
});

describe("describeComposeError", () => {
  it.each([409, 422])("shows the hash-mismatch hint whichever status (%i) the API uses", (status) => {
    expect(describeComposeError(err(status, "HASH_MISMATCH"), "fallback")).toBe("Đoạn đã đổi, chọn lại rồi viết lại.");
  });

  it("keeps AI_DISABLED distinct from other 503s", () => {
    expect(describeComposeError(err(503, "AI_DISABLED"), "f")).toContain("đang tắt");
    expect(describeComposeError(err(503, "AI_UNAVAILABLE"), "f")).toContain("tạm không dùng được");
  });
});

describe("describeStartError", () => {
  it("claims 'already running' only for its own code, not any 409", () => {
    expect(describeStartError(err(409, "AI_CHECK_ALREADY_RUNNING"))).toContain("đang có một lượt rà");
    expect(describeStartError(err(409, "CONTENT_IN_TRASH"))).toBe("server message");
  });
});
