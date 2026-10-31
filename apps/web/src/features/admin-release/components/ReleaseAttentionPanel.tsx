import type { ReleaseScheduleRecord } from "@repo/shared";
import { ArrowClockwise } from "@phosphor-icons/react/dist/icons/ArrowClockwise";
import { PencilSimple } from "@phosphor-icons/react/dist/icons/PencilSimple";
import { ShieldCheck } from "@phosphor-icons/react/dist/icons/ShieldCheck";
import { Warning } from "@phosphor-icons/react/dist/icons/Warning";
import { X } from "@phosphor-icons/react/dist/icons/X";
import { Button } from "@/shared/components/ui/button";
import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";

export function ReleaseAttentionPanel({
  items,
  pendingIds,
  onEdit,
  onCheckReadiness,
  onPublishNow,
  onRetry,
  onCancel,
}: {
  items: ReleaseScheduleRecord[];
  pendingIds: ReadonlySet<string>;
  onEdit: (schedule: ReleaseScheduleRecord) => void;
  onCheckReadiness: (schedule: ReleaseScheduleRecord) => void;
  onPublishNow: (schedule: ReleaseScheduleRecord) => void;
  onRetry: (schedule: ReleaseScheduleRecord) => void;
  onCancel: (schedule: ReleaseScheduleRecord) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="release-attention-title" className="rounded-2xl border border-mod-attention/25 bg-mod-attention/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Warning size={18} weight="fill" className="text-mod-attention" />
        <h2 id="release-attention-title" className="font-bold text-mod-text">Cần xử lý</h2>
        <span className="text-xs font-semibold text-mod-text-muted">{items.length} lịch</span>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {items.map((schedule) => {
          const pending = pendingIds.has(schedule.id);
          return (
            <article key={schedule.id} className="rounded-xl border border-mod-border bg-mod-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-mod-text">{schedule.title}</h3>
                  {schedule.failureMessage ? <p className="mt-1 text-xs text-mod-text-secondary">{schedule.failureMessage}</p> : null}
                </div>
                <CardBadge type="status" tone={cardBadgeToneForStatus(schedule.status)}>{schedule.status === "BLOCKED" ? "Bị chặn" : "Thất bại"}</CardBadge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="xs" variant="outline" disabled={pending} onClick={() => onEdit(schedule)}><PencilSimple /> Chỉnh sửa</Button>
                {schedule.status === "BLOCKED" ? <Button size="xs" variant="outline" disabled={pending} onClick={() => onCheckReadiness(schedule)}><ShieldCheck /> Đánh giá lại</Button> : null}
                {schedule.status === "FAILED" ? <Button size="xs" variant="outline" disabled={pending} onClick={() => onRetry(schedule)}><ArrowClockwise /> Thử lại</Button> : null}
                <Button size="xs" disabled={pending} className="bg-mod-primary text-white" onClick={() => onPublishNow(schedule)}>Phát hành ngay</Button>
                <Button size="xs" variant="ghost" disabled={pending} className="text-vermilion" onClick={() => onCancel(schedule)}><X /> Hủy lịch</Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
