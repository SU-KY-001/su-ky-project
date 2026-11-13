import { describe, expect, it } from "bun:test";
import { AdminMembershipReportQuerySchema, AdminTransactionQuerySchema } from "@repo/shared";
import { mapOrder } from "../src/modules/membership/application/membership.mappers";
import type { MembershipOrderEntity } from "../src/modules/membership/domain/membership.entity";
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
