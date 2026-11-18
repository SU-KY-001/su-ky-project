import { z } from "zod";
import {
  MembershipEntitlementSchema,
  MembershipOrderSchema,
  MembershipPlanSchema,
  type ExperienceFeature,
} from "@repo/shared";
import { create } from "zustand";

/**
 * Mock-only membership source. Replace with the membership API service once the
 * premium endpoints are deployed; types come from `@repo/shared` so the swap is mechanical.
 */
export type MembershipTier = "free" | "premium";
export type PreviewTier = MembershipTier | "renewSoon";
export type MembershipEntitlement = z.infer<typeof MembershipEntitlementSchema>;
export type MembershipOrder = z.infer<typeof MembershipOrderSchema>;
export type MembershipOrderStatus = MembershipOrder["status"];
export type MembershipPlan = z.infer<typeof MembershipPlanSchema>;

const DAY_MS = 86_400_000;
const VN_OFFSET_MS = 7 * 3_600_000;

export const PREMIUM_PLAN: MembershipPlan = {
  code: "monthly",
  name: "Gói tháng",
  benefits: "",
  priceVnd: 20_000,
  durationDays: 30,
  isPurchasable: true,
  sortOrder: 1,
};

const MOCK_BANK = {
  bankName: "MB Bank",
  accountNumber: "0000123456789",
  accountName: "CONG TY CO PHAN SU KY",
} as const;

export const FEATURE_LABELS: Record<ExperienceFeature, string> = {
  podcast: "Nghe podcast",
  quiz: "Lượt làm quiz",
  exhibition: "Vào triển lãm",
};

export const FEATURE_ICONS: Record<ExperienceFeature, "headphones" | "help-circle" | "map"> = {
  podcast: "headphones",
  quiz: "help-circle",
  exhibition: "map",
};

export const FREE_LIMITS: Record<ExperienceFeature, number> = { podcast: 4, quiz: 4, exhibition: 1 };
const MOCK_USED: Record<ExperienceFeature, number> = { podcast: 2, quiz: 1, exhibition: 1 };

export const ORDER_STATUS_LABELS: Record<MembershipOrderStatus, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  needs_review: "Cần đối soát",
  rejected: "Bị từ chối",
};

export function formatVnd(value: number): string {
  return `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}

export function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${value.getFullYear()}`;
}

function nextResetAt(): Date {
  const now = new Date();
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);
  const nextMidnightUtc = Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate() + 1);
  return new Date(nextMidnightUtc - VN_OFFSET_MS);
}

function daysLeft(expiresAt: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS));
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY_MS);
}

function seedOrders(): MembershipOrder[] {
  return [
    {
      id: "mock-order-paid",
      planCode: PREMIUM_PLAN.code,
      planName: PREMIUM_PLAN.name,
      priceVnd: PREMIUM_PLAN.priceVnd,
      durationDays: PREMIUM_PLAN.durationDays,
      transferContent: "SUKY DEMO0001",
      status: "paid",
      reviewReason: null,
      createdAt: daysFromNow(-35),
      paidAt: daysFromNow(-35),
      expiresAt: daysFromNow(-5),
      rejectionReason: null,
      proofUploaded: true,
      bank: { ...MOCK_BANK, qrUrl: "", amount: PREMIUM_PLAN.priceVnd, transferContent: "SUKY DEMO0001" },
    },
    {
      id: "mock-order-rejected",
      planCode: PREMIUM_PLAN.code,
      planName: PREMIUM_PLAN.name,
      priceVnd: PREMIUM_PLAN.priceVnd,
      durationDays: PREMIUM_PLAN.durationDays,
      transferContent: "SUKY DEMO0002",
      status: "rejected",
      reviewReason: null,
      createdAt: daysFromNow(-12),
      paidAt: null,
      expiresAt: null,
      rejectionReason: "Nội dung chuyển khoản không khớp với mã đơn.",
      proofUploaded: false,
      bank: { ...MOCK_BANK, qrUrl: "", amount: PREMIUM_PLAN.priceVnd, transferContent: "SUKY DEMO0002" },
    },
  ];
}

interface MockMembershipState {
  preview: PreviewTier;
  orders: MembershipOrder[];
  paidUntil: Date | null;
  setPreview: (preview: PreviewTier) => void;
  entitlement: () => MembershipEntitlement;
  createOrder: () => MembershipOrder;
  markPaid: (orderId: string) => void;
  markNeedsReview: (orderId: string) => void;
  markRejected: (orderId: string) => void;
}

let transferSeq = 2;

export const useMockMembership = create<MockMembershipState>((set, get) => ({
  preview: "free",
  orders: seedOrders(),
  paidUntil: null,

  setPreview: (preview) => set({ preview, paidUntil: null }),

  entitlement: () => {
    const { preview, orders, paidUntil } = get();
    const pending = orders.find((order) => order.status === "pending" || order.status === "needs_review");
    const paidExpiry = paidUntil && paidUntil.getTime() > Date.now() ? paidUntil : null;

    if (paidExpiry || preview !== "free") {
      const expiresAt = paidExpiry ?? daysFromNow(preview === "renewSoon" ? 3 : 25);
      return {
        tier: "premium",
        expiresAt,
        daysLeft: daysLeft(expiresAt),
        planCode: PREMIUM_PLAN.code,
        pendingOrderId: pending?.id ?? null,
        renewSoon: daysLeft(expiresAt) <= 5,
        quota: null,
        experienceQuotas: [],
      };
    }

    const resetsAt = nextResetAt();
    const experienceQuotas = (Object.keys(FREE_LIMITS) as ExperienceFeature[]).map((feature) => ({
      feature,
      mode: "free_limited" as const,
      enforced: true,
      limit: FREE_LIMITS[feature],
      usedToday: MOCK_USED[feature],
      remaining: Math.max(0, FREE_LIMITS[feature] - MOCK_USED[feature]),
      resetsAt,
    }));
    return {
      tier: "free",
      expiresAt: null,
      daysLeft: null,
      planCode: null,
      pendingOrderId: pending?.id ?? null,
      renewSoon: false,
      quota: experienceQuotas[0],
      experienceQuotas,
    };
  },

  createOrder: () => {
    transferSeq += 1;
    const transferContent = `SUKY DEMO${String(transferSeq).padStart(4, "0")}`;
    const order: MembershipOrder = {
      id: `mock-order-${transferSeq}`,
      planCode: PREMIUM_PLAN.code,
      planName: PREMIUM_PLAN.name,
      priceVnd: PREMIUM_PLAN.priceVnd,
      durationDays: PREMIUM_PLAN.durationDays,
      transferContent,
      status: "pending",
      reviewReason: null,
      createdAt: new Date(),
      paidAt: null,
      expiresAt: null,
      rejectionReason: null,
      proofUploaded: false,
      bank: { ...MOCK_BANK, qrUrl: "", amount: PREMIUM_PLAN.priceVnd, transferContent },
    };
    set((state) => ({ orders: [order, ...state.orders] }));
    return order;
  },

  markPaid: (orderId) => {
    const expiresAt = daysFromNow(PREMIUM_PLAN.durationDays);
    const paidAt = new Date();
    set((state) => ({
      preview: "premium",
      paidUntil: expiresAt,
      orders: state.orders.map((order) =>
        order.id === orderId
          ? { ...order, status: "paid", paidAt, expiresAt, rejectionReason: null }
          : order,
      ),
    }));
  },

  markNeedsReview: (orderId) => {
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId ? { ...order, status: "needs_review", reviewReason: "Giao dịch cần đối soát thủ công." } : order,
      ),
    }));
  },

  markRejected: (orderId) => {
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId
          ? { ...order, status: "rejected", rejectionReason: "Không tìm thấy giao dịch khớp với mã đơn." }
          : order,
      ),
    }));
  },
}));
