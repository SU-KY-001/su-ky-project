import { prisma } from "@repo/db";
import type { PremiumPushSubscription } from "@repo/shared";
import { sendNotification, WebPushError } from "web-push";
import { env } from "../../../core/env";
import { DomainError } from "../../../core/errors/domain-error";
import { logger } from "../../../core/logger";

const DAY_MS = 86_400_000;
const RENEWAL_THRESHOLD_MS = 5 * DAY_MS;
const renewalPath = "/thanh-vien" as const;
const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });
const providerHosts = new Set(["fcm.googleapis.com", "android.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"]);

function supportedEndpoint(value: string): boolean {
  const url = new URL(value);
  return url.protocol === "https:" && !url.port && !url.username && !url.password &&
    (providerHosts.has(url.hostname) || url.hostname.endsWith(".notify.windows.com") || url.hostname.endsWith(".push.apple.com"));
}

export function premiumPushConfig() {
  return { publicKey: env.PREMIUM_PUSH_PUBLIC_KEY ?? null };
}

export async function savePremiumPushSubscription(userId: string, subscription: PremiumPushSubscription) {
  if (!env.PREMIUM_PUSH_PUBLIC_KEY || !supportedEndpoint(subscription.endpoint)) {
    throw new DomainError(400, "VALIDATION_ERROR", "Trình duyệt này chưa hỗ trợ nhắc gia hạn qua push.");
  }
  const data = { userId, ...subscription.keys };
  await prisma.premiumPushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: { endpoint: subscription.endpoint, ...data },
    update: data,
  });
  return { saved: true };
}

export async function removePremiumPushSubscription(userId: string, endpoint: string) {
  await prisma.premiumPushSubscription.deleteMany({ where: { userId, endpoint } });
  return { saved: false };
}

export async function latestPremiumRenewalReminder(userId: string, now = new Date()) {
  const current = await prisma.membership.findFirst({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { expiresAt: "desc" },
    include: { renewalReminder: true, order: { select: { planNameSnapshot: true } } },
  });
  if (!current?.renewalReminder || current.startsAt > now) return null;
  return {
    membershipId: current.id,
    planName: current.order.planNameSnapshot,
    expiresAt: current.expiresAt,
    daysLeft: Math.ceil((current.expiresAt.getTime() - now.getTime()) / DAY_MS),
    createdAt: current.renewalReminder.createdAt,
    renewalPath,
  };
}

export async function processPremiumRenewalReminders(now = new Date()): Promise<void> {
  const threshold = new Date(now.getTime() + RENEWAL_THRESHOLD_MS);
  await prisma.$executeRaw`
    INSERT INTO premium_renewal_reminders (membership_id, created_at)
    SELECT m.id, ${now}
    FROM memberships m
    WHERE m.revoked_at IS NULL AND m.starts_at <= ${now} AND m.expires_at > ${now} AND m.expires_at < ${threshold}
      AND NOT EXISTS (SELECT 1 FROM premium_renewal_reminders r WHERE r.membership_id = m.id)
      AND NOT EXISTS (
        SELECT 1 FROM memberships next
        WHERE next.user_id = m.user_id AND next.revoked_at IS NULL AND next.expires_at > m.expires_at
      )
    ORDER BY m.expires_at
    LIMIT 200
    ON CONFLICT (membership_id) DO NOTHING
  `;

  const { PREMIUM_PUSH_PUBLIC_KEY: publicKey, PREMIUM_PUSH_PRIVATE_KEY: privateKey, PREMIUM_PUSH_SUBJECT: subject } = env;
  if (!publicKey || !privateKey || !subject) return;
  const pending = await prisma.premiumRenewalReminder.findMany({
    where: { pushClaimedAt: null, pushAttempts: { lt: 3 }, membership: { expiresAt: { gt: now }, revokedAt: null } },
    include: { membership: { select: { userId: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  for (const candidate of pending) {
    const claim = await prisma.premiumRenewalReminder.updateMany({
      where: { membershipId: candidate.membershipId, pushClaimedAt: null, pushAttempts: { lt: 3 } },
      data: { pushClaimedAt: now, pushAttempts: { increment: 1 } },
    });
    if (!claim.count) continue;
    const userId = candidate.membership.userId;
    const [reminder, subscription] = await Promise.all([
      latestPremiumRenewalReminder(userId, now),
      prisma.premiumPushSubscription.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    ]);
    if (!reminder || reminder.membershipId !== candidate.membershipId || !subscription || !supportedEndpoint(subscription.endpoint)) continue;
    try {
      await sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify({
          tag: reminder.membershipId,
          title: "Premium sắp hết hạn",
          body: `${reminder.planName} còn ${reminder.daysLeft} ngày, hết hạn ${date.format(reminder.expiresAt)}.`,
        }),
        { vapidDetails: { subject, publicKey, privateKey }, topic: reminder.membershipId.replaceAll("-", ""), TTL: 3600, timeout: 5000 },
      );
      await prisma.premiumRenewalReminder.update({ where: { membershipId: reminder.membershipId }, data: { pushSentAt: new Date() } });
    } catch (error) {
      const status = error instanceof WebPushError ? error.statusCode : undefined;
      if (status === 404 || status === 410) {
        await prisma.premiumPushSubscription.deleteMany({ where: { endpoint: subscription.endpoint, userId, updatedAt: subscription.updatedAt } });
      }
      if (status === 429 || (status !== undefined && status >= 500)) {
        await prisma.premiumRenewalReminder.update({ where: { membershipId: reminder.membershipId }, data: { pushClaimedAt: null } });
      }
      logger.warn({ membershipId: reminder.membershipId, status }, "Premium renewal Web Push failed");
    }
  }
}
