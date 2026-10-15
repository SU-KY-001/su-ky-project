import { CalendarBlank } from "@phosphor-icons/react";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";

const statusCopy: Record<string, string> = {
  SCHEDULED: "Đang sản xuất",
  READY_TO_PUBLISH: "Sẵn sàng",
  PUBLISHING: "Đang phát hành",
  RELEASED: "Đã phát hành",
  BLOCKED: "Cần xử lý",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
};

export function ReleaseCalendar({
  schedules,
  onSelect,
}: {
  schedules: ReleaseScheduleRecord[];
  onSelect: (id: string) => void;
}) {
  if (!schedules.length)
    return (
      <div className="grid min-h-64 place-items-center rounded-[16px] border border-mod-border bg-mod-surface p-8 text-center">
        <div>
          <CalendarBlank size={34} className="mx-auto text-mod-text-low" />
          <p className="mt-3 text-sm font-bold text-mod-text">Chưa có lịch trong khoảng này</p>
          <p className="mt-1 text-xs text-mod-text-secondary">Điều chỉnh bộ lọc hoặc tạo lịch mới.</p>
        </div>
      </div>
    );
  const groups = new Map<string, ReleaseScheduleRecord[]>();
  for (const schedule of schedules) {
    const key = new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(schedule.scheduledAt);
    groups.set(key, [...(groups.get(key) ?? []), schedule]);
  }
  return (
    <div className="flex flex-col gap-4">
      {[...groups.entries()].map(([day, items]) => (
        <section key={day} className="grid gap-3 md:grid-cols-[190px_minmax(0,1fr)]">
          <h2 className="pt-3 text-sm font-bold capitalize text-mod-text">{day}</h2>
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="grid min-h-20 w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 rounded-[14px] border border-mod-border bg-mod-surface px-4 py-3 text-left transition-colors hover:bg-mod-canvas-accent active:translate-y-px"
              >
                <time className="text-base font-extrabold tabular-nums text-mod-primary">
                  {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(item.scheduledAt)}
                </time>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-mod-text">{item.title}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {item.assignments.length ? item.assignments.map((entry) => (
                      <CardBadge key={entry.moderatorId} type="name">{entry.moderator.name}</CardBadge>
                    )) : <CardBadge type="name">Chưa phân công</CardBadge>}
                  </span>
                </span>
                <CardBadge type="status" tone={cardBadgeToneForStatus(item.status)}>{statusCopy[item.status] ?? item.status}</CardBadge>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
