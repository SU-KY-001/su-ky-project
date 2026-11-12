import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { AdminMembershipService } from "../src/modules/membership/application/admin-membership.service";
import { MembershipService } from "../src/modules/membership/application/membership.service";
import { PrismaMembershipRepository } from "../src/modules/membership/infrastructure/prisma-membership.repository";
import { mediaService } from "../src/modules/media";
import { detachedMediaWhere } from "../src/core/jobs/maintenance-jobs";
import { hasActiveMembership } from "../src/modules/membership/application/entitlement";
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

  it("blocks a yearly purchase that would exceed the stacking horizon", async () => {
    const monthly = await prisma.membershipPlan.findUniqueOrThrow({ where: { code: "monthly" } });
    const order = await service.createOrder(userId, "monthly");
    const activation = await repo.activateOrder({ orderId: order.id, now: new Date(), actorId: null, bankTransactionId: null, maxStackDays: 365 });
    expect(activation.status).toBe("activated");
    await prisma.membership.update({
      where: { orderId: order.id },
      data: { startsAt: new Date(), expiresAt: new Date(Date.now() + 350 * 86400000), planId: monthly.id },
    });
    await expect(service.createOrder(userId, "yearly")).rejects.toMatchObject({ status: 422, code: "STACK_LIMIT_REACHED" });
  });

  it("returns 404 for another user's order", async () => {
    const order = await service.createOrder(userId, "monthly");
    await expect(service.getOrder(otherUserId, order.id)).rejects.toMatchObject({ status: 404, code: "MEMBERSHIP_ORDER_NOT_FOUND" });
  });

  it("keeps the price snapshot and rejects a pending order when the price changed", async () => {
    const order = await service.createOrder(userId, "monthly");
    await prisma.membershipPlan.update({ where: { code: "monthly" }, data: { priceVnd: 25000 } });
    const read = await service.getOrder(userId, order.id);
    expect(read.priceVnd).toBe(20000);
    const created = await service.createOrder(userId, "monthly");
    expect(created.priceVnd).toBe(25000);
    const old = await prisma.membershipOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(old.status).toBe("rejected");
    expect(old.rejectionReason).toBe("PLAN_PRICE_CHANGED");
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
    expect(members.items[0]?.expiresAt.getTime()).toBe(active!.expiresAt.getTime());
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
