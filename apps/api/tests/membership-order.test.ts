import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { AdminMembershipService } from "../src/modules/membership/application/admin-membership.service";
import { MembershipService } from "../src/modules/membership/application/membership.service";
import { PrismaMembershipRepository } from "../src/modules/membership/infrastructure/prisma-membership.repository";
import { mediaService } from "../src/modules/media";
import { detachedMediaWhere } from "../src/core/jobs/maintenance-jobs";
import { hasActiveMembership } from "../src/modules/membership/application/entitlement";
import { startExperience } from "../src/modules/membership/application/experience-access";
import { latestPremiumRenewalReminder, processPremiumRenewalReminders } from "../src/modules/membership/application/renewal-reminders";
import { RUN_INTEGRATION, assertTestDatabase } from "./support/integration";

const repo = new PrismaMembershipRepository();
const service = new MembershipService(repo, mediaService);
const userId = crypto.randomUUID();
const otherUserId = crypto.randomUUID();

async function cleanup(id: string) {
  await prisma.membership.deleteMany({ where: { userId: id } });
  await prisma.paymentTransaction.deleteMany({ where: { order: { userId: id } } });
  await prisma.membershipOrder.deleteMany({ where: { userId: id } });
  await prisma.mediaAsset.deleteMany({ where: { uploadedById: id } });
  await prisma.auditLog.deleteMany({ where: { actorId: id } });
  await prisma.user.deleteMany({ where: { id } });
}

describe.skipIf(!RUN_INTEGRATION)("Membership orders", () => {
  beforeAll(async () => {
    assertTestDatabase();
    for (const id of [userId, otherUserId])
      await prisma.user.create({ data: { id, name: `Order ${id}`, email: `${id}@example.com`, emailVerified: true } });
  });

  beforeEach(async () => {
    await prisma.membership.deleteMany({ where: { userId } });
    await prisma.paymentTransaction.deleteMany({ where: { order: { userId } } });
    await prisma.membershipOrder.deleteMany({ where: { userId } });
    await prisma.mediaAsset.deleteMany({ where: { uploadedById: userId } });
  });

  afterAll(async () => {
    await cleanup(userId);
    await cleanup(otherUserId);
    await prisma.membershipPlan.update({ where: { code: "monthly" }, data: { priceVnd: 20000 } });
  });

  it("administers only the monthly plan and audits taking it off sale", async () => {
    const admin = new AdminMembershipService(repo);
    const actor = { actorId: otherUserId, ipAddress: null };
    const monthly = await prisma.membershipPlan.findUniqueOrThrow({ where: { code: "monthly" } });
    expect((await admin.listPlans()).map(({ code }) => code)).toEqual(["monthly"]);
    expect((await service.listPlans()).filter(({ isPurchasable }) => isPurchasable)).toEqual([
      expect.objectContaining({ code: "monthly", priceVnd: 20000, durationDays: 30 }),
    ]);
    expect(() => admin.updatePlan("yearly", { isPurchasable: true }, actor)).toThrow();
    try {
      const updated = await admin.updatePlan("monthly", { isPurchasable: false }, actor);
      expect(updated.isPurchasable).toBe(false);
      expect((await service.listPlans()).some(({ code }) => code === "monthly")).toBe(false);
      const audit = await prisma.auditLog.findMany({ where: { actorId: otherUserId, resourceId: monthly.id, resourceType: "membership_plan" } });
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        action: "membership.plan.update",
        actorType: "ADMIN",
        changes: {
          before: expect.objectContaining({ isPurchasable: true }),
          after: expect.objectContaining({ isPurchasable: false }),
        },
      });
    } finally {
      await prisma.membershipPlan.update({ where: { code: "monthly" }, data: { isPurchasable: monthly.isPurchasable } });
    }
  });

  it("reuses one open order for the same plan", async () => {
    const first = await service.createOrder(userId, "monthly");
    const second = await service.createOrder(userId, "monthly");
    const third = await service.createOrder(userId, "monthly");
    expect(second.id).toBe(first.id);
    expect(third.transferContent).toBe(first.transferContent);
    expect(first.transferContent).toMatch(/^SK[A-F0-9]{8}$/);
    const count = await prisma.membershipOrder.count({ where: { userId, status: "pending" } });
    expect(count).toBe(1);
  });

  it("serialises two concurrent create calls", async () => {
    const [a, b] = await Promise.all([service.createOrder(userId, "monthly"), service.createOrder(userId, "monthly")]);
    expect(a.id).toBe(b.id);
  });

  it("rejects free and unknown plans", async () => {
    await expect(service.createOrder(userId, "free")).rejects.toMatchObject({ status: 422, code: "PLAN_NOT_PURCHASABLE" });
    await expect(service.createOrder(userId, "nope")).rejects.toMatchObject({ status: 404, code: "PLAN_NOT_FOUND" });
  });

  it("blocks a purchase that would exceed the stacking horizon", async () => {
    const monthly = await prisma.membershipPlan.findUniqueOrThrow({ where: { code: "monthly" } });
    const order = await service.createOrder(userId, "monthly");
    const activation = await repo.activateOrder({ orderId: order.id, now: new Date(), actorId: null, bankTransactionId: null, maxStackDays: 365 });
    expect(activation.status).toBe("activated");
    await prisma.membership.update({
      where: { orderId: order.id },
      data: { startsAt: new Date(), expiresAt: new Date(Date.now() + 350 * 86400000), planId: monthly.id },
    });
    await expect(service.createOrder(userId, "monthly")).rejects.toMatchObject({ status: 422, code: "STACK_LIMIT_REACHED" });
  });

  it("returns 404 for another user's order", async () => {
    const order = await service.createOrder(userId, "monthly");
    await expect(service.getOrder(otherUserId, order.id)).rejects.toMatchObject({ status: 404, code: "MEMBERSHIP_ORDER_NOT_FOUND" });
  });

  it("keeps an existing order payable at its original price when a new order uses the updated plan", async () => {
    const order = await service.createOrder(userId, "monthly");
    try {
      await prisma.membershipPlan.update({ where: { code: "monthly" }, data: { priceVnd: 25000 } });
      const created = await service.createOrder(userId, "monthly");
      expect(created.id).not.toBe(order.id);
      expect(created.priceVnd).toBe(25000);
      const old = await service.getOrder(userId, order.id);
      expect(old).toMatchObject({ status: "pending", priceVnd: 20000, bank: { qrUrl: order.bank.qrUrl, amount: 20000 } });
    } finally {
      await prisma.membershipPlan.update({ where: { code: "monthly" }, data: { priceVnd: 20000 } });
    }
  });

  it("activates one order once under concurrent activation", async () => {
    const order = await service.createOrder(userId, "monthly");
    const results = await Promise.all([
      repo.activateOrder({ orderId: order.id, now: new Date(), actorId: null, maxStackDays: 365 }),
      repo.activateOrder({ orderId: order.id, now: new Date(), actorId: null, maxStackDays: 365 }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(["activated", "already_paid"]);
    expect(await prisma.membership.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("filters assignable orders before pagination across more than twenty results", async () => {
    const plan = await prisma.membershipPlan.findUniqueOrThrow({ where: { code: "monthly" } });
    await prisma.membershipOrder.createMany({
      data: Array.from({ length: 26 }, (_, index) => ({
        userId, planId: plan.id, planCodeSnapshot: plan.code, planNameSnapshot: plan.name,
        priceVnd: index < 24 ? 20000 : 30000, durationDays: 30,
        transferContent: `TEST${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`,
        status: index === 23 ? "paid" as const : "pending" as const,
      })),
    });
    const query = { q: `${userId}@example.com`, assignableAmount: 20000, limit: 20 };
    const first = await repo.listOrdersForAdmin({ ...query, page: 1 });
    const second = await repo.listOrdersForAdmin({ ...query, page: 2 });
    expect(first.total).toBe(23);
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(3);
    expect(new Set([...first.items, ...second.items].map(({ id }) => id)).size).toBe(23);
    expect([...first.items, ...second.items].every(({ status, priceVnd }) => status === "pending" && priceVnd === 20000)).toBe(true);
  });

  it("lists Free accounts and reflects a manual grant and revocation", async () => {
    const admin = new AdminMembershipService(repo);
    const actor = { actorId: otherUserId, ipAddress: null };
    const query = { q: `${userId}@example.com`, page: 1, limit: 10 } as const;
    const free = await admin.listMembers({ ...query, status: "free" });
    expect(free.items).toContainEqual(expect.objectContaining({ userId, status: "free", source: null }));

    await admin.grant(userId, { planCode: "monthly", reason: "Tặng Premium kiểm thử" }, actor);
    const active = await admin.listMembers({ ...query, status: "active" });
    expect(active.items[0]).toMatchObject({ userId, status: "active", source: "admin" });
    const premiumStart = crypto.randomUUID();
    await startExperience("quiz", userId, "test-quiz", premiumStart);

    await admin.revoke(userId, { reason: "Thu hồi Premium kiểm thử" }, actor);
    const freeStart = crypto.randomUUID();
    await startExperience("quiz", userId, "test-quiz", freeStart);
    expect(await prisma.experienceDailyUse.findUniqueOrThrow({
      where: { userId_feature_attemptId: { userId, feature: "quiz", attemptId: premiumStart } },
    })).toMatchObject({ counted: false });
    expect(await prisma.experienceDailyUse.findUniqueOrThrow({
      where: { userId_feature_attemptId: { userId, feature: "quiz", attemptId: freeStart } },
    })).toMatchObject({ counted: true });
    expect((await admin.listMembers({ ...query, status: "free" })).items[0]).toMatchObject({
      status: "revoked", revokeReason: "Thu hồi Premium kiểm thử",
    });
    const history = await admin.listAudit({ page: 1, limit: 10, q: userId, resourceType: "membership" });
    expect(history.items.map(({ action }) => action)).toContain("membership.revoke");
  });

  it("creates one in-app reminder strictly below five days and hides it after renewal", async () => {
    const now = new Date();
    const order = await service.createOrder(userId, "monthly");
    await repo.activateOrder({ orderId: order.id, now, actorId: null, maxStackDays: 365 });
    await prisma.membership.update({
      where: { orderId: order.id },
      data: { expiresAt: new Date(now.getTime() + 5 * 86_400_000) },
    });
    await processPremiumRenewalReminders(now);
    expect(await latestPremiumRenewalReminder(userId, now)).toBeNull();
    const later = new Date(now.getTime() + 1);
    await Promise.all([processPremiumRenewalReminders(later), processPremiumRenewalReminders(later)]);
    expect(await prisma.premiumRenewalReminder.count({ where: { membership: { userId } } })).toBe(1);
    expect(await latestPremiumRenewalReminder(userId, later)).toMatchObject({ planName: "Gói tháng", renewalPath: "/thanh-vien" });

    const renewal = await service.createOrder(userId, "monthly");
    await repo.activateOrder({ orderId: renewal.id, now: later, actorId: null, maxStackDays: 365 });
    await processPremiumRenewalReminders(later);
    expect(await latestPremiumRenewalReminder(userId, later)).toBeNull();
  });

  it("reports active entitlement until the membership is revoked", async () => {
    const order = await service.createOrder(userId, "monthly");
    await repo.activateOrder({ orderId: order.id, now: new Date(), actorId: null, bankTransactionId: null, maxStackDays: 365 });
    expect(await hasActiveMembership(userId)).toBe(true);
    expect((await service.getEntitlement(userId)).tier).toBe("premium");
    await repo.revokeActiveMemberships(userId, "test revoke", new Date());
    expect(await hasActiveMembership(userId)).toBe(false);
    expect((await service.getEntitlement(userId)).tier).toBe("free");
  });

  it("reports the stacked expiry, not the older row", async () => {
    const first = await service.createOrder(userId, "monthly");
    await repo.activateOrder({ orderId: first.id, now: new Date(), actorId: null, bankTransactionId: null, maxStackDays: 365 });
    await prisma.membership.update({
      where: { orderId: first.id },
      data: { startsAt: new Date(), expiresAt: new Date(Date.now() + 3 * 86400000) },
    });
    const second = await service.createOrder(userId, "monthly");
    await repo.activateOrder({ orderId: second.id, now: new Date(), actorId: null, bankTransactionId: null, maxStackDays: 365 });

    const active = await repo.findActiveMembership(userId, new Date());
    expect(active!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 30 * 86400000);
    const members = await repo.listMembersForAdmin({ status: "active", page: 1, limit: 10 });
    expect(members.items[0]?.expiresAt?.getTime()).toBe(active!.expiresAt.getTime());
    const report = await repo.report({ from: new Date(Date.now() - 86400000), to: new Date(Date.now() + 86400000), groupBy: "day" }, new Date());
    expect(report.summary.activeMembers).toBe(1);
    expect(report.summary.expiringIn7Days).toBe(0);
  });

  it("creates and activates a comp grant in one transaction", async () => {
    const plan = await prisma.membershipPlan.findUniqueOrThrow({ where: { code: "monthly" } });
    const granted = await repo.grantCompMembership({
      userId,
      plan,
      reason: "test comp",
      now: new Date(),
      actorId: null,
      maxStackDays: 365,
    });
    expect(granted.result.status).toBe("activated");
    const stored = await prisma.membershipOrder.findUniqueOrThrow({ where: { id: granted.orderId } });
    expect(stored.status).toBe("paid");
    expect(stored.priceVnd).toBe(0);
  });

  it("rolls back the comp order when the stack limit rejects the grant", async () => {
    const plan = await prisma.membershipPlan.findUniqueOrThrow({ where: { code: "yearly" } });
    const order = await service.createOrder(userId, "monthly");
    await repo.activateOrder({ orderId: order.id, now: new Date(), actorId: null, bankTransactionId: null, maxStackDays: 365 });
    await prisma.membership.update({
      where: { orderId: order.id },
      data: { startsAt: new Date(), expiresAt: new Date(Date.now() + 350 * 86400000) },
    });
    const before = await prisma.membershipOrder.count({ where: { userId } });
    await expect(
      repo.grantCompMembership({ userId, plan, reason: "too long", now: new Date(), actorId: null, maxStackDays: 365 }),
    ).rejects.toMatchObject({ status: 422, code: "STACK_LIMIT_REACHED" });
    expect(await prisma.membershipOrder.count({ where: { userId } })).toBe(before);
  });

  it("does not reject an order the webhook already paid", async () => {
    const order = await service.createOrder(userId, "monthly");
    await repo.activateOrder({ orderId: order.id, now: new Date(), actorId: null, bankTransactionId: null, maxStackDays: 365 });
    const admin = new AdminMembershipService(repo);
    await expect(
      admin.verifyOrder(order.id, { action: "reject", reason: "late rejection reason" }, { actorId: userId, ipAddress: null }),
    ).rejects.toMatchObject({ status: 409, code: "ORDER_NOT_PENDING" });
    const stored = await prisma.membershipOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(stored.status).toBe("paid");
    expect(await prisma.membership.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("includes the whole to day in reports", async () => {
    const order = await service.createOrder(userId, "monthly");
    await repo.activateOrder({ orderId: order.id, now: new Date(), actorId: null, bankTransactionId: null, maxStackDays: 365 });
    await prisma.membershipOrder.update({
      where: { id: order.id },
      data: { paidAt: new Date("2026-11-13T10:00:00+07:00") },
    });
    const report = await new AdminMembershipService(repo).report({ from: "2026-11-13", to: "2026-11-13", groupBy: "day" });
    expect(report.summary.revenueVnd).toBe(order.priceVnd);
    expect(report.summary.paidOrders).toBe(1);
  });

  it("rejects assigning a transaction an admin already ignored", async () => {
    const order = await service.createOrder(userId, "monthly");
    const transaction = await prisma.paymentTransaction.create({
      data: {
        provider: "sepay",
        externalId: `test-${crypto.randomUUID()}`,
        amount: order.priceVnd,
        content: order.transferContent,
        transactionAt: new Date(),
        orderId: order.id,
        rawPayload: {},
      },
    });
    const admin = new AdminMembershipService(repo);
    await admin.resolveTransaction(transaction.id, { action: "ignore" }, { actorId: userId, ipAddress: null });
    await expect(
      admin.resolveTransaction(transaction.id, { action: "assign", orderId: order.id }, { actorId: userId, ipAddress: null }),
    ).rejects.toMatchObject({ status: 409, code: "ORDER_NOT_PENDING" });
  });

  it("protects a proof image from the detached-media cleanup", async () => {
    const order = await service.createOrder(userId, "monthly");
    const asset = await prisma.mediaAsset.create({
      data: { kind: "IMAGE", publicId: `test/proof/${crypto.randomUUID()}`, uploadedById: userId, status: "READY", format: "jpg", sizeBytes: 1000n, widthPx: 10, heightPx: 10 },
    });
    await repo.attachProof(order.id, asset.id);
    const cutoff = new Date(Date.now() + 86_400_000);
    const matched = await prisma.mediaAsset.count({ where: { id: asset.id, ...detachedMediaWhere(cutoff) } });
    expect(matched).toBe(0);
  });
});
