import type { ModeratorChartTone, ModeratorIntegrationStatus } from "./types";

export const moderatorChartColors = {
  sky: { token: "mod-chart-sky", svg: "var(--modChartSky)" },
  violet: { token: "mod-chart-violet", svg: "var(--modChartViolet)" },
  emerald: { token: "mod-chart-emerald", svg: "var(--modChartEmerald)" },
} as const satisfies Record<ModeratorChartTone, { token: string; svg: string }>;

export const moderatorStatusTokens = {
  connected: { color: "var(--modSuccess)", label: "Đã kết nối" },
  unconfigured: { color: "var(--modTextSecondary)", label: "Chưa kết nối" },
  error: { color: "var(--modAttention)", label: "Cần kiểm tra" },
} as const satisfies Record<ModeratorIntegrationStatus, { color: string; label: string }>;
