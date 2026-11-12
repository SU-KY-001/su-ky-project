import type { Prisma } from "@repo/db";
import { prisma } from "@repo/db";
import { writeAudit } from "../../../core/audit";
import { getSystemConfig } from "../../../core/config/system-config";
import { DomainError } from "../../../core/errors/domain-error";
import { mediaStorage } from "../../media";
import type { AdminOrderRow, AdminTransactionRow } from "../domain/membership.entity";
import type { MembershipRepository } from "../domain/membership.repository";

const DAY_MS = 86_400_000;
const STATUS_TRANSITIONS = ["pending", "needs_review"];

export interface AdminContext {
  actorId: string;
  ipAddress: string | null;
}

export class AdminMembershipService {
  constructor(private readonly repo: MembershipRepository) {}

  private mapOrder(row: AdminOrderRow) {
    return {
      id: row.id,
      planCode: row.planCodeSnapshot,
      planName: row.planNameSnapshot,
      priceVnd: row.priceVnd,
      durationDays: row.durationDays,
      transferContent: row.transferContent,
      status: row.status,
      reviewReason: row.reviewReason,
      rejectionReason: row.rejectionReason,
      bankTransactionId: row.bankTransactionId,
      adminNote: row.adminNote,
      createdAt: row.createdAt,
      paidAt: row.paidAt,
      expiresAt: row.membership?.expiresAt ?? null,
      user: row.user,
      proofUrl: row.proofAsset?.status === "READY" ? mediaStorage.deliveryUrl(row.proofAsset) : null,
      proofUploaded: Boolean(row.proofAssetId),
      canApprove: STATUS_TRANSITIONS.includes(row.status),
    };
  }

  private mapTransaction(row: AdminTransactionRow) {
    return {
      ...row,
      accumulated: row.accumulated?.toString() ?? null,
      rawPayload: undefined,
    };
  }

  listPlans() {
    return this.repo.listPlans();
  }

  async updatePlan(code: string, patch: { name?: string; priceVnd?: number; durationDays?: number; isPurchasable?: boolean; isActive?: boolean; sortOrder?: number }, ctx: AdminContext) {
    const before = await this.repo.findPlanByCode(code);
    if (!before) throw new DomainError(404, "PLAN_NOT_FOUND", "Membership plan not found");
    const after = { ...before, ...patch };
    if (after.isPurchasable && (after.priceVnd <= 0 || after.durationDays <= 0))
      throw new DomainError(422, "PLAN_NOT_PURCHASABLE", "A purchasable plan needs a positive price and duration");
    const updated = await this.repo.updatePlan(before.id, patch);
    await writeAudit(prisma, {
      actorId: ctx.actorId,
      action: "membership.plan.update",
      resourceType: "membership_plan",
      resourceId: before.id,
      changes: { before: before as unknown as Prisma.InputJsonValue, after: updated as unknown as Prisma.InputJsonValue },
      ipAddress: ctx.ipAddress,
    });
    return updated;
  }

  async listOrders(query: Parameters<MembershipRepository["listOrdersForAdmin"]>[0]) {
    const result = await this.repo.listOrdersForAdmin(query);
    return { ...result, items: result.items.map((row) => this.mapOrder(row)) };
  }

  async getOrder(id: string) {
    const row = await this.repo.findOrderDetailForAdmin(id);
    if (!row) throw new DomainError(404, "MEMBERSHIP_ORDER_NOT_FOUND", "Membership order not found");
    const transactions = await this.repo.listTransactionsByOrder(id);
    return { ...this.mapOrder(row), transactions: transactions.map((tx) => this.mapTransaction(tx)) };
  }

  async verifyOrder(id: string, body: { action: "approve" | "reject"; reason?: string; note?: string }, ctx: AdminContext) {
    const order = await this.repo.findOrderDetailForAdmin(id);
    if (!order) throw new DomainError(404, "MEMBERSHIP_ORDER_NOT_FOUND", "Membership order not found");
    if (body.action === "reject") {
      if (!STATUS_TRANSITIONS.includes(order.status)) throw new DomainError(409, "ORDER_NOT_PENDING", "Order is no longer open");
      await prisma.membershipOrder.update({
        where: { id },
        data: { status: "rejected", rejectionReason: body.reason ?? null, verifiedBy: ctx.actorId },
      });
      await writeAudit(prisma, {
        actorId: ctx.actorId,
        action: "membership.order.reject",
        resourceType: "membership_order",
        resourceId: id,
        changes: { before: { status: order.status }, after: { status: "rejected", reason: body.reason }, note: body.note },
        ipAddress: ctx.ipAddress,
      });
      return this.getOrder(id);
    }

    if (order.status === "rejected") throw new DomainError(409, "ORDER_NOT_PENDING", "Order is no longer open");
    const maxStackDays = await getSystemConfig("premium.max_stack_days");
    const result = await this.repo.activateOrder({
      orderId: id,
      now: new Date(),
      actorId: ctx.actorId,
      maxStackDays,
    });
    if (result.status === "stack_limit") throw new DomainError(422, "STACK_LIMIT_REACHED", "Membership would exceed the stacking limit");
    await writeAudit(prisma, {
      actorId: ctx.actorId,
      action: "membership.order.verify",
      resourceType: "membership_order",
      resourceId: id,
      changes: { before: { status: order.status }, after: { status: "paid", membershipId: result.membershipId, bankTransactionId: result.bankTransactionId }, note: body.note },
      ipAddress: ctx.ipAddress,
    });
    return this.getOrder(id);
  }

  async listTransactions(query: Parameters<MembershipRepository["listTransactionsForAdmin"]>[0]) {
    const result = await this.repo.listTransactionsForAdmin(query);
    return { ...result, items: result.items.map((row) => this.mapTransaction(row)) };
  }

  async resolveTransaction(id: string, body: { action: "assign" | "ignore"; orderId?: string; note?: string }, ctx: AdminContext) {
    const transaction = await this.repo.findTransactionById(id);
    if (!transaction) throw new DomainError(404, "NOT_FOUND", "Transaction not found");
    if (transaction.status === "matched") throw new DomainError(409, "ORDER_NOT_PENDING", "Transaction is already matched");

    if (body.action === "ignore") {
      await this.repo.markTransaction(id, "ignored", "MANUAL_IGNORE");
      await writeAudit(prisma, {
        actorId: ctx.actorId,
        action: "membership.transaction.resolve",
        resourceType: "payment_transaction",
        resourceId: id,
        changes: { before: { status: transaction.status }, after: { status: "ignored" }, note: body.note },
        ipAddress: ctx.ipAddress,
      });
      return this.mapTransaction({ ...transaction, status: "ignored", reason: "MANUAL_IGNORE", order: null });
    }

    const orderId = body.orderId;
    if (!orderId) throw new DomainError(422, "VALIDATION_ERROR", "orderId is required to assign a transaction");
    const order = await this.repo.findOrder(orderId);
    if (!order) throw new DomainError(404, "MEMBERSHIP_ORDER_NOT_FOUND", "Membership order not found");
    if (order.priceVnd !== transaction.amount)
      throw new DomainError(422, "VALIDATION_ERROR", "Transaction amount does not match the order price");

    const maxStackDays = await getSystemConfig("premium.max_stack_days");
    const result = await this.repo.applyTransaction({ transactionId: id, orderId, actorId: ctx.actorId, maxStackDays, now: new Date() });
    await writeAudit(prisma, {
      actorId: ctx.actorId,
      action: "membership.transaction.resolve",
      resourceType: "payment_transaction",
      resourceId: id,
      changes: { before: { status: transaction.status }, after: { status: result.status, reason: result.reason, orderId }, note: body.note },
      ipAddress: ctx.ipAddress,
    });
    const updated = await this.repo.findTransactionById(id);
    return { transaction: updated ? this.mapTransaction({ ...updated, order: null }) : null, result };
  }

  async listMembers(query: Parameters<MembershipRepository["listMembersForAdmin"]>[0]) {
    return this.repo.listMembersForAdmin(query);
  }

  async grant(userId: string, body: { planCode: "monthly" | "yearly"; reason: string }, ctx: AdminContext) {
    const user = await this.repo.findUser(userId);
    if (!user) throw new DomainError(404, "NOT_FOUND", "User not found");
    const plan = await this.repo.findPlanByCode(body.planCode);
    if (!plan || !plan.isActive) throw new DomainError(422, "PLAN_NOT_PURCHASABLE", "Plan cannot be granted");

    const now = new Date();
    const maxStackDays = await getSystemConfig("premium.max_stack_days");
    const maxExpiry = await this.repo.findMaxExpiry(userId);
    const start = maxExpiry && maxExpiry.getTime() > now.getTime() ? maxExpiry : now;
    if (start.getTime() + plan.durationDays * DAY_MS > now.getTime() + maxStackDays * DAY_MS)
      throw new DomainError(422, "STACK_LIMIT_REACHED", "Membership would exceed the stacking limit");

    const order = await this.repo.createCompOrder(userId, plan, body.reason);
    const result = await this.repo.activateOrder({ orderId: order.id, now, actorId: ctx.actorId, maxStackDays });
    if (result.status === "stack_limit") throw new DomainError(422, "STACK_LIMIT_REACHED", "Membership would exceed the stacking limit");
    await writeAudit(prisma, {
      actorId: ctx.actorId,
      action: "membership.grant",
      resourceType: "membership_order",
      resourceId: order.id,
      changes: { userId, planCode: body.planCode, reason: body.reason, membershipId: result.membershipId },
      ipAddress: ctx.ipAddress,
    });
    return { orderId: order.id, membershipId: result.membershipId, userId, expiresAt: result.expiresAt };
  }

  async revoke(userId: string, body: { reason: string }, ctx: AdminContext) {
    const user = await this.repo.findUser(userId);
    if (!user) throw new DomainError(404, "NOT_FOUND", "User not found");
    const count = await this.repo.revokeActiveMemberships(userId, body.reason, new Date());
    if (count === 0) throw new DomainError(404, "NOT_FOUND", "User has no active membership");
    await writeAudit(prisma, {
      actorId: ctx.actorId,
      action: "membership.revoke",
      resourceType: "membership",
      resourceId: userId,
      changes: { revoked: count, reason: body.reason },
      ipAddress: ctx.ipAddress,
    });
    return { userId, revoked: count };
  }

  async report(query: { from: string; to: string; groupBy: "day" | "month" }) {
    const from = new Date(`${query.from}T00:00:00+07:00`);
    const to = new Date(`${query.to}T00:00:00+07:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from)
      throw new DomainError(422, "VALIDATION_ERROR", "from must be before to");
    if (to.getTime() - from.getTime() > 366 * DAY_MS)
      throw new DomainError(422, "VALIDATION_ERROR", "Report range must not exceed 366 days");
    return this.repo.report({ from, to, groupBy: query.groupBy }, new Date());
  }
}
