import { describe, expect, test } from "bun:test";
import { DeleteProfileSchema, UpdateProfileSchema } from "@repo/shared";

describe("self-service profile contracts", () => {
  test("trims names and accepts removal of avatar", () => {
    expect(UpdateProfileSchema.parse({ name: "  An Nguyen  ", image: null })).toEqual({ name: "An Nguyen", image: null });
  });
  test("rejects privilege, owner, email and arbitrary avatar URL changes", () => {
    for (const body of [{ role: "admin" }, { userId: "other" }, { email: "other@example.com" }, { image: "https://untrusted.test/a.png" }, {}, { name: " " }]) {
      expect(UpdateProfileSchema.safeParse(body).success).toBe(false);
    }
  });
  test("requires password and explicit confirmation to delete", () => {
    for (const body of [{}, { password: "secret" }, { password: "", confirm: true }, { password: "secret", confirm: false }, { password: "secret", confirm: true, userId: "other" }]) {
      expect(DeleteProfileSchema.safeParse(body).success).toBe(false);
    }
    expect(DeleteProfileSchema.safeParse({ password: "secret", confirm: true }).success).toBe(true);
  });
});
