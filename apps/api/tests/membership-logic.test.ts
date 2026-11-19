import { describe, expect, it } from "bun:test";
import { AdminMembershipReportQuerySchema, AdminTransactionQuerySchema, ExperienceStartQuerySchema, MembershipEntitlementSchema } from "@repo/shared";
import { mapOrder } from "../src/modules/membership/application/membership.mappers";
import { MembershipService } from "../src/modules/membership/application/membership.service";
import type { MembershipOrderEntity } from "../src/modules/membership/domain/membership.entity";
import type { MembershipRepository } from "../src/modules/membership/domain/membership.repository";
import { SepayPaymentProvider } from "../src/modules/membership/infrastructure/providers/sepay.provider";

function order(overrides: Partial<MembershipOrderEntity> = {}): MembershipOrderEntity {
  const now = new Date("2026-11-12T10:00:00+07:00");
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    planCodeSnapshot: "monthly",
    planNameSnapshot: "Gói tháng",
    priceVnd: 20000,
    durationDays: 30,
    currency: "VND",
    transferContent: "SK12345678",
    status: "pending",
    proofAssetId: null,
    rejectionReason: null,
    bankTransactionId: null,
    paidAt: null,
    verifiedBy: null,
    reviewReason: null,
    adminNote: null,
    createdAt: now,
    updatedAt: now,
    membership: null,
    ...overrides,
  };
}

describe("membership projections", () => {
  it("does not give a rejected order a future expiry", () => {
    const preview = new Date("2026-12-12T10:00:00+07:00");
    expect(mapOrder(order({ status: "rejected" }), preview).expiresAt).toBeNull();
    expect(mapOrder(order({ status: "pending" }), preview).expiresAt).toEqual(preview);
  });
});

describe("membership date validation", () => {
  it("requires a stable client start id for every quiz and exhibition admission", () => {
    expect(ExperienceStartQuerySchema.safeParse({}).success).toBe(false);
    expect(ExperienceStartQuerySchema.safeParse({ start: "invalid" }).success).toBe(false);
    const start = crypto.randomUUID();
    expect(ExperienceStartQuerySchema.parse({ start }).start).toBe(start);
  });

  it("returns the stored start and end of the Premium period", async () => {
    const startsAt = new Date("2026-11-01T00:00:00+07:00");
    const expiresAt = new Date(Date.now() + 30 * 86_400_000);
    const repo = {
      findActiveMembership: async () => ({ startsAt, expiresAt, plan: { code: "monthly" } }),
      findLatestOrder: async () => null,
    } as unknown as MembershipRepository;
    const service = new MembershipService(repo, {} as never);
    const result = MembershipEntitlementSchema.parse(await service.getEntitlement("u"));
    expect(result.startsAt).toEqual(startsAt);
    expect(result.expiresAt).toEqual(expiresAt);
    const freeRepo = { ...repo, findActiveMembership: async () => null };
    const free = MembershipEntitlementSchema.parse(await new MembershipService(freeRepo, {} as never).getEntitlement("u"));
    expect(free.startsAt).toBeNull();
    expect(free.expiresAt).toBeNull();
  });
  it("rejects calendar days that JS would normalise", () => {
    expect(AdminTransactionQuerySchema.safeParse({ from: "2026-02-31" }).success).toBe(false);
    expect(AdminMembershipReportQuerySchema.safeParse({ from: "2026-02-28", to: "2026-03-31" }).success).toBe(true);
  });
});

describe("SePay transaction dates", () => {
  it("keeps an explicit timezone instead of appending a second one", () => {
    const provider = new SepayPaymentProvider();
    const event = provider.parse({
      id: 1,
      transactionDate: "2026-11-12T10:00:00+07:00",
      transferType: "in",
      transferAmount: 20000,
      content: "SK12345678",
    });
    expect(event.transactionAt.toISOString()).toBe("2026-11-12T03:00:00.000Z");
  });
});

describe("renewal reminder", () => {
  const DAY_MS = 86_400_000;
  function serviceExpiringIn(ms: number) {
    const repo = {
      findActiveMembership: async () => ({ expiresAt: new Date(Date.now() + ms), plan: { code: "monthly" } }),
      findLatestOrder: async () => null,
    } as unknown as MembershipRepository;
    return new MembershipService(repo, {} as never);
  }

  it("shows the reminder in the last 5 days and hides it earlier", async () => {
    expect((await serviceExpiringIn(5 * DAY_MS - 60_000).getEntitlement("u")).renewSoon).toBe(true);
    expect((await serviceExpiringIn(6 * DAY_MS).getEntitlement("u")).renewSoon).toBe(false);
  });
});
