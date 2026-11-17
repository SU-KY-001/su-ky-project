import { afterAll, expect, mock, test } from "bun:test";
import type { MembershipRepository } from "../src/modules/membership/domain/membership.repository";

const quota = { enforced: true, limit: 4, usedToday: 1, remaining: 3, resetsAt: new Date("2026-11-18T17:00:00.000Z") };
mock.module("../src/modules/listening/application/daily-quota", () => ({
  getDailyQuotaStatus: async () => quota,
  reserveDailyPlay: async () => ({ outcome: "allowed" }),
}));
const { MembershipService } = await import("../src/modules/membership/application/membership.service");

afterAll(() => mock.restore());

function serviceWith(active: { expiresAt: Date } | null) {
  const repo = {
    findActiveMembership: async () => (active ? { ...active, plan: { code: "monthly" } } : null),
    findLatestOrder: async () => null,
  } as unknown as MembershipRepository;
  return new MembershipService(repo, {} as never);
}

test("free users get today's quota object", async () => {
  expect((await serviceWith(null).getEntitlementForUser("u", "user")).quota).toEqual(quota);
});

test("premium and staff do not get a quota", async () => {
  const active = { expiresAt: new Date(Date.now() + 3 * 86_400_000) };
  expect((await serviceWith(active).getEntitlementForUser("u", "user")).quota).toBeNull();
  expect((await serviceWith(null).getEntitlementForUser("u", "moderator")).quota).toBeNull();
  expect((await serviceWith(null).getEntitlementForUser("u", "admin")).quota).toBeNull();
});
