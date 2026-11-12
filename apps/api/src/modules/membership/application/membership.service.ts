import { getSystemConfig } from "../../../core/config/system-config";
import { DomainError } from "../../../core/errors/domain-error";
import type { MediaService } from "../../media/application/media.service";
import type { MembershipOrderEntity, MembershipPlanEntity } from "../domain/membership.entity";
import type { MembershipRepository } from "../domain/membership.repository";
import { mapOrder, mapPlan, previewExpiry } from "./membership.mappers";

const DAY_MS = 86_400_000;
const OPEN_STATUSES = ["pending", "needs_review"] as const;

export interface CreateProofInput {
  kind: "AUDIO" | "IMAGE" | "DOCUMENT";
  fileName: string;
  sizeBytes: number;
  mimeType: string;
}

export class MembershipService {
  constructor(
    private readonly repo: MembershipRepository,
    private readonly media: MediaService,
  ) {}

  async listPlans() {
    const plans = await this.repo.listPlans();
    return plans.filter((plan) => plan.isActive).map(mapPlan);
  }

  async getEntitlement(userId: string) {
    const now = new Date();
    const [active, latest] = await Promise.all([
      this.repo.findActiveMembership(userId, now),
      this.repo.findLatestOrder(userId, [...OPEN_STATUSES]),
    ]);
    if (!active)
      return { tier: "free" as const, expiresAt: null, daysLeft: null, planCode: null, pendingOrderId: latest?.id ?? null };
    return {
      tier: "premium" as const,
      expiresAt: active.expiresAt,
      daysLeft: Math.max(1, Math.ceil((active.expiresAt.getTime() - now.getTime()) / DAY_MS)),
      planCode: active.plan.code,
      pendingOrderId: latest?.id ?? null,
    };
  }

  private async planForPurchase(planCode: string): Promise<MembershipPlanEntity> {
    const plan = await this.repo.findPlanByCode(planCode);
    if (!plan) throw new DomainError(404, "PLAN_NOT_FOUND", "Membership plan not found");
    if (!plan.isActive || !plan.isPurchasable || plan.priceVnd <= 0)
      throw new DomainError(422, "PLAN_NOT_PURCHASABLE", "This plan cannot be purchased");
    return plan;
  }

  async createOrder(userId: string, planCode: string) {
    const plan = await this.planForPurchase(planCode);
    const now = new Date();
    const maxStackDays = await getSystemConfig("premium.max_stack_days");

    const existing = await this.repo.findLatestOrder(userId, [...OPEN_STATUSES]);
    if (
      existing &&
      (existing.status === "needs_review" ||
        (existing.planId === plan.id &&
          existing.priceVnd === plan.priceVnd &&
          existing.durationDays === plan.durationDays))
    ) {
      const maxExpiry = await this.repo.findMaxExpiry(userId);
      return mapOrder(existing, previewExpiry(maxExpiry, existing.durationDays, now));
    }

    const maxExpiry = await this.repo.findMaxExpiry(userId);
    const expiresAt = previewExpiry(maxExpiry, plan.durationDays, now);
    const horizon = now.getTime() + maxStackDays * DAY_MS;
    if (expiresAt.getTime() > horizon)
      throw new DomainError(
        422,
        "STACK_LIMIT_REACHED",
        `Tổng thời hạn vượt trần ${maxStackDays} ngày; hạn tối đa có thể mua là ${new Date(horizon).toISOString().slice(0, 10)}`,
      );

    const order = await this.repo.createOrder({ userId, plan });
    return mapOrder(order, expiresAt);
  }

  async listOrders(userId: string, page: number, limit: number) {
    const [result, maxExpiry] = await Promise.all([
      this.repo.listOrders(userId, page, limit),
      this.repo.findMaxExpiry(userId),
    ]);
    const now = new Date();
    return {
      ...result,
      items: result.items.map((order) => mapOrder(order, previewExpiry(maxExpiry, order.durationDays, now))),
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.repo.findOrder(orderId, userId);
    if (!order) throw new DomainError(404, "MEMBERSHIP_ORDER_NOT_FOUND", "Membership order not found");
    const maxExpiry = order.membership ? null : await this.repo.findMaxExpiry(userId);
    return mapOrder(order, maxExpiry ? previewExpiry(maxExpiry, order.durationDays) : null);
  }

  private async openOrder(userId: string, orderId: string): Promise<MembershipOrderEntity> {
    const order = await this.repo.findOrder(orderId, userId);
    if (!order) throw new DomainError(404, "MEMBERSHIP_ORDER_NOT_FOUND", "Membership order not found");
    if (order.status !== "pending" && order.status !== "needs_review")
      throw new DomainError(409, "ORDER_NOT_PENDING", "Order is no longer open");
    return order;
  }

  async createProofTicket(userId: string, orderId: string, input: CreateProofInput) {
    await this.openOrder(userId, orderId);
    return this.media.create({ kind: "IMAGE", sizeBytes: input.sizeBytes, mimeType: input.mimeType }, userId);
  }

  async attachProof(userId: string, orderId: string, assetId: string, publicId: string) {
    await this.openOrder(userId, orderId);
    await this.media.verify(assetId, userId, false, publicId);
    const order = await this.repo.attachProof(orderId, assetId);
    const maxExpiry = order.membership ? null : await this.repo.findMaxExpiry(userId);
    return mapOrder(order, maxExpiry ? previewExpiry(maxExpiry, order.durationDays) : null);
  }
}
