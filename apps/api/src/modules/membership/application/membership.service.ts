import { getSystemConfig } from "../../../core/config/system-config";
import { DomainError } from "../../../core/errors/domain-error";
import { listExperienceQuotas } from "./experience-access";
import type { MediaService } from "../../media/application/media.service";
import type { MembershipOrderEntity, MembershipPlanEntity } from "../domain/membership.entity";
import type { MembershipRepository } from "../domain/membership.repository";
import { mapOrder, mapPlan, previewExpiry } from "./membership.mappers";

const DAY_MS = 86_400_000;
/** Show the renewal reminder during the last 5 days of a paid period. */
const RENEWAL_REMINDER_DAYS = 5;
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
    return plans.filter((plan) => plan.isActive && (plan.code === "free" || (plan.code === "monthly" && plan.isPurchasable))).map(mapPlan);
  }

  async getEntitlement(userId: string) {
    const now = new Date();
    const [active, latest] = await Promise.all([
      this.repo.findActiveMembership(userId, now),
      this.repo.findLatestOrder(userId, [...OPEN_STATUSES]),
    ]);
    if (!active)
      return { tier: "free" as const, startsAt: null, expiresAt: null, daysLeft: null, planCode: null, pendingOrderId: latest?.id ?? null, renewSoon: false, quota: null };
    const daysLeft = Math.max(1, Math.ceil((active.expiresAt.getTime() - now.getTime()) / DAY_MS));
    return {
      tier: "premium" as const,
      startsAt: active.startsAt,
      expiresAt: active.expiresAt,
      daysLeft,
      planCode: active.plan.code,
      pendingOrderId: latest?.id ?? null,
      renewSoon: active.expiresAt.getTime() - now.getTime() < RENEWAL_REMINDER_DAYS * DAY_MS,
      quota: null,
    };
  }

  /** HTTP entitlement: free listeners also get today's quota; staff/premium do not. */
  async getEntitlementForUser(userId: string, role: string | null | undefined) {
    const entitlement = await this.getEntitlement(userId);
    const isStaff = role === "admin" || role === "moderator";
    const experienceQuotas = entitlement.tier === "free" && !isStaff ? await listExperienceQuotas(userId) : [];
    const quota = experienceQuotas.find((item) => item.feature === "podcast") ?? null;
    return { ...entitlement, quota, experienceQuotas };
  }

  private async planForPurchase(planCode: string): Promise<MembershipPlanEntity> {
    const plan = await this.repo.findPlanByCode(planCode);
    if (!plan) throw new DomainError(404, "PLAN_NOT_FOUND", "Membership plan not found");
    if (plan.code !== "monthly" || !plan.isActive || !plan.isPurchasable || plan.priceVnd <= 0)
      throw new DomainError(422, "PLAN_NOT_PURCHASABLE", "This plan cannot be purchased");
    return plan;
  }

  async createOrder(userId: string, planCode: string) {
    const plan = await this.planForPurchase(planCode);
    const now = new Date();
    const maxStackDays = await getSystemConfig("premium.max_stack_days");

    const existing = await this.repo.findReusableOrder(userId, plan);
    if (existing) {
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
      page,
      limit,
      items: result.items.map((order) => mapOrder(order, previewExpiry(maxExpiry, order.durationDays, now))),
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.repo.findOrder(orderId, userId);
    if (!order) throw new DomainError(404, "MEMBERSHIP_ORDER_NOT_FOUND", "Membership order not found");
    const maxExpiry = await this.repo.findMaxExpiry(userId);
    // `mapOrder` prefers the real membership expiry; the preview only fills open orders.
    return mapOrder(order, previewExpiry(maxExpiry, order.durationDays));
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
    const asset = await this.media.verify(assetId, userId, false, publicId);
    if (asset.kind !== "IMAGE") throw new DomainError(422, "MEDIA_TYPE_NOT_ALLOWED", "Proof must be an image");
    const order = await this.repo.attachProof(orderId, assetId);
    const maxExpiry = await this.repo.findMaxExpiry(userId);
    return mapOrder(order, previewExpiry(maxExpiry, order.durationDays));
  }
}
