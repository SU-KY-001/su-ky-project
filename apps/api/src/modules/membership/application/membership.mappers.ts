import type {
  MembershipOrderEntity,
  MembershipPlanEntity,
} from "../domain/membership.entity";
import { bankBlock } from "./bank-info";

const DAY_MS = 86_400_000;

export function mapPlan(plan: MembershipPlanEntity) {
  return {
    code: plan.code,
    name: plan.name,
    priceVnd: plan.priceVnd,
    durationDays: plan.durationDays,
    isPurchasable: plan.isPurchasable,
    sortOrder: plan.sortOrder,
  };
}

export function previewExpiry(maxExpiry: Date | null, durationDays: number, now = new Date()): Date {
  const start = maxExpiry && maxExpiry.getTime() > now.getTime() ? maxExpiry : now;
  return new Date(start.getTime() + durationDays * DAY_MS);
}

export function mapOrder(order: MembershipOrderEntity, previewExpiresAt: Date | null) {
  return {
    id: order.id,
    planCode: order.planCodeSnapshot,
    planName: order.planNameSnapshot,
    priceVnd: order.priceVnd,
    durationDays: order.durationDays,
    transferContent: order.transferContent,
    status: order.status,
    reviewReason: order.reviewReason,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    expiresAt: order.membership?.expiresAt ?? previewExpiresAt,
    rejectionReason: order.rejectionReason,
    proofUploaded: Boolean(order.proofAssetId),
    bank: bankBlock(order.transferContent, order.priceVnd),
  };
}
