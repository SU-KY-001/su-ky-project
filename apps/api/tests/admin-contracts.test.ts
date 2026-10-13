import { describe, expect, test } from "bun:test";
import {
  ActivateWeeklyMissionSchema,
  AdminBanUserSchema,
  AdminContentActionSchema,
  AdminCreateUserSchema,
  AdminHistoricalPeriodInputSchema,
  AdminHistoricalPeriodPatchSchema,
  AdminTopicInputSchema,
  AdminUpdateUserSchema,
} from "@repo/shared";

describe("Admin API contracts", () => {
  test("accepts the fixed role set and rejects unknown roles", () => {
    expect(AdminCreateUserSchema.safeParse({ name: "Điều hành", email: "admin@example.com", password: "strong-pass", role: "moderator" }).success).toBe(true);
    expect(AdminCreateUserSchema.safeParse({ name: "Sai role", email: "bad@example.com", password: "strong-pass", role: "editor" }).success).toBe(false);
    expect(AdminUpdateUserSchema.safeParse({ role: "admin" }).success).toBe(true);
  });

  test("requires a meaningful ban reason", () => {
    expect(AdminBanUserSchema.safeParse({ reason: "Vi phạm điều khoản" }).success).toBe(true);
    expect(AdminBanUserSchema.safeParse({ reason: "   " }).success).toBe(false);
  });

  test("only exposes the three supported content interventions", () => {
    for (const action of ["hide", "trash", "restore"]) expect(AdminContentActionSchema.safeParse({ action }).success).toBe(true);
    expect(AdminContentActionSchema.safeParse({ action: "publish" }).success).toBe(false);
  });

  test("coerces weekly mission dates at the HTTP boundary", () => {
    const result = ActivateWeeklyMissionSchema.parse({ missionTemplateId: "4ea6e5c9-1813-4fe3-ae44-1fe832d981d9", weekStartDate: "2026-10-19T00:00:00.000Z" });
    expect(result.weekStartDate).toBeInstanceOf(Date);
  });

  test("validates Admin-managed taxonomy fields", () => {
    expect(AdminTopicInputSchema.safeParse({ name: "Kháng chiến", sortOrder: 1 }).success).toBe(true);
    expect(AdminHistoricalPeriodInputSchema.safeParse({ name: "Nhà Lý", startYear: 1009, endYear: 1225 }).success).toBe(true);
    expect(AdminHistoricalPeriodInputSchema.safeParse({ name: "Sai khoảng", startYear: 1225, endYear: 1009 }).success).toBe(false);
    expect(AdminHistoricalPeriodPatchSchema.safeParse({ endYear: 1946 }).success).toBe(false);
  });
});
