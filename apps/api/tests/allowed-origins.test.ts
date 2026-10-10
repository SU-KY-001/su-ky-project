import { afterEach, describe, expect, it } from "bun:test";
import { parseAllowedOrigins, trustedAuthOrigins } from "../src/core/config/allowedOrigins";

const originalCorsOrigin = process.env.CORS_ORIGIN;

afterEach(() => {
  if (originalCorsOrigin === undefined) delete process.env.CORS_ORIGIN;
  else process.env.CORS_ORIGIN = originalCorsOrigin;
});

describe("allowed origins", () => {
  it("falls back to the web dev origin when CORS_ORIGIN is unset", () => {
    delete process.env.CORS_ORIGIN;
    expect(parseAllowedOrigins()).toEqual(["http://localhost:5173"]);
  });

  it("splits on commas, trims, and drops empty entries", () => {
    process.env.CORS_ORIGIN = " http://a.test , ,http://b.test,";
    expect(parseAllowedOrigins()).toEqual(["http://a.test", "http://b.test"]);
  });

  it("keeps the wildcard for CORS but drops it for Better Auth trustedOrigins", () => {
    process.env.CORS_ORIGIN = "*,http://a.test";
    expect(parseAllowedOrigins()).toEqual(["*", "http://a.test"]);
    expect(trustedAuthOrigins()).toEqual(["http://a.test"]);
  });
});
