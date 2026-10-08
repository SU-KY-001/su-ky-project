import { describe, expect, it } from "bun:test";
import { validateEnv } from "../src/core/env";

describe("Environment Configuration & Validation", () => {
  it("provides sensible defaults in non-production environments", () => {
    const parsed = validateEnv({
      NODE_ENV: "development",
    });

    expect(parsed.NODE_ENV).toBe("development");
    expect(parsed.PORT).toBe(3005);
    expect(parsed.BETTER_AUTH_SECRET).toBe("su-ky-auth-secret-development-key");
    expect(parsed.CORS_ORIGIN).toBe("http://localhost:5173");
    expect(parsed.LOG_LEVEL).toBe("info");
  });

  it("coerces PORT string to a number", () => {
    const parsed = validateEnv({
      NODE_ENV: "development",
      PORT: "4000",
    });

    expect(parsed.PORT).toBe(4000);
    expect(typeof parsed.PORT).toBe("number");
  });

  it("throws in production if DATABASE_URL is missing", () => {
    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: "strong-secret-key-123456789",
      })
    ).toThrow("Invalid environment configuration in production");
  });

  it("throws in production if BETTER_AUTH_SECRET uses the default dev key", () => {
    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://postgres:password@localhost:5432/suky",
        BETTER_AUTH_SECRET: "su-ky-auth-secret-development-key",
      })
    ).toThrow("Invalid environment configuration in production");
  });

  it("validates successfully in production when required variables are provided", () => {
    const parsed = validateEnv({
      NODE_ENV: "production",
      PORT: "8080",
      DATABASE_URL: "postgresql://postgres:secret@prod-db.internal:5432/suky",
      BETTER_AUTH_SECRET: "strong-prod-secret-987654321",
    });

    expect(parsed.NODE_ENV).toBe("production");
    expect(parsed.PORT).toBe(8080);
    expect(parsed.DATABASE_URL).toBe(
      "postgresql://postgres:secret@prod-db.internal:5432/suky"
    );
  });
});
