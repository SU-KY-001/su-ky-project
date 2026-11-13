import { randomBytes } from "node:crypto";
import { Prisma, prisma, type PrismaClient } from "@repo/db";
import { DomainError } from "../../../core/errors/domain-error";
import type {
  ActivateOrderInput,
  ApplyTransactionInput,
  CreateOrderInput,
  GrantCompMembershipInput,
  InsertTransactionInput,
  MemberQuery,
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

type OrderRow = Prisma.MembershipOrderGetPayload<{ include: { membership: true } }>;
type PlanRow = Prisma.MembershipPlanGetPayload<object>;

function toPlan(row: PlanRow): MembershipPlanEntity {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    priceVnd: row.priceVnd,
    durationDays: row.durationDays,
    isPurchasable: row.isPurchasable,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
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
    const rows = await this.db.membershipPlan.findMany({ orderBy: { sortOrder: "asc" } });
    return rows.map(toPlan);
  }

  async findPlanByCode(code: string): Promise<MembershipPlanEntity | null> {
    const row = await this.db.membershipPlan.findUnique({ where: { code } });
    return row ? toPlan(row) : null;
  }

  async updatePlan(id: string, patch: Partial<Pick<MembershipPlanEntity, "name" | "priceVnd" | "durationDays" | "isPurchasable" | "isActive" | "sortOrder">>): Promise<MembershipPlanEntity> {
    const row = await this.db.membershipPlan.update({ where: { id }, data: patch });
    return toPlan(row);
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
          const existing = await tx.membershipOrder.findFirst({
            where: { userId: input.userId, status: { in: ["pending", "needs_review"] } },
            orderBy: { createdAt: "desc" },
            include: { membership: true },
          });
          if (existing?.status === "needs_review") return toOrder(existing);
          if (existing && existing.priceVnd === input.plan.priceVnd && existing.durationDays === input.plan.durationDays)
            return toOrder(existing);
          if (existing)
            await tx.membershipOrder.update({
              where: { id: existing.id },
              data: { status: "rejected", rejectionReason: "PLAN_PRICE_CHANGED" },
            });
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
          return toOrder(created);
        });
      } catch (error) {
        if (isUniqueViolation(error)) continue;
        throw error;
      }
    }
    throw new DomainError(500, "INTERNAL_SERVER_ERROR", "Could not allocate a unique transfer code");
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

  async insertTransaction(input: InsertTransactionInput): Promise<PaymentTransactionEntity> {
    const row = await this.db.paymentTransaction.create({
      data: { ...input, rawPayload: input.rawPayload as Prisma.InputJsonValue },
    });
    return toTransaction(row);
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
    await this.db.paymentTransaction.update({
      where: { id },
      data: { status, reason, ...(orderId === undefined ? {} : { orderId }) },
    });
  }

  async markTransactionIfOpen(id: string, reason: string): Promise<boolean> {
    const result = await this.db.paymentTransaction.updateMany({
      where: { id, status: { in: ["unmatched", "needs_review"] } },
      data: { status: "ignored", reason },
    });
    return result.count > 0;
  }

  async activateOrder(input: ActivateOrderInput): Promise<ActivationResult> {
    return this.db.$transaction((tx) => this.activateOrderTx(tx, input));
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
    return { status: "activated", membershipId: membership.id, expiresAt, bankTransactionId: input.bankTransactionId ?? order.bankTransactionId };
  }

  async applyTransaction(input: ApplyTransactionInput): Promise<{ status: "matched" | "needs_review"; reason: string | null; membershipId?: string }> {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM payment_transactions WHERE id = ${input.transactionId}::uuid FOR UPDATE`;
      const transaction = await tx.paymentTransaction.findUniqueOrThrow({ where: { id: input.transactionId } });
      if (transaction.status === "matched" || transaction.status === "ignored")
        return { status: transaction.status === "matched" ? "matched" : "needs_review", reason: transaction.reason };

      const fail = async (reason: string, orderId: string | null) => {
        await tx.paymentTransaction.update({ where: { id: transaction.id }, data: { status: "needs_review", reason, orderId } });
        return { status: "needs_review" as const, reason };
      };

      const order = await tx.membershipOrder.findFirst({ where: { id: input.orderId } });
      if (!order) return fail("NO_MATCHING_ORDER", null);
      if (transaction.amount !== order.priceVnd) return fail("AMOUNT_MISMATCH", order.id);
      if (order.status === "rejected") return fail("ORDER_REJECTED", order.id);
      if (order.status === "needs_review") return fail("ORDER_NEEDS_REVIEW", order.id);

      const reference = transaction.externalId;
      if (order.status === "paid") {
        if (order.bankTransactionId && order.bankTransactionId !== reference) return fail("ORDER_ALREADY_PAID", order.id);
        await tx.membershipOrder.update({ where: { id: order.id }, data: { bankTransactionId: reference } });
        await tx.paymentTransaction.update({ where: { id: transaction.id }, data: { status: "matched", reason: null, orderId: order.id } });
        return { status: "matched" as const, reason: null };
      }

      const result = await this.activateOrderTx(tx, {
        orderId: order.id,
        now: input.now,
        actorId: input.actorId,
        bankTransactionId: reference,
        maxStackDays: input.maxStackDays,
      });
      if (result.status === "activated") {
        await tx.paymentTransaction.update({ where: { id: transaction.id }, data: { status: "matched", reason: null, orderId: order.id } });
        return { status: "matched" as const, reason: null, membershipId: result.membershipId };
      }
      if (result.status === "already_paid") {
        if (result.bankTransactionId && result.bankTransactionId !== reference) return fail("ORDER_ALREADY_PAID", order.id);
        await tx.membershipOrder.update({ where: { id: order.id }, data: { bankTransactionId: reference } });
        await tx.paymentTransaction.update({ where: { id: transaction.id }, data: { status: "matched", reason: null, orderId: order.id } });
        return { status: "matched" as const, reason: null };
      }
      return fail("STACK_LIMIT_REACHED", order.id);
    });
  }

  async listOrdersForAdmin(query: OrderQuery): Promise<{ items: AdminOrderRow[]; total: number }> {
    const where: Prisma.MembershipOrderWhereInput = {
      ...(query.status ? { status: query.status as Prisma.EnumMembershipOrderStatusFilter["equals"] } : {}),
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
        orderBy: { createdAt: "desc" },
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

  async listMembersForAdmin(query: MemberQuery): Promise<{ items: AdminMemberRow[]; total: number }> {
    const now = new Date();
    const filters: Prisma.MembershipWhereInput[] = [];
    if (query.status === "active") filters.push({ revokedAt: null, expiresAt: { gt: now } });
    if (query.status === "expired") {
      const activeUserIds = (
        await this.db.membership.findMany({
          where: { revokedAt: null, expiresAt: { gt: now } },
          distinct: ["userId"],
          select: { userId: true },
        })
      ).map((row) => row.userId);
      filters.push({ userId: { notIn: activeUserIds } });
    }
    if (query.q) filters.push({ OR: [{ user: { email: { contains: query.q, mode: "insensitive" } } }, { user: { name: { contains: query.q, mode: "insensitive" } } }] });
    const where: Prisma.MembershipWhereInput = filters.length ? { AND: filters } : {};

    const groups = await this.db.membership.groupBy({ by: ["userId"], where, _max: { expiresAt: true }, orderBy: { _max: { expiresAt: "desc" } } });
    const pageIds = groups.slice((query.page - 1) * query.limit, query.page * query.limit).map((group) => group.userId);
    const rows = pageIds.length
      ? await this.db.membership.findMany({
          where: { ...where, userId: { in: pageIds } },
          include: { user: { select: { id: true, name: true, email: true } }, plan: { select: { code: true, name: true } } },
          orderBy: { expiresAt: "desc" },
        })
      : [];
    const byUser = new Map<string, (typeof rows)[number]>();
    for (const row of rows) if (!byUser.has(row.userId)) byUser.set(row.userId, row);
    const items = pageIds.flatMap((userId): AdminMemberRow[] => {
      const row = byUser.get(userId);
      if (!row) return [];
      return [{
        userId: row.userId,
        name: row.user.name,
        email: row.user.email,
        planCode: row.plan.code,
        planName: row.plan.name,
        startsAt: row.startsAt,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
      }];
    });
    return { items, total: groups.length };
  }

  async findUser(userId: string): Promise<{ id: string; name: string; email: string } | null> {
    return this.db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  }

  async revokeActiveMemberships(userId: string, reason: string, now: Date): Promise<number> {
    const result = await this.db.membership.updateMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now, revokeReason: reason },
    });
    return result.count;
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
