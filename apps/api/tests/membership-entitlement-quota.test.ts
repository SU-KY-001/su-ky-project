import { afterAll, expect, mock, test } from "bun:test";
import type { MembershipRepository } from "../src/modules/membership/domain/membership.repository";

const quotas = [
  { feature: "podcast" as const, limit: 4, usedToday: 1, remaining: 3, resetsAt: new Date("2026-11-18T17:00:00.000Z") },
  { feature: "quiz" as const, limit: 4, usedToday: 0, remaining: 4, resetsAt: new Date("2026-11-18T17:00:00.000Z") },
  { feature: "exhibition" as const, limit: 1, usedToday: 0, remaining: 1, resetsAt: new Date("2026-11-18T17:00:00.000Z") },
];
let premium = false;
mock.module("../src/modules/membership/application/feature-quota", () => ({
  getFeatureQuotas: async (_userId: string, role: string | null) =>
    premium || role === "admin" || role === "moderator" ? [] : quotas,
  reserveFeatureUsage: async () => "allowed",
}));
const { MembershipService } = await import("../src/modules/membership/application/membership.service");

afterAll(() => mock.restore());

function serviceWith(active: { expiresAt: Date } | null) {
  premium = Boolean(active);
  const repo = {
    findActiveMembership: async () => (active ? { ...active, plan: { code: "monthly" } } : null),
    findLatestOrder: async () => null,
  } as unknown as MembershipRepository;
  return new MembershipService(repo, {} as never);
}

test("free users get today's per-feature quotas", async () => {
  const entitlement = await serviceWith(null).getEntitlementForUser("u", "user");
  expect(entitlement.quotas).toEqual(quotas);
  expect(entitlement.startsAt).toBeNull();
});

test("premium and staff do not get quotas", async () => {
  const active = { expiresAt: new Date(Date.now() + 3 * 86_400_000) };
  expect((await serviceWith(active).getEntitlementForUser("u", "user")).quotas).toEqual([]);
  expect((await serviceWith(null).getEntitlementForUser("u", "moderator")).quotas).toEqual([]);
  expect((await serviceWith(null).getEntitlementForUser("u", "admin")).quotas).toEqual([]);
});

test("renewal reminder turns on below 5 days left", async () => {
  const sixDays = new Date(Date.now() + 6 * 86_400_000);
  const fourDays = new Date(Date.now() + 4 * 86_400_000);
  expect((await serviceWith({ expiresAt: sixDays }).getEntitlement("u")).renewSoon).toBe(false);
  expect((await serviceWith({ expiresAt: fourDays }).getEntitlement("u")).renewSoon).toBe(true);
});
