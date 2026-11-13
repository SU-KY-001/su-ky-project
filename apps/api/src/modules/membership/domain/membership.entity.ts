export type MembershipOrderStatus = "pending" | "paid" | "needs_review" | "rejected";
export type PaymentTransactionStatus = "unmatched" | "needs_review" | "matched" | "ignored";

export interface MembershipPlanEntity {
  id: string;
  code: string;
  name: string;
  priceVnd: number;
  durationDays: number;
  isPurchasable: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipEntity {
  id: string;
  userId: string;
  planId: string;
  orderId: string;
  priceVnd: number;
  durationDays: number;
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
  createdAt: Date;
}

export interface MembershipWithPlan extends MembershipEntity {
  plan: { code: string; name: string };
}

export interface MembershipOrderEntity {
  id: string;
  userId: string;
  planId: string;
  planCodeSnapshot: string;
  planNameSnapshot: string;
  priceVnd: number;
  durationDays: number;
  currency: string;
  transferContent: string;
  status: MembershipOrderStatus;
  proofAssetId: string | null;
  rejectionReason: string | null;
  bankTransactionId: string | null;
  paidAt: Date | null;
  verifiedBy: string | null;
  reviewReason: string | null;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  membership: MembershipEntity | null;
}

export interface PaymentTransactionEntity {
  id: string;
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
  status: PaymentTransactionStatus;
  orderId: string | null;
  reason: string | null;
  rawPayload: unknown;
  createdAt: Date;
}

export interface ProofAssetRef {
  publicId: string;
  kind: "AUDIO" | "IMAGE" | "DOCUMENT";
  version: bigint | null;
  format: string | null;
  status: "PENDING" | "READY" | "DELETED";
}

export interface AdminOrderRow extends MembershipOrderEntity {
  user: { id: string; name: string; email: string };
  proofAsset: ProofAssetRef | null;
}

export interface AdminTransactionRow extends PaymentTransactionEntity {
  order: {
    id: string;
    transferContent: string;
    userId: string;
    status: MembershipOrderStatus;
  } | null;
}

export interface AdminMemberRow {
  userId: string;
  name: string;
  email: string;
  planCode: string;
  planName: string;
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface ActivationResult {
  status: "activated" | "already_paid" | "stack_limit";
  membershipId?: string;
  bankTransactionId?: string | null;
  expiresAt?: Date;
}

export interface ReportBucket {
  bucket: string;
  revenueVnd: number;
  paidOrders: number;
  byPlan: Array<{ planCode: string; revenueVnd: number; paidOrders: number }>;
}

export interface MembershipReport {
  range: { from: string; to: string; groupBy: "day" | "month" };
  summary: {
    revenueVnd: number;
    paidOrders: number;
    compGrants: number;
    activeMembers: number;
    expiringIn7Days: number;
    pendingOver24h: number;
    needsReviewOrders: number;
    unmatchedTransactions: number;
    unmatchedAmountVnd: number;
  };
  series: ReportBucket[];
}
