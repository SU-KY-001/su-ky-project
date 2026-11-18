import type { ExperienceFeature } from "@repo/shared";
import type { MembershipOrder } from "./services/membershipService";

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

export const ORDER_STATUS_LABELS: Record<MembershipOrder["status"], string> = {
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
