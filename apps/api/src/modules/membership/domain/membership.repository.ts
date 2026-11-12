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
} from "./membership.entity";

export interface CreateOrderInput {
  userId: string;
  plan: MembershipPlanEntity;
}

export interface ActivateOrderInput {
  orderId: string;
  now: Date;
  actorId: string | null;
  bankTransactionId?: string | null;
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
}

export interface ApplyTransactionInput {
  transactionId: string;
  orderId: string;
  actorId: string | null;
  maxStackDays: number;
  now: Date;
}

export interface OrderQuery {
  status?: string;
  q?: string;
  page: number;
  limit: number;
}

export interface TransactionQuery {
  provider?: string;
  status?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface MemberQuery {
  status: "active" | "expired" | "all";
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
  findPlanById(id: string): Promise<MembershipPlanEntity | null>;
  updatePlan(id: string, patch: Partial<Pick<MembershipPlanEntity, "name" | "priceVnd" | "durationDays" | "isPurchasable" | "isActive" | "sortOrder">>): Promise<MembershipPlanEntity>;

  findActiveMembership(userId: string, now: Date): Promise<MembershipWithPlan | null>;
  findMaxExpiry(userId: string): Promise<Date | null>;
  findLatestOrder(userId: string, statuses: Array<"pending" | "needs_review">): Promise<MembershipOrderEntity | null>;

  createOrder(input: CreateOrderInput): Promise<MembershipOrderEntity>;
  createCompOrder(userId: string, plan: MembershipPlanEntity, reason: string): Promise<MembershipOrderEntity>;
  listOrders(userId: string, page: number, limit: number): Promise<{ items: MembershipOrderEntity[]; total: number }>;
  findOrder(id: string, userId?: string): Promise<MembershipOrderEntity | null>;
  attachProof(orderId: string, assetId: string): Promise<MembershipOrderEntity>;
  activateOrder(input: ActivateOrderInput): Promise<ActivationResult>;

  insertTransaction(input: InsertTransactionInput): Promise<PaymentTransactionEntity>;
  findTransactionByProviderRef(provider: string, externalId: string): Promise<PaymentTransactionEntity | null>;
  findOrderByTransferContent(content: string): Promise<MembershipOrderEntity | null>;
  markTransaction(id: string, status: "unmatched" | "needs_review" | "matched" | "ignored", reason: string | null, orderId?: string | null): Promise<void>;
  applyTransaction(input: ApplyTransactionInput): Promise<{ status: "matched" | "needs_review"; reason: string | null; membershipId?: string }>;

  listOrdersForAdmin(query: OrderQuery): Promise<{ items: AdminOrderRow[]; total: number }>;
  findOrderDetailForAdmin(id: string): Promise<AdminOrderRow | null>;
  listTransactionsForAdmin(query: TransactionQuery): Promise<{ items: AdminTransactionRow[]; total: number }>;
  listTransactionsByOrder(orderId: string): Promise<AdminTransactionRow[]>;
  findTransactionById(id: string): Promise<PaymentTransactionEntity | null>;
  listMembersForAdmin(query: MemberQuery): Promise<{ items: AdminMemberRow[]; total: number }>;
  findUser(userId: string): Promise<{ id: string; name: string; email: string } | null>;
  revokeActiveMemberships(userId: string, reason: string, now: Date): Promise<number>;
  report(query: ReportQuery, now: Date): Promise<MembershipReport>;
  findMembership(orderId: string): Promise<MembershipEntity | null>;
}
