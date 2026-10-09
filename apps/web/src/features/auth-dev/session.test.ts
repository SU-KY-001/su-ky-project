import { describe, expect, it } from "bun:test";
import { SessionResponseSchema } from "./session";

describe("SessionResponseSchema", () => {
  it("accepts null when there is no session", () => {
    expect(SessionResponseSchema.parse(null)).toBeNull();
  });

  it("accepts a user with a role and a user without one", () => {
    const withRole = SessionResponseSchema.parse({ user: { name: "Mod", email: "m@x.vn", role: "moderator" } });
    expect(withRole?.user.role).toBe("moderator");

    const withoutRole = SessionResponseSchema.parse({ user: { name: "Mod", email: "m@x.vn" } });
    expect(withoutRole?.user.role).toBeUndefined();
  });

  it("rejects a malformed body", () => {
    expect(SessionResponseSchema.safeParse({ user: { name: "Mod" } }).success).toBe(false);
    expect(SessionResponseSchema.safeParse({}).success).toBe(false);
  });
});
