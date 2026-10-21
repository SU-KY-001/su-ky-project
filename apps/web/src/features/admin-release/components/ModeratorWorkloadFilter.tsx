import type { ReleaseModeratorWorkload } from "@repo/shared";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";

export function ModeratorWorkloadFilter({
  items,
  selectedId,
  onChange,
}: {
  items: ReleaseModeratorWorkload[];
  selectedId: string;
  onChange: (moderatorId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="workload-title" className="rounded-2xl border border-mod-border bg-mod-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="workload-title" className="text-sm font-bold text-mod-text">Khối lượng Moderator</h2>
        {selectedId ? <button type="button" onClick={() => onChange("")} className="text-xs font-semibold text-mod-primary hover:underline">Xóa bộ lọc</button> : null}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <button
            key={item.moderatorId}
            type="button"
            aria-pressed={selectedId === item.moderatorId}
            onClick={() => onChange(selectedId === item.moderatorId ? "" : item.moderatorId)}
            className={`min-w-48 rounded-xl border p-3 text-left transition ${selectedId === item.moderatorId ? "border-mod-primary bg-mod-primary/5" : "border-mod-border hover:border-mod-primary/25"}`}
          >
            <CardBadge type="name">{item.name}</CardBadge>
            <div className="mt-2 flex gap-3 text-xs text-mod-text-secondary">
              <span><strong className="text-mod-text">{item.open}</strong> lịch đang mở</span>
              <span><strong className="text-mod-attention">{item.nearDeadline}</strong> gần hạn</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
