import { CheckCircle, Clock, WarningCircle } from "@phosphor-icons/react";

export interface ReleaseProgressItem {
  id: string;
  action: string;
  actorType: string;
  actorId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: Date;
}

const copy: Record<string, { title: string; description: string }> = {
  "release_schedule.created": {
    title: "Đã tạo lịch phát hành",
    description: "Admin đã lập lịch và giao nhiệm vụ sản xuất.",
  },
  "release_schedule.updated": {
    title: "Đã cập nhật lịch",
    description: "Thông tin kế hoạch đã được điều chỉnh.",
  },
  "release_schedule.rescheduled": {
    title: "Đã đổi thời gian phát hành",
    description: "Hệ thống đã vô hiệu hóa lịch chạy cũ.",
  },
  "release_schedule.assignees_changed": {
    title: "Đã cập nhật người phụ trách",
    description: "Danh sách Moderator sản xuất đã thay đổi.",
  },
  "release_schedule.episode_linked": {
    title: "Đã gắn podcast vào lịch",
    description: "Moderator đã chọn podcast nháp để thực hiện nhiệm vụ.",
  },
  "release.reminder_sent": {
    title: "Đã gửi nhắc việc",
    description: "Hệ thống đã nhắc Moderator trước hạn sản xuất 24 giờ.",
  },
  "episode.review_submitted": {
    title: "Podcast đã được gửi duyệt",
    description: "Phiên bản nội dung hiện tại đang chờ kiểm duyệt.",
  },
  "episode.changes_requested": {
    title: "Cần chỉnh sửa nội dung",
    description: "Reviewer đã gửi yêu cầu chỉnh sửa.",
  },
  "episode.approved": {
    title: "Nội dung đã được duyệt",
    description: "Phiên bản này đủ điều kiện kiểm tra phát hành.",
  },
  "release.auto_ready": {
    title: "Sẵn sàng phát hành",
    description: "Nội dung đã duyệt và vượt qua checklist.",
  },
  "release.started": {
    title: "Bắt đầu phát hành",
    description: "Worker đã nhận lịch và đang xử lý.",
  },
  "release.published": {
    title: "Hệ thống đã phát hành podcast",
    description: "Podcast đã xuất hiện trên thư viện công khai.",
  },
  "release.blocked": {
    title: "Phát hành đang bị chặn",
    description: "Admin cần kiểm tra điều kiện nội dung trước khi xử lý tiếp.",
  },
  "release.failed": {
    title: "Phát hành chưa thành công",
    description: "Lỗi kỹ thuật đã được ghi nhận để xử lý.",
  },
  "release.retry_scheduled": {
    title: "Đã lên lịch thử lại",
    description: "Hệ thống sẽ thực hiện lại theo chính sách retry.",
  },
  "release.cancelled": {
    title: "Đã hủy lịch phát hành",
    description: "Các job cũ sẽ không còn được phép phát hành.",
  },
  "release.stale_job_ignored": {
    title: "Đã bỏ qua lịch chạy cũ",
    description: "Job thuộc phiên bản lịch trước đã được kết thúc an toàn.",
  },
};

export function ReleaseProgressTimeline({ events }: { events: ReleaseProgressItem[] }) {
  if (!events.length)
    return <p className="rounded-[12px] bg-mod-canvas p-5 text-sm text-mod-text-secondary">Chưa có mốc tiến độ.</p>;
  return (
    <ol className="relative flex flex-col gap-1" aria-label="Tiến độ phát hành">
      {events.map((event, index) => {
        const item = copy[event.action] ?? {
          title: "Đã cập nhật tiến độ",
          description: "Hệ thống đã ghi nhận một thay đổi nghiệp vụ.",
        };
        const problem = ["release.blocked", "release.failed"].includes(event.action);
        const finished = event.action === "release.published";
        const Icon = problem ? WarningCircle : finished ? CheckCircle : Clock;
        return (
          <li key={event.id} className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
            <div className="relative flex justify-center">
              {index < events.length - 1 ? <span className="absolute bottom-[-4px] top-7 w-px bg-mod-border" /> : null}
              <span className={`relative grid size-7 place-items-center rounded-full border bg-mod-surface ${problem ? "border-vermilion/30 text-vermilion" : "border-mod-border text-mod-primary"}`}>
                <Icon size={15} aria-hidden="true" />
              </span>
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-mod-text">{item.title}</p>
                <time className="text-[11px] tabular-nums text-mod-text-low">
                  {new Intl.DateTimeFormat("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Ho_Chi_Minh",
                  }).format(event.createdAt)}
                </time>
              </div>
              <p className="mt-1 text-xs leading-5 text-mod-text-secondary">{item.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
