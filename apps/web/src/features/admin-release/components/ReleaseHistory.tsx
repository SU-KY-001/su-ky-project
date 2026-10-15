import type { ReleaseScheduleRecord } from "@repo/shared";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";

export function ReleaseHistory({ schedules }: { schedules: ReleaseScheduleRecord[] }) {
  const history = schedules.filter((item) => ["RELEASED", "CANCELLED"].includes(item.status));
  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-mod-border pb-5">
        <p className="text-xs font-bold text-mod-primary">VẬN HÀNH NỘI DUNG</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-mod-text max-[620px]:text-2xl">Lịch sử phát hành</h1>
        <p className="mt-2 text-sm text-mod-text-secondary">Tra cứu các lịch đã phát hành hoặc đã hủy.</p>
      </header>
      <div className="rounded-[16px] border border-mod-border bg-mod-surface">
        {history.length ? history.map((item) => (
          <article key={item.id} className="grid gap-3 border-b border-mod-border p-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_190px_150px] sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              {item.status === "RELEASED" ? <CheckCircle size={20} className="shrink-0 text-mod-primary" /> : <XCircle size={20} className="shrink-0 text-mod-text-low" />}
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-mod-text">{item.title}</h2>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {item.assignments.length ? item.assignments.map((entry) => (
                    <CardBadge key={entry.moderatorId} type="name">{entry.moderator.name}</CardBadge>
                  )) : <CardBadge type="name">Chưa phân công</CardBadge>}
                </div>
              </div>
            </div>
            <time className="text-xs tabular-nums text-mod-text-secondary">
              {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(item.publishedAt ?? item.cancelledAt ?? item.updatedAt)}
            </time>
            <CardBadge type="status" tone={cardBadgeToneForStatus(item.status)}>{item.status === "RELEASED" ? "Đã phát hành" : "Đã hủy"}</CardBadge>
          </article>
        )) : (
          <p className="p-8 text-center text-sm text-mod-text-secondary">Chưa có lịch sử phát hành.</p>
        )}
      </div>
    </div>
  );
}
