import { describe, expect, it } from "bun:test";
import { localDevelopmentEnvironment } from "./local-env";

describe("local development environment", () => {
  const database =
    "postgresql://developer:local-password@localhost:5433/team_existing_db";
  it("preserves the developer's database and keys while pinning FE, BE and cookies to localhost", () => {
    const original = {
      DATABASE_URL: database,
      VITE_API_URL: "https://deployed.example.com",
      BETTER_AUTH_URL: "https://deployed.example.com",
      CORS_ORIGIN: "https://deployed.example.com",
      PORT: "8000",
      BETTER_AUTH_SECRET: "existing-secret",
      CLOUDINARY_API_KEY: "existing-key",
    };
    const resolved = localDevelopmentEnvironment(original);
    expect(resolved).toMatchObject({
      DATABASE_URL: database,
      VITE_API_URL: "http://localhost:3005",
      BETTER_AUTH_URL: "http://localhost:3005",
      CORS_ORIGIN: "http://localhost:3000",
      PORT: "3005",
      NODE_ENV: "development",
      BETTER_AUTH_SECRET: "existing-secret",
      CLOUDINARY_API_KEY: "existing-key",
    });
    expect(original.PORT).toBe("8000");
  });
  it("allows a private machine override without committing personal database names", () => {
    const result = localDevelopmentEnvironment({
      DATABASE_URL: "postgresql://user@shared.example.com/team",
      LOCAL_DATABASE_URL: database,
      LOCAL_API_PORT: "3015",
    });
    expect(result.DATABASE_URL).toBe(database);
    expect(result.VITE_API_URL).toBe("http://localhost:3015");
  });
  it("rejects shared servers, malformed URLs and conflicting ports without exposing credentials", () => {
    expect(() => localDevelopmentEnvironment({})).toThrow("Thiếu DATABASE_URL");
    expect(() =>
      localDevelopmentEnvironment({ DATABASE_URL: "not-a-url" }),
    ).toThrow("không hợp lệ");
    expect(() =>
      localDevelopmentEnvironment({
        DATABASE_URL:
          "postgresql://secret:password@production.example.com/live",
      }),
    ).toThrow("PostgreSQL local");
    expect(() =>
      localDevelopmentEnvironment({ DATABASE_URL: "https://localhost/db" }),
    ).toThrow("URL PostgreSQL");
    expect(() =>
      localDevelopmentEnvironment({
        DATABASE_URL: database,
        LOCAL_API_PORT: "3000",
      }),
    ).toThrow("khác cổng FE");
  });
});
