import { randomBytes } from "node:crypto";
import { Prisma, prisma, type PrismaClient } from "@repo/db";
import type { AdminMemberQuery, PremiumAuditEntry, PremiumAuditQuery } from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import { writeAudit, type AuditInput } from "../../../core/audit";
import type {
  ActivateOrderInput,
  ApplyTransactionInput,
  CreateOrderInput,
  GrantCompMembershipInput,
  InsertTransactionInput,
  MembershipRepository,
  OrderQuery,
  ReportQuery,
  TransactionQuery,
} from "../domain/membership.repository";
import type {
  ActivationResult,
  AdminMemberRow,
  AdminOrderRow,
  AdminTransactionRow,
  MembershipEntity,
  MembershipOrderEntity,
  MembershipPlanEntity,
  MembershipReport,
  MembershipWithPlan,
  PaymentTransactionEntity,
} from "../domain/membership.entity";

const DAY_MS = 86_400_000;
const TRANSFER_PREFIX = "SK";
const COMP_PREFIX = "CMP";
const auditSelect = { id: true, action: true, resourceType: true, resourceId: true, actorType: true, actor: { select: { id: true, name: true } }, changes: true, createdAt: true } as const;

type OrderRow = Prisma.MembershipOrderGetPayload<{ include: { membership: true } }>;
type PlanRow = Prisma.MembershipPlanGetPayload<object>;

function reusableOrderWhere(userId: string, plan: MembershipPlanEntity): Prisma.MembershipOrderWhereInput {
  return {
    userId, planId: plan.id,
    OR: [
      { status: "needs_review" },
      { status: "pending", planNameSnapshot: plan.name, priceVnd: plan.priceVnd, durationDays: plan.durationDays },
    ],
  };
}

function toPlan(row: PlanRow): MembershipPlanEntity {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    benefits: row.benefits,
    priceVnd: row.priceVnd,
    durationDays: row.durationDays,
    isPurchasable: row.isPurchasable,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function validatePurchasablePlan(plan: Pick<PlanRow, "code" | "isPurchasable" | "isActive" | "priceVnd" | "durationDays">): void {
  if ((plan.code === "yearly" && (plan.isActive || plan.isPurchasable)) || (plan.code === "free" && plan.isPurchasable)) {
    throw new DomainError(422, "PLAN_NOT_PURCHASABLE", "This plan cannot be enabled for sale");
  }
  if (plan.isPurchasable && (plan.priceVnd <= 0 || plan.durationDays <= 0)) {
    throw new DomainError(422, "PLAN_NOT_PURCHASABLE", "A purchasable plan needs a positive price and duration");
  }
}

function planAuditValues(plan: PlanRow) {
  const { code, name, benefits, priceVnd, durationDays, isPurchasable, isActive, sortOrder } = plan;
  return { code, name, benefits, priceVnd, durationDays, isPurchasable, isActive, sortOrder };
}

function toMembership(row: Prisma.MembershipGetPayload<object>): MembershipEntity {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    orderId: row.orderId,
    priceVnd: row.priceVnd,
    durationDays: row.durationDays,
    startsAt: row.startsAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    revokeReason: row.revokeReason,
    createdAt: row.createdAt,
  };
}

function toOrder(row: OrderRow): MembershipOrderEntity {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    planCodeSnapshot: row.planCodeSnapshot,
    planNameSnapshot: row.planNameSnapshot,
    priceVnd: row.priceVnd,
    durationDays: row.durationDays,
    currency: row.currency,
    transferContent: row.transferContent,
    status: row.status,
    proofAssetId: row.proofAssetId,
    rejectionReason: row.rejectionReason,
    bankTransactionId: row.bankTransactionId,
    paidAt: row.paidAt,
    verifiedBy: row.verifiedBy,
    reviewReason: row.reviewReason,
    adminNote: row.adminNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    membership: row.membership ? toMembership(row.membership) : null,
  };
}

function toTransaction(row: Prisma.PaymentTransactionGetPayload<object>): PaymentTransactionEntity {
  return {
    id: row.id,
    provider: row.provider,
    externalId: row.externalId,
    referenceCode: row.referenceCode,
    amount: row.amount,
    accumulated: row.accumulated,
    content: row.content,
    code: row.code,
    gateway: row.gateway,
    accountNumber: row.accountNumber,
    subAccount: row.subAccount,
    transactionAt: row.transactionAt,
    status: row.status,
    orderId: row.orderId,
    reason: row.reason,
    rawPayload: row.rawPayload,
    createdAt: row.createdAt,
  };
}

async function updatePaymentStatus(
  tx: Prisma.TransactionClient,
  before: Pick<PaymentTransactionEntity, "id" | "status" | "reason" | "orderId">,
  after: Pick<PaymentTransactionEntity, "status" | "reason" | "orderId">,
  actor: { actorId: string | null; ipAddress?: string | null; note?: string },
): Promise<void> {
  if (before.status === after.status && before.reason === after.reason && before.orderId === after.orderId) return;
  await tx.paymentTransaction.update({ where: { id: before.id }, data: after });
  await writeAudit(tx, {
    actorId: actor.actorId,
    actorType: actor.actorId ? "ADMIN" : "SYSTEM",
    ipAddress: actor.ipAddress ?? null,
    action: "membership.transaction.status",
    resourceType: "payment_transaction",
    resourceId: before.id,
    changes: {
      before: { status: before.status, reason: before.reason, orderId: before.orderId },
      after,
      ...(actor.note ? { note: actor.note } : {}),
    },
  });
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function transferCode(prefix: string): string {
  return `${prefix}${randomBytes(4).toString("hex").toUpperCase()}`;
}

const ADMIN_ORDER_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  proofAsset: { select: { publicId: true, kind: true, version: true, format: true, status: true } },
  membership: true,
} satisfies Prisma.MembershipOrderInclude;

type AdminOrderPayload = Prisma.MembershipOrderGetPayload<{ include: typeof ADMIN_ORDER_INCLUDE }>;

function toAdminOrder(row: AdminOrderPayload): AdminOrderRow {
  return { ...toOrder(row), user: row.user, proofAsset: row.proofAsset };
}

export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async listPlans(): Promise<MembershipPlanEntity[]> {
    const rows = await this.db.membershipPlan.findMany({ orderBy: [{ sortOrder: "asc" }, { code: "asc" }] });
    return rows.map(toPlan);
  }

  async findPlanByCode(code: string): Promise<MembershipPlanEntity | null> {
    const row = await this.db.membershipPlan.findUnique({ where: { code } });
    return row ? toPlan(row) : null;
  }

  async updatePlan(...[code, patch, actor]: Parameters<MembershipRepository["updatePlan"]>): Promise<MembershipPlanEntity> {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM membership_plans WHERE code = ${code} FOR UPDATE`;
      const before = await tx.membershipPlan.findUnique({ where: { code } });
      if (!before) throw new DomainError(404, "PLAN_NOT_FOUND", "Membership plan not found");
      validatePurchasablePlan({ ...before, ...patch });
      const after = await tx.membershipPlan.update({ where: { code }, data: patch });
      await writeAudit(tx, {
        ...actor,
        actorType: "ADMIN",
        action: "membership.plan.update",
        resourceType: "membership_plan",
        resourceId: after.id,
        changes: { before: planAuditValues(before), after: planAuditValues(after) },
      });
      return toPlan(after);
    });
  }

  async findActiveMembership(userId: string, now: Date): Promise<MembershipWithPlan | null> {
    const row = await this.db.membership.findFirst({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { expiresAt: "desc" },
      include: { plan: { select: { code: true, name: true } } },
    });
    return row ? { ...toMembership(row), plan: row.plan } : null;
  }

  async findMaxExpiry(userId: string): Promise<Date | null> {
    const result = await this.db.membership.aggregate({
      where: { userId, revokedAt: null },
      _max: { expiresAt: true },
    });
    return result._max.expiresAt;
  }

  async findLatestOrder(userId: string, statuses: Array<"pending" | "needs_review">): Promise<MembershipOrderEntity | null> {
    const row = await this.db.membershipOrder.findFirst({
      where: { userId, status: { in: statuses } },
      orderBy: { createdAt: "desc" },
      include: { membership: true },
    });
    return row ? toOrder(row) : null;
  }

  async createOrder(input: CreateOrderInput): Promise<MembershipOrderEntity> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.db.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.userId}))`;
          await tx.$queryRaw`SELECT id FROM membership_plans WHERE id = ${input.plan.id}::uuid FOR SHARE`;
          const plan = await tx.membershipPlan.findUniqueOrThrow({ where: { id: input.plan.id } });
          if (!plan.isActive || !plan.isPurchasable) {
            throw new DomainError(422, "PLAN_NOT_PURCHASABLE", "This plan cannot be purchased");
          }
          if (plan.priceVnd !== input.plan.priceVnd || plan.durationDays !== input.plan.durationDays || plan.name !== input.plan.name) {
            throw new DomainError(409, "CONFLICT", "Membership plan was updated; reload the current plan");
          }
          const existing = await tx.membershipOrder.findFirst({
            where: reusableOrderWhere(input.userId, input.plan),
            orderBy: [{ status: "desc" }, { createdAt: "desc" }, { id: "desc" }],
            include: { membership: true },
          });
          if (existing) return toOrder(existing);
          let code = transferCode(TRANSFER_PREFIX);
          while (await tx.membershipOrder.findUnique({ where: { transferContent: code }, select: { id: true } }))
            code = transferCode(TRANSFER_PREFIX);
          const created = await tx.membershipOrder.create({
            data: {
              userId: input.userId,
              planId: input.plan.id,
              planCodeSnapshot: input.plan.code,
              planNameSnapshot: input.plan.name,
              priceVnd: input.plan.priceVnd,
              durationDays: input.plan.durationDays,
              transferContent: code,
            },
            include: { membership: true },
          });
          await writeAudit(tx, {
            actorId: input.userId,
            actorType: "USER",
            action: "membership.order.create",
            resourceType: "membership_order",
            resourceId: created.id,
            ipAddress: null,
            changes: { before: null, after: { status: "pending", planCode: created.planCodeSnapshot, priceVnd: created.priceVnd, durationDays: created.durationDays } },
          });
          return toOrder(created);
        });
      } catch (error) {
        if (isUniqueViolation(error)) continue;
        throw error;
      }
    }
    throw new DomainError(500, "INTERNAL_SERVER_ERROR", "Could not allocate a unique transfer code");
  }

  async findReusableOrder(userId: string, plan: MembershipPlanEntity): Promise<MembershipOrderEntity | null> {
    const row = await this.db.membershipOrder.findFirst({
      where: reusableOrderWhere(userId, plan),
      orderBy: [{ status: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      include: { membership: true },
    });
    return row ? toOrder(row) : null;
  }

  async grantCompMembership(input: GrantCompMembershipInput): Promise<{ orderId: string; result: ActivationResult }> {
    // Create and activate in one transaction: a failed activation must not leave a comp order behind.
    return this.db.$transaction(async (tx) => {
      let code = transferCode(COMP_PREFIX);
      while (await tx.membershipOrder.findUnique({ where: { transferContent: code }, select: { id: true } }))
        code = transferCode(COMP_PREFIX);
      const order = await tx.membershipOrder.create({
        data: {
          userId: input.userId,
          planId: input.plan.id,
          planCodeSnapshot: input.plan.code,
          planNameSnapshot: input.plan.name,
          priceVnd: 0,
          durationDays: input.plan.durationDays,
          transferContent: code,
          adminNote: input.reason,
        },
      });
      const result = await this.activateOrderTx(tx, {
        orderId: order.id,
        now: input.now,
        actorId: input.actorId,
        maxStackDays: input.maxStackDays,
      });
      if (result.status === "stack_limit")
        throw new DomainError(422, "STACK_LIMIT_REACHED", "Membership would exceed the stacking limit");
      if (input.actorId) {
        const membership = await tx.membership.findUniqueOrThrow({ where: { orderId: order.id } });
        await writeAudit(tx, {
          actorId: input.actorId,
          actorType: "ADMIN",
          ipAddress: input.ipAddress ?? null,
          action: "membership.grant",
          resourceType: "membership",
          resourceId: input.userId,
          changes: {
            before: null,
            after: { membershipId: membership.id, planCode: input.plan.code, startsAt: membership.startsAt.toISOString(), expiresAt: membership.expiresAt.toISOString() },
            orderId: order.id,
            reason: input.reason,
          },
        });
      }
      return { orderId: order.id, result };
    });
  }

  async listOrders(userId: string, page: number, limit: number): Promise<{ items: MembershipOrderEntity[]; total: number }> {
    const where = { userId };
    const [rows, total] = await Promise.all([
      this.db.membershipOrder.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, include: { membership: true } }),
      this.db.membershipOrder.count({ where }),
    ]);
    return { items: rows.map(toOrder), total };
  }

  async findOrder(id: string, userId?: string): Promise<MembershipOrderEntity | null> {
    const row = await this.db.membershipOrder.findFirst({
      where: { id, ...(userId ? { userId } : {}) },
      include: { membership: true },
    });
    return row ? toOrder(row) : null;
  }

  async attachProof(orderId: string, assetId: string): Promise<MembershipOrderEntity> {
    const row = await this.db.membershipOrder.update({
      where: { id: orderId },
      data: { proofAssetId: assetId },
      include: { membership: true },
    });
    return toOrder(row);
  }

  async findOrderByTransferContent(content: string): Promise<MembershipOrderEntity | null> {
    const row = await this.db.membershipOrder.findUnique({ where: { transferContent: content }, include: { membership: true } });
    return row ? toOrder(row) : null;
  }

  async insertTransaction({ direction, rawPayload, ...input }: InsertTransactionInput): Promise<PaymentTransactionEntity> {
    return this.db.$transaction(async (tx) => {
      const ignored = direction === "out";
      const row = await tx.paymentTransaction.create({
        data: { ...input, rawPayload: rawPayload as Prisma.InputJsonValue, ...(ignored ? { status: "ignored", reason: "OUTBOUND" } : {}) },
      });
      await writeAudit(tx, {
        actorId: null,
        actorType: "SYSTEM",
        action: "membership.transaction.receive",
        resourceType: "payment_transaction",
        resourceId: row.id,
        ipAddress: null,
        changes: { before: null, after: { status: row.status, reason: row.reason, referenceCode: row.referenceCode, amount: row.amount } },
      });
      return toTransaction(row);
    });
  }

  async findTransactionByProviderRef(provider: string, externalId: string): Promise<PaymentTransactionEntity | null> {
    const row = await this.db.paymentTransaction.findUnique({
      where: { provider_externalId: { provider, externalId } },
    });
    return row ? toTransaction(row) : null;
  }

  async findTransactionById(id: string): Promise<PaymentTransactionEntity | null> {
    const row = await this.db.paymentTransaction.findUnique({ where: { id } });
    return row ? toTransaction(row) : null;
  }

  async markTransaction(id: string, status: "unmatched" | "needs_review" | "matched" | "ignored", reason: string | null, orderId?: string | null): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM payment_transactions WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.paymentTransaction.findUniqueOrThrow({ where: { id } });
      if (before.status === "matched" || before.status === "ignored") return;
      await updatePaymentStatus(tx, before, { status, reason, orderId: orderId === undefined ? before.orderId : orderId }, { actorId: null });
    });
  }

  async markTransactionIfOpen(id: string, reason: string, actor?: Parameters<MembershipRepository["markTransactionIfOpen"]>[2], note?: string): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM payment_transactions WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.paymentTransaction.findUniqueOrThrow({ where: { id } });
      if (before.status === "matched" || before.status === "ignored") return false;
      await updatePaymentStatus(tx, before, { status: "ignored", reason, orderId: before.orderId }, { actorId: actor?.actorId ?? null, ipAddress: actor?.ipAddress, note });
      return true;
    });
  }

  async activateOrder(input: ActivateOrderInput): Promise<ActivationResult> {
    return this.db.$transaction((tx) => this.activateOrderTx(tx, input));
  }

  audit(entry: AuditInput): Promise<void> {
    return writeAudit(this.db, entry);
  }

  paymentHistory(orderId: string | null, transactionIds: string[]): Promise<PremiumAuditEntry[]> {
    return this.db.auditLog.findMany({
      where: {
        OR: [
          ...(orderId ? [
            { resourceType: "membership_order", resourceId: orderId },
            { action: "membership.activated", changes: { path: ["orderId"], equals: orderId } },
          ] : []),
          { resourceType: "payment_transaction", resourceId: { in: transactionIds } },
        ],
      },
      select: auditSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }

  async listPremiumAudit(query: PremiumAuditQuery) {
    const where: Prisma.AuditLogWhereInput = {
      action: { startsWith: "membership.", equals: query.action },
      resourceType: query.resourceType,
      createdAt: {
        gte: query.from ? new Date(`${query.from}T00:00:00+07:00`) : undefined,
        lt: query.to ? new Date(new Date(`${query.to}T00:00:00+07:00`).getTime() + DAY_MS) : undefined,
      },
      ...(query.q ? { OR: [
        { resourceId: { contains: query.q, mode: "insensitive" } },
        { actor: { name: { contains: query.q, mode: "insensitive" } } },
        { actor: { email: { contains: query.q, mode: "insensitive" } } },
      ] } : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.auditLog.findMany({
        where,
        select: auditSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.auditLog.count({ where }),
    ], { isolationLevel: "RepeatableRead" });
    return { items, total };
  }

  async rejectOrderIfOpen(
    id: string,
    options: { actorId: string; reason: string | null; note: string | undefined; ipAddress: string | null; previousStatus: string },
  ): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      // Conditional update: the webhook may activate the order between the read and this write.
      const result = await tx.membershipOrder.updateMany({
        where: { id, status: { in: ["pending", "needs_review"] } },
        data: { status: "rejected", rejectionReason: options.reason ?? null, verifiedBy: options.actorId },
      });
      if (result.count === 0) return false;
      await writeAudit(tx, {
        actorId: options.actorId,
        actorType: "ADMIN",
        action: "membership.order.reject",
        resourceType: "membership_order",
        resourceId: id,
        changes: { before: { status: options.previousStatus }, after: { status: "rejected", reason: options.reason }, note: options.note },
        ipAddress: options.ipAddress,
      });
      return true;
    });
  }

  private async activateOrderTx(tx: Prisma.TransactionClient, input: ActivateOrderInput): Promise<ActivationResult> {
    const preview = await tx.membershipOrder.findUnique({ where: { id: input.orderId }, select: { userId: true } });
    if (!preview) throw new DomainError(404, "MEMBERSHIP_ORDER_NOT_FOUND", "Membership order not found");
    // Lock the user, not only the order: two orders of one user must not both read the same max expiry.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${preview.userId}::varchar FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM membership_orders WHERE id = ${input.orderId}::uuid FOR UPDATE`;
    const order = await tx.membershipOrder.findUniqueOrThrow({ where: { id: input.orderId } });
    if (order.status === "paid")
      return { status: "already_paid", bankTransactionId: order.bankTransactionId, membershipId: (await tx.membership.findUnique({ where: { orderId: order.id }, select: { id: true } }))?.id };
    if (order.status !== "pending" && order.status !== "needs_review")
      throw new DomainError(409, "ORDER_NOT_PENDING", "Order is no longer payable");

    const max = await tx.membership.aggregate({ where: { userId: order.userId, revokedAt: null }, _max: { expiresAt: true } });
    const currentExpiry = max._max.expiresAt;
    const startsAt = currentExpiry && currentExpiry.getTime() > input.now.getTime() ? currentExpiry : input.now;
    const expiresAt = new Date(startsAt.getTime() + order.durationDays * DAY_MS);
    const horizon = input.now.getTime() + input.maxStackDays * DAY_MS;
    if (expiresAt.getTime() > horizon) {
      await tx.membershipOrder.update({
        where: { id: order.id },
        data: { status: "needs_review", reviewReason: "STACK_LIMIT_REACHED" },
      });
      if (order.status !== "needs_review" || order.reviewReason !== "STACK_LIMIT_REACHED") {
        await writeAudit(tx, {
          actorId: input.actorId,
          actorType: input.actorId ? "ADMIN" : "SYSTEM",
          action: "membership.order.review",
          resourceType: "membership_order",
          resourceId: order.id,
          changes: { before: { status: order.status }, after: { status: "needs_review", reason: "STACK_LIMIT_REACHED" } },
          ipAddress: input.ipAddress ?? null,
        });
      }
      return { status: "stack_limit" };
    }

    await tx.membershipOrder.update({
      where: { id: order.id },
      data: {
        status: "paid",
        paidAt: input.now,
        verifiedBy: input.actorId,
        reviewReason: null,
        ...(input.bankTransactionId !== undefined ? { bankTransactionId: input.bankTransactionId } : {}),
      },
    });
    const membership = await tx.membership.create({
      data: {
        userId: order.userId,
        planId: order.planId,
        orderId: order.id,
        priceVnd: order.priceVnd,
        durationDays: order.durationDays,
        startsAt,
        expiresAt,
      },
    });
    await writeAudit(tx, {
      actorId: input.actorId,
      actorType: input.actorId ? "ADMIN" : "SYSTEM",
      action: "membership.order.paid",
      resourceType: "membership_order",
      resourceId: order.id,
      ipAddress: input.ipAddress ?? null,
      changes: {
        before: { status: order.status },
        after: { status: "paid", membershipId: membership.id, bankTransactionId: input.bankTransactionId ?? order.bankTransactionId },
        ...(input.note ? { note: input.note } : {}),
      },
    });
    return { status: "activated", membershipId: membership.id, expiresAt, bankTransactionId: input.bankTransactionId ?? order.bankTransactionId };
  }

  async applyTransaction(input: ApplyTransactionInput): Promise<{ status: "matched" | "needs_review"; reason: string | null; membershipId?: string }> {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM payment_transactions WHERE id = ${input.transactionId}::uuid FOR UPDATE`;
      const transaction = await tx.paymentTransaction.findUniqueOrThrow({ where: { id: input.transactionId } });
      if (transaction.status === "matched" || transaction.status === "ignored")
        return { status: transaction.status === "matched" ? "matched" : "needs_review", reason: transaction.reason };

      const fail = async (reason: string, orderId: string | null) => {
        await updatePaymentStatus(tx, transaction, { status: "needs_review", reason, orderId }, input);
        return { status: "needs_review" as const, reason };
      };

      const preview = await tx.membershipOrder.findUnique({ where: { id: input.orderId }, select: { userId: true } });
      if (!preview) return fail("NO_MATCHING_ORDER", null);
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${preview.userId}::varchar FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM membership_orders WHERE id = ${input.orderId}::uuid FOR UPDATE`;
      const order = await tx.membershipOrder.findUniqueOrThrow({ where: { id: input.orderId } });
      if (transaction.amount !== order.priceVnd) return fail("AMOUNT_MISMATCH", order.id);
      if (order.status === "rejected") return fail("ORDER_REJECTED", order.id);
      if (order.status === "needs_review" && !input.actorId) return fail("ORDER_NEEDS_REVIEW", order.id);

      const reference = transaction.externalId;
      if (order.status === "paid") {
        if (order.bankTransactionId && order.bankTransactionId !== reference) return fail("ORDER_ALREADY_PAID", order.id);
        await tx.membershipOrder.update({ where: { id: order.id }, data: { bankTransactionId: reference } });
        await updatePaymentStatus(tx, transaction, { status: "matched", reason: null, orderId: order.id }, input);
        return { status: "matched" as const, reason: null };
      }

      const result = await this.activateOrderTx(tx, {
        orderId: order.id,
        now: input.now,
        actorId: input.actorId,
        ipAddress: input.ipAddress,
        note: input.note,
        bankTransactionId: reference,
        maxStackDays: input.maxStackDays,
      });
      if (result.status === "activated") {
        await updatePaymentStatus(tx, transaction, { status: "matched", reason: null, orderId: order.id }, input);
        return { status: "matched" as const, reason: null, membershipId: result.membershipId };
      }
      if (result.status === "already_paid") {
        if (result.bankTransactionId && result.bankTransactionId !== reference) return fail("ORDER_ALREADY_PAID", order.id);
        await tx.membershipOrder.update({ where: { id: order.id }, data: { bankTransactionId: reference } });
        await updatePaymentStatus(tx, transaction, { status: "matched", reason: null, orderId: order.id }, input);
        return { status: "matched" as const, reason: null };
      }
      return fail("STACK_LIMIT_REACHED", order.id);
    });
  }

  async listOrdersForAdmin(query: OrderQuery): Promise<{ items: AdminOrderRow[]; total: number }> {
    const where: Prisma.MembershipOrderWhereInput = {
      ...(query.assignableAmount !== undefined ? {
        priceVnd: query.assignableAmount,
        AND: [{ status: { in: ["pending", "needs_review"] } }],
      } : {}),
      ...(query.status ? { status: query.status as Prisma.EnumMembershipOrderStatusFilter["equals"] } : {}),
      ...(query.from || query.to ? {
        createdAt: {
          ...(query.from ? { gte: new Date(`${query.from}T00:00:00+07:00`) } : {}),
          ...(query.to ? { lt: new Date(new Date(`${query.to}T00:00:00+07:00`).getTime() + DAY_MS) } : {}),
        },
      } : {}),
      ...(query.q
        ? {
            OR: [
              { transferContent: { contains: query.q, mode: "insensitive" } },
              { user: { email: { contains: query.q, mode: "insensitive" } } },
              { user: { name: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.membershipOrder.findMany({
        where,
        include: ADMIN_ORDER_INCLUDE,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.membershipOrder.count({ where }),
    ]);
    return { items: rows.map(toAdminOrder), total };
  }

  async findOrderDetailForAdmin(id: string): Promise<AdminOrderRow | null> {
    const row = await this.db.membershipOrder.findUnique({ where: { id }, include: ADMIN_ORDER_INCLUDE });
    return row ? toAdminOrder(row) : null;
  }

  async listTransactionsForAdmin(query: TransactionQuery): Promise<{ items: AdminTransactionRow[]; total: number }> {
    const where: Prisma.PaymentTransactionWhereInput = {
      ...(query.provider ? { provider: query.provider } : {}),
      ...(query.status ? { status: query.status as Prisma.EnumPaymentTransactionStatusFilter["equals"] } : {}),
      ...(query.q ? {
        OR: [
          { content: { contains: query.q, mode: "insensitive" } },
          { referenceCode: { contains: query.q, mode: "insensitive" } },
          { externalId: { contains: query.q, mode: "insensitive" } },
          { order: { user: { email: { contains: query.q, mode: "insensitive" } } } },
          { order: { user: { name: { contains: query.q, mode: "insensitive" } } } },
        ],
      } : {}),
      ...(query.from || query.to
        ? { transactionAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lt: query.to } : {}) } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.paymentTransaction.findMany({
        where,
        include: { order: { select: { id: true, transferContent: true, userId: true, status: true } } },
        orderBy: { transactionAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.paymentTransaction.count({ where }),
    ]);
    return { items: rows.map((row) => ({ ...toTransaction(row), order: row.order })), total };
  }

  async listTransactionsByOrder(orderId: string): Promise<AdminTransactionRow[]> {
    const rows = await this.db.paymentTransaction.findMany({
      where: { orderId },
      include: { order: { select: { id: true, transferContent: true, userId: true, status: true } } },
      orderBy: { transactionAt: "desc" },
    });
    return rows.map((row) => ({ ...toTransaction(row), order: row.order }));
  }

  async listMembersForAdmin(query: AdminMemberQuery): Promise<{ items: AdminMemberRow[]; total: number }> {
    const now = new Date();
    const accounts = Prisma.sql`
      SELECT u.id AS "userId", u.name, u.email,
        CASE WHEN m.id IS NULL THEN 'free'
          WHEN m.revoked_at IS NOT NULL THEN 'revoked'
          WHEN m.expires_at > ${now} THEN 'active'
          ELSE 'expired'
        END AS status,
        o.plan_code_snapshot AS "planCode", o.plan_name_snapshot AS "planName",
        m.starts_at AS "startsAt", m.expires_at AS "expiresAt",
        m.revoked_at AS "revokedAt", m.revoke_reason AS "revokeReason",
        CASE WHEN m.id IS NULL THEN NULL WHEN o.price_vnd = 0 THEN 'admin' ELSE 'payment' END AS source
      FROM users u
      LEFT JOIN LATERAL (
        SELECT * FROM memberships
        WHERE user_id = u.id
        ORDER BY (revoked_at IS NULL AND expires_at > ${now}) DESC, expires_at DESC, id DESC
        LIMIT 1
      ) m ON true
      LEFT JOIN membership_orders o ON o.id = m.order_id
      ${query.q ? Prisma.sql`WHERE strpos(lower(u.name), lower(${query.q})) > 0 OR strpos(lower(u.email), lower(${query.q})) > 0` : Prisma.empty}
    `;
    const filters = [
      query.status === "free" ? Prisma.sql`status <> 'active'`
        : query.status !== "all" ? Prisma.sql`status = ${query.status}` : Prisma.empty,
      query.expiresFrom ? Prisma.sql`"expiresAt" >= ${new Date(`${query.expiresFrom}T00:00:00+07:00`)}` : Prisma.empty,
      query.expiresTo ? Prisma.sql`"expiresAt" < ${new Date(new Date(`${query.expiresTo}T00:00:00+07:00`).getTime() + DAY_MS)}` : Prisma.empty,
    ].filter((filter) => filter !== Prisma.empty);
    const where = filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}` : Prisma.empty;
    const [items, totals] = await this.db.$transaction([
      this.db.$queryRaw<AdminMemberRow[]>`
        SELECT * FROM (${accounts}) accounts ${where}
        ORDER BY "expiresAt" DESC NULLS LAST, "userId"
        OFFSET ${(query.page - 1) * query.limit} LIMIT ${query.limit}
      `,
      this.db.$queryRaw<Array<{ total: number }>>`SELECT count(*)::integer AS total FROM (${accounts}) accounts ${where}`,
    ], { isolationLevel: "RepeatableRead" });
    return { items, total: totals[0]?.total ?? 0 };
  }

  async findUser(userId: string): Promise<{ id: string; name: string; email: string } | null> {
    return this.db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  }

  async revokeActiveMemberships(userId: string, reason: string, now: Date, actor?: Parameters<MembershipRepository["revokeActiveMemberships"]>[3]): Promise<number> {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::varchar FOR UPDATE`;
      const where = { userId, revokedAt: null, expiresAt: { gt: now } };
      const affected = await tx.membership.findMany({ where, select: { id: true, orderId: true, expiresAt: true } });
      if (!affected.length) return 0;
      const result = await tx.membership.updateMany({ where, data: { revokedAt: now, revokeReason: reason } });
      if (actor) {
        await writeAudit(tx, {
          ...actor,
          actorType: "ADMIN",
          action: "membership.revoke",
          resourceType: "membership",
          resourceId: userId,
          changes: {
            before: { status: "premium", periods: affected.map(({ id, orderId, expiresAt }) => ({ id, orderId, expiresAt: expiresAt.toISOString() })) },
            after: { status: "free", revokedAt: now.toISOString() },
            reason,
          },
        });
      }
      return result.count;
    });
  }

  async report(query: ReportQuery, now: Date): Promise<MembershipReport> {
    const from = query.from;
    const to = query.to;
    const paidWhere = Prisma.sql`status = 'paid' AND paid_at >= ${from} AND paid_at < ${to}`;

    const [summary] = await this.db.$queryRaw<Array<{ revenueVnd: bigint; paidOrders: number; compGrants: number }>>(Prisma.sql`
      SELECT COALESCE(SUM(price_vnd), 0)::bigint AS "revenueVnd",
             COUNT(*) FILTER (WHERE price_vnd > 0)::int AS "paidOrders",
             COUNT(*) FILTER (WHERE price_vnd = 0)::int AS "compGrants"
      FROM membership_orders
      WHERE ${paidWhere}
    `);
    const [active] = await this.db.$queryRaw<Array<{ activeMembers: number; expiringIn7Days: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS "activeMembers",
             COUNT(*) FILTER (WHERE max_expiry <= ${new Date(now.getTime() + 7 * DAY_MS)})::int AS "expiringIn7Days"
      FROM (
        SELECT user_id, MAX(expires_at) AS max_expiry
        FROM memberships
        WHERE revoked_at IS NULL
        GROUP BY user_id
      ) stacked
      WHERE max_expiry > ${now}
    `);
    const [pending] = await this.db.$queryRaw<Array<{ pendingOver24h: number; needsReviewOrders: number }>>(Prisma.sql`
      SELECT COUNT(*) FILTER (WHERE status = 'pending' AND created_at < ${new Date(now.getTime() - DAY_MS)})::int AS "pendingOver24h",
             COUNT(*) FILTER (WHERE status = 'needs_review')::int AS "needsReviewOrders"
      FROM membership_orders
    `);
    const [unmatched] = await this.db.$queryRaw<Array<{ unmatchedTransactions: number; unmatchedAmountVnd: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::int AS "unmatchedTransactions", COALESCE(SUM(amount), 0)::bigint AS "unmatchedAmountVnd"
      FROM payment_transactions
      WHERE status = 'unmatched'
    `);

    const buckets = await this.db.$queryRaw<Array<{ bucket: string; revenueVnd: bigint; paidOrders: number }>>(Prisma.sql`
      SELECT to_char(date_trunc(${query.groupBy}, paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS bucket,
             COALESCE(SUM(price_vnd), 0)::bigint AS "revenueVnd",
             COUNT(*)::int AS "paidOrders"
      FROM membership_orders
      WHERE ${paidWhere} AND price_vnd > 0
      GROUP BY 1 ORDER BY 1
    `);
    const planBuckets = await this.db.$queryRaw<Array<{ bucket: string; planCode: string; revenueVnd: bigint; paidOrders: number }>>(Prisma.sql`
      SELECT to_char(date_trunc(${query.groupBy}, paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS bucket,
             plan_code_snapshot AS "planCode",
             COALESCE(SUM(price_vnd), 0)::bigint AS "revenueVnd",
             COUNT(*)::int AS "paidOrders"
      FROM membership_orders
      WHERE ${paidWhere} AND price_vnd > 0
      GROUP BY 1, 2 ORDER BY 1
    `);

    return {
      range: { from: query.from.toISOString(), to: query.to.toISOString(), groupBy: query.groupBy },
      summary: {
        revenueVnd: Number(summary?.revenueVnd ?? 0),
        paidOrders: summary?.paidOrders ?? 0,
        compGrants: summary?.compGrants ?? 0,
        activeMembers: active?.activeMembers ?? 0,
        expiringIn7Days: active?.expiringIn7Days ?? 0,
        pendingOver24h: pending?.pendingOver24h ?? 0,
        needsReviewOrders: pending?.needsReviewOrders ?? 0,
        unmatchedTransactions: unmatched?.unmatchedTransactions ?? 0,
        unmatchedAmountVnd: Number(unmatched?.unmatchedAmountVnd ?? 0),
      },
      series: buckets.map((bucket) => ({
        bucket: bucket.bucket,
        revenueVnd: Number(bucket.revenueVnd),
        paidOrders: bucket.paidOrders,
        byPlan: planBuckets
          .filter((row) => row.bucket === bucket.bucket)
          .map((row) => ({ planCode: row.planCode, revenueVnd: Number(row.revenueVnd), paidOrders: row.paidOrders })),
      })),
    };
  }
}
