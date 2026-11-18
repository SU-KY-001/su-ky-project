import { afterAll, expect, mock, test } from "bun:test";
import { prisma } from "@repo/db";
import { env } from "../src/core/env";
import { WebPushError } from "web-push";
import { RUN_INTEGRATION, assertTestDatabase } from "./support/integration";

let sends = 0;
mock.module("web-push", () => ({
  WebPushError,
  sendNotification: async () => { sends += 1; },
}));
mock.module("../src/core/env", () => ({
  env: {
    ...env,
    PREMIUM_PUSH_PUBLIC_KEY: "test-public-key",
    PREMIUM_PUSH_PRIVATE_KEY: "test-private-key",
    PREMIUM_PUSH_SUBJECT: "mailto:test@example.test",
  },
}));
const { processPremiumRenewalReminders } = await import("../src/modules/membership/application/renewal-reminders");
afterAll(() => mock.restore());

test.skipIf(!RUN_INTEGRATION)("concurrent reminder workers send one push and create one in-app reminder per period", async () => {
  assertTestDatabase();
  const userId = crypto.randomUUID();
  const now = new Date();
  await prisma.user.create({ data: { id: userId, email: `${userId}@example.test`, name: "Renewal test" } });
  try {
    const plan = await prisma.membershipPlan.findUniqueOrThrow({ where: { code: "monthly" } });
    const order = await prisma.membershipOrder.create({ data: {
      userId, planId: plan.id, planCodeSnapshot: plan.code, planNameSnapshot: plan.name,
      priceVnd: 20000, durationDays: 30, status: "paid", transferContent: `TEST${userId.slice(0, 8)}`,
    } });
    const membership = await prisma.membership.create({ data: {
      userId, planId: plan.id, orderId: order.id, priceVnd: 20000, durationDays: 30,
      startsAt: new Date(now.getTime() - 26 * 86_400_000), expiresAt: new Date(now.getTime() + 4 * 86_400_000),
    } });
    await prisma.premiumPushSubscription.create({ data: {
      userId, endpoint: `https://fcm.googleapis.com/test/${userId}`, p256dh: "test", auth: "test",
    } });
    sends = 0;
    await Promise.all([processPremiumRenewalReminders(now), processPremiumRenewalReminders(now)]);
    await processPremiumRenewalReminders(new Date(now.getTime() + 86_400_000));
    expect(sends).toBe(1);
    expect(await prisma.premiumRenewalReminder.count({ where: { membershipId: membership.id } })).toBe(1);
    expect((await prisma.premiumRenewalReminder.findUniqueOrThrow({ where: { membershipId: membership.id } })).pushSentAt).not.toBeNull();
  } finally {
    await prisma.membership.deleteMany({ where: { userId } });
    await prisma.membershipOrder.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
});
