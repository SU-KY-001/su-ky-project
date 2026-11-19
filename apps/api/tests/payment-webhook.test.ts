import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { env } from "../src/core/env";
import { MembershipService } from "../src/modules/membership/application/membership.service";
import { PaymentWebhookService } from "../src/modules/membership/application/payment-webhook.service";
import { SepayPaymentProvider } from "../src/modules/membership/infrastructure/providers/sepay.provider";
import { PrismaMembershipRepository } from "../src/modules/membership/infrastructure/prisma-membership.repository";
import { mediaService } from "../src/modules/media";
import { RUN_INTEGRATION, assertTestDatabase } from "./support/integration";

const repo = new PrismaMembershipRepository();
const orders = new MembershipService(repo, mediaService);
const sepay = new SepayPaymentProvider();
const webhook = new PaymentWebhookService(repo, new Map([[sepay.name, sepay]]));
const userId = crypto.randomUUID();
let counter = 0;

function payload(order: { transferContent: string; priceVnd: number }, overrides: Record<string, unknown> = {}) {
  counter += 1;
  return {
    id: `${Date.now()}${counter}`,
    gateway: "MB",
    transactionDate: "2026-11-12 10:00:00",
    accountNumber: "0909090909",
    code: order.transferContent,
    content: `CK ${order.transferContent}`,
    transferType: "in" as const,
    transferAmount: order.priceVnd,
    referenceCode: `FT${counter}`,
    ...overrides,
  };
}

function transactionOf(id: string) {
  return prisma.paymentTransaction.findUniqueOrThrow({
    where: { provider_externalId: { provider: "sepay", externalId: id } },
  });
}

async function cleanup() {
  await prisma.membership.deleteMany({ where: { userId } });
  await prisma.paymentTransaction.deleteMany({ where: { order: { userId } } });
  await prisma.membershipOrder.deleteMany({ where: { userId } });
  await prisma.auditLog.deleteMany({ where: { resourceType: "membership" } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

describe.skipIf(!RUN_INTEGRATION)("Payment webhook", () => {
  beforeAll(async () => {
    assertTestDatabase();
    (env as { SEPAY_WEBHOOK_API_KEY?: string }).SEPAY_WEBHOOK_API_KEY = "test-sepay-key";
    await prisma.user.create({ data: { id: userId, name: "Webhook User", email: `${userId}@example.com`, emailVerified: true } });
  });

  beforeEach(async () => {
    await prisma.membership.deleteMany({ where: { userId } });
    await prisma.paymentTransaction.deleteMany({ where: { order: { userId } } });
    await prisma.membershipOrder.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    (env as { SEPAY_WEBHOOK_API_KEY?: string }).SEPAY_WEBHOOK_API_KEY = undefined;
    await cleanup();
  });

  it("rejects a wrong or missing key", () => {
    expect(() => sepay.authorize(undefined)).toThrow(expect.objectContaining({ status: 401 }));
    expect(() => sepay.authorize("Apikey nope")).toThrow(expect.objectContaining({ status: 401 }));
    expect(() => sepay.authorize("Apikey test-sepay-key")).not.toThrow();
  });

  it("rejects pages without a registered provider adapter", async () => {
    await expect(webhook.handle("payos", "whatever", {})).rejects.toMatchObject({
      status: 404,
      code: "PAYMENT_PROVIDER_UNSUPPORTED",
    });
  });

  it("scopes external ids per provider", async () => {
    const externalId = `scoped-${crypto.randomUUID()}`;
    const base = {
      externalId,
      referenceCode: null,
      amount: 1000,
      accumulated: null,
      content: "test",
      code: null,
      gateway: null,
      accountNumber: null,
      subAccount: null,
      transactionAt: new Date(),
      rawPayload: {},
    };
    await repo.insertTransaction({ ...base, provider: "sepay" });
    await repo.insertTransaction({ ...base, provider: "payos" });
    expect(await prisma.paymentTransaction.count({ where: { externalId } })).toBe(2);
    await prisma.paymentTransaction.deleteMany({ where: { externalId } });
  });

  it("activates a pending order and replays safely", async () => {
    const order = await orders.createOrder(userId, "monthly");
    const body = payload(order);
    for (let attempt = 0; attempt < 3; attempt += 1) await webhook.handle("sepay", "Apikey test-sepay-key", body);
    const stored = await prisma.membershipOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(stored.status).toBe("paid");
    expect(await prisma.membership.count({ where: { orderId: order.id } })).toBe(1);
    expect((await transactionOf(body.id)).status).toBe("matched");
  });

  it("flags a second transaction for an already paid order", async () => {
    const order = await orders.createOrder(userId, "monthly");
    await webhook.handle("sepay", "Apikey test-sepay-key", payload(order));
    const second = payload(order);
    await webhook.handle("sepay", "Apikey test-sepay-key", second);
    const transaction = await transactionOf(second.id);
    expect(transaction.status).toBe("needs_review");
    expect(transaction.reason).toBe("ORDER_ALREADY_PAID");
    expect(await prisma.membership.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("flags an amount mismatch without activating", async () => {
    const order = await orders.createOrder(userId, "monthly");
    const body = payload(order, { transferAmount: 10000 });
    await webhook.handle("sepay", "Apikey test-sepay-key", body);
    const transaction = await transactionOf(body.id);
    expect(transaction.status).toBe("needs_review");
    expect(transaction.reason).toBe("AMOUNT_MISMATCH");
    expect((await prisma.membershipOrder.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("pending");
  });

  it("ignores outbound transfers", async () => {
    const order = await orders.createOrder(userId, "monthly");
    const body = payload(order, { transferType: "out", transferAmount: 5000 });
    await webhook.handle("sepay", "Apikey test-sepay-key", body);
    expect((await transactionOf(body.id)).status).toBe("ignored");
    expect(await prisma.membership.count({ where: { orderId: order.id } })).toBe(0);
  });

  it("links a webhook to an order approved manually without a second membership", async () => {
    const order = await orders.createOrder(userId, "monthly");
    const manual = await repo.activateOrder({ orderId: order.id, now: new Date(), actorId: null, bankTransactionId: null, maxStackDays: 365 });
    expect(manual.status).toBe("activated");
    const body = payload(order);
    await webhook.handle("sepay", "Apikey test-sepay-key", body);
    expect((await transactionOf(body.id)).status).toBe("matched");
    expect((await prisma.membershipOrder.findUniqueOrThrow({ where: { id: order.id } })).bankTransactionId).toBe(body.id);
    expect(await prisma.membership.count({ where: { orderId: order.id } })).toBe(1);
  });
});
