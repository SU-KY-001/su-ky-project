import type { SystemHealthDto } from "@repo/shared";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";

export function ReleaseWorkerStatus({ health, healthError, syncError, updatedAt }: {
  health?: SystemHealthDto;
  healthError: boolean;
  syncError: boolean;
  updatedAt: number;
}) {
  const worker = healthError ? undefined : health?.releaseWorker;
  const running = worker === "running" && health?.database === "connected";
  const label = running ? "Worker nhắc hạn đang hoạt động"
    : worker === "stale" ? "Worker nhắc hạn mất nhịp"
    : worker === "stopped" ? "Chưa ghi nhận worker nhắc hạn"
    : "Chưa xác định trạng thái nhắc hạn";

  return <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-mod-text-secondary" aria-label="Đồng bộ lịch phát hành">
    <div className="flex flex-wrap items-center gap-2">
      <CardBadge type="status" tone={running ? "success" : worker ? "warning" : "neutral"}>{label}</CardBadge>
      <span>Admin chủ động phát hành bằng nút “Phát hành ngay”.</span>
    </div>
    <span role="status">{syncError ? "Mất kết nối đồng bộ · đang thử lại"
      : updatedAt ? `Đồng bộ mỗi 2 giây · cập nhật ${new Date(updatedAt).toLocaleTimeString("vi-VN")}`
      : "Đang đồng bộ lịch…"}</span>
  </div>;
}
