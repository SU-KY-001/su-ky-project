import { describe, expect, test } from "bun:test";
import { changePasswordSchema, updateProfileSchema } from "./profileSchema";

describe("profile forms", () => {
  test("accepts a display name with an optional avatar URL", () => {
    expect(updateProfileSchema.safeParse({ name: "Vân Lê", image: "" }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ name: "Vân Lê", image: "https://example.com/avatar.jpg" }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ name: "Vân Lê", image: "not-a-url" }).success).toBe(false);
  });

  test("requires a matching, valid and different new password", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "Admin@123456", newPassword: "NewPass@123", confirmPassword: "NewPass@123" }).success).toBe(true);
    expect(changePasswordSchema.safeParse({ currentPassword: "same-password", newPassword: "same-password", confirmPassword: "same-password" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "Admin@123456", newPassword: "NewPass@123", confirmPassword: "different" }).success).toBe(false);
  });
});
