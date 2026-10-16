import { afterEach, describe, expect, it } from "bun:test";
import {
  parseAllowedOrigins,
  trustedAuthOrigins,
} from "../src/core/config/allowedOrigins";

const originalCorsOrigin = process.env.CORS_ORIGIN;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalCorsOrigin === undefined) delete process.env.CORS_ORIGIN;
  else process.env.CORS_ORIGIN = originalCorsOrigin;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
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
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGIN = "*,http://a.test";
    expect(parseAllowedOrigins()).toEqual(["*", "http://a.test"]);
    expect(trustedAuthOrigins()).not.toContain("*");
    expect(trustedAuthOrigins()).toContain("http://a.test");
  });

  it("adds local dev origins to trustedOrigins outside production only", () => {
    process.env.CORS_ORIGIN = "http://a.test";
    process.env.NODE_ENV = "development";
    expect(trustedAuthOrigins()).toEqual([
      "http://a.test",
      "http://localhost:3000",
      "http://localhost:5173",
    ]);
    process.env.NODE_ENV = "production";
    expect(trustedAuthOrigins()).toEqual(["http://a.test"]);
  });

  it("trusts the fixed Vite origin in development even when CORS_ORIGIN uses the legacy port", () => {
    process.env.NODE_ENV = "development";
    process.env.CORS_ORIGIN = "http://localhost:5173";

    expect(trustedAuthOrigins()).toEqual([
      "http://localhost:5173",
      "http://localhost:3000",
    ]);
  });

  it("does not add development origins to a production allowlist", () => {
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGIN = "https://suky.vn";

    expect(trustedAuthOrigins()).toEqual(["https://suky.vn"]);
  });
});
