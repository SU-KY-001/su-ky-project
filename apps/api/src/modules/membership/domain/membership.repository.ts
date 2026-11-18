import type {
  ActivationResult,
  AdminMemberRow,
  AdminOrderRow,
  AdminTransactionRow,
  MembershipOrderEntity,
  MembershipPlanEntity,
  MembershipReport,
  MembershipWithPlan,
  PaymentTransactionEntity,
} from "./membership.entity";
import type { AuditInput } from "../../../core/audit";
import type { AdminMemberQuery, AdminPlanPatch, PremiumAuditEntry, PremiumAuditQuery } from "@repo/shared";

type PlanActor = Pick<AuditInput, "actorId" | "ipAddress">;

export interface CreateOrderInput {
  userId: string;
  plan: MembershipPlanEntity;
}

export interface ActivateOrderInput {
  orderId: string;
  now: Date;
  actorId: string | null;
  bankTransactionId?: string | null;
  note?: string;
  ipAddress?: string | null;
  maxStackDays: number;
}

export interface GrantCompMembershipInput {
  userId: string;
  plan: MembershipPlanEntity;
  reason: string;
  now: Date;
  actorId: string | null;
  ipAddress?: string | null;
  maxStackDays: number;
}

export interface InsertTransactionInput {
  provider: string;
  externalId: string;
  referenceCode: string | null;
  amount: number;
  accumulated: bigint | null;
  content: string;
  code: string | null;
  gateway: string | null;
  accountNumber: string | null;
  subAccount: string | null;
  transactionAt: Date;
  rawPayload: unknown;
  direction?: "in" | "out";
}

export interface ApplyTransactionInput {
  transactionId: string;
  orderId: string;
  actorId: string | null;
  note?: string;
  ipAddress?: string | null;
  maxStackDays: number;
  now: Date;
}

export interface OrderQuery {
  assignableAmount?: number;
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface TransactionQuery {
  provider?: string;
  status?: string;
  from?: Date;
  to?: Date;
  q?: string;
  page: number;
  limit: number;
}

export interface ReportQuery {
  from: Date;
  to: Date;
  groupBy: "day" | "month";
}

export interface MembershipRepository {
  listPlans(): Promise<MembershipPlanEntity[]>;
  findPlanByCode(code: string): Promise<MembershipPlanEntity | null>;
  updatePlan(code: string, patch: AdminPlanPatch, actor: PlanActor): Promise<MembershipPlanEntity>;

  findActiveMembership(userId: string, now: Date): Promise<MembershipWithPlan | null>;
  findMaxExpiry(userId: string): Promise<Date | null>;
  findLatestOrder(userId: string, statuses: Array<"pending" | "needs_review">): Promise<MembershipOrderEntity | null>;
  findReusableOrder(userId: string, plan: MembershipPlanEntity): Promise<MembershipOrderEntity | null>;

  createOrder(input: CreateOrderInput): Promise<MembershipOrderEntity>;
  grantCompMembership(input: GrantCompMembershipInput): Promise<{ orderId: string; result: ActivationResult }>;
  listOrders(userId: string, page: number, limit: number): Promise<{ items: MembershipOrderEntity[]; total: number }>;
  findOrder(id: string, userId?: string): Promise<MembershipOrderEntity | null>;
  attachProof(orderId: string, assetId: string): Promise<MembershipOrderEntity>;
  activateOrder(input: ActivateOrderInput): Promise<ActivationResult>;

  /** Audit writes go through the repository so services never hold a Prisma client. */
  audit(entry: AuditInput): Promise<void>;
  paymentHistory(orderId: string | null, transactionIds: string[]): Promise<PremiumAuditEntry[]>;
  listPremiumAudit(query: PremiumAuditQuery): Promise<{ items: PremiumAuditEntry[]; total: number }>;
  /** Rejects only a still-open order; false when the webhook activated it first. */
  rejectOrderIfOpen(
    id: string,
    options: {
      actorId: string;
      reason: string | null;
      note: string | undefined;
      ipAddress: string | null;
      previousStatus: string;
    },
  ): Promise<boolean>;

  insertTransaction(input: InsertTransactionInput): Promise<PaymentTransactionEntity>;
  findTransactionByProviderRef(provider: string, externalId: string): Promise<PaymentTransactionEntity | null>;
  findOrderByTransferContent(content: string): Promise<MembershipOrderEntity | null>;
  markTransaction(id: string, status: "unmatched" | "needs_review" | "matched" | "ignored", reason: string | null, orderId?: string | null): Promise<void>;
  /** Ignores only a still-open transaction; false when the webhook already matched it. */
  markTransactionIfOpen(id: string, reason: string, actor?: PlanActor, note?: string): Promise<boolean>;
  applyTransaction(input: ApplyTransactionInput): Promise<{ status: "matched" | "needs_review"; reason: string | null; membershipId?: string }>;

  listOrdersForAdmin(query: OrderQuery): Promise<{ items: AdminOrderRow[]; total: number }>;
  findOrderDetailForAdmin(id: string): Promise<AdminOrderRow | null>;
  listTransactionsForAdmin(query: TransactionQuery): Promise<{ items: AdminTransactionRow[]; total: number }>;
  listTransactionsByOrder(orderId: string): Promise<AdminTransactionRow[]>;
  findTransactionById(id: string): Promise<PaymentTransactionEntity | null>;
  listMembersForAdmin(query: AdminMemberQuery): Promise<{ items: AdminMemberRow[]; total: number }>;
  findUser(userId: string): Promise<{ id: string; name: string; email: string } | null>;
  revokeActiveMemberships(userId: string, reason: string, now: Date, actor?: PlanActor): Promise<number>;
  report(query: ReportQuery, now: Date): Promise<MembershipReport>;
}
