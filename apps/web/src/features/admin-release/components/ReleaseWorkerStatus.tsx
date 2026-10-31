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
  const label = running ? "Worker đang hoạt động"
    : worker === "stale" ? "Worker mất nhịp"
    : worker === "stopped" ? "Chưa ghi nhận worker"
    : "Chưa xác định trạng thái worker";

  return <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-mod-text-secondary" aria-label="Đồng bộ lịch phát hành">
    <div className="flex flex-wrap items-center gap-2">
      <CardBadge type="status" tone={running ? "success" : worker ? "warning" : "neutral"}>{label}</CardBadge>
      <span>{running ? "Tự động xử lý lịch đủ điều kiện khi đến giờ phát hành." : "Chưa thể xác nhận tự động phát hành đang hoạt động."}</span>
    </div>
    <span role="status">{syncError ? "Mất kết nối đồng bộ · đang thử lại"
      : updatedAt ? `Đồng bộ mỗi 2 giây · cập nhật ${new Date(updatedAt).toLocaleTimeString("vi-VN")}`
      : "Đang đồng bộ lịch…"}</span>
  </div>;
}
