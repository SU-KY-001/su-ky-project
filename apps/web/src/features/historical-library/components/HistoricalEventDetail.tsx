import type { ReactElement } from "react";
import { useHistoricalEvent } from "../hooks/useHistoricalCatalog";
export function HistoricalEventDetail({ id, showContent = true }: { id: string; showContent?: boolean }): ReactElement {
  const q = useHistoricalEvent(id);
  if (q.isPending) return <p>Đang tải sự kiện…</p>;
  if (q.error) return <p role="alert">{q.error.message}</p>;
  const event = q.data;
  return <section aria-label="Nội dung lịch sử đang chọn" className="space-y-5">
    {showContent ? <>
      <h2 className="break-words text-lg font-semibold">{event.name}</h2>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-mod-text-secondary">Thời kỳ</dt><dd>{event.historicalPhase?.period?.name ?? "—"}</dd></div>
        <div><dt className="text-mod-text-secondary">Giai đoạn</dt><dd>{event.historicalPhase?.name ?? "—"}</dd></div>
        <div><dt className="text-mod-text-secondary">Mốc thời gian</dt><dd>{event.timeLabel}</dd></div>
        <div><dt className="text-mod-text-secondary">Podcast</dt><dd>{event.podcastCount}</dd></div>
      </dl>
      <div><h3 className="mb-1 text-sm font-semibold">Mô tả</h3><p className="whitespace-pre-wrap break-words text-sm">{event.summary || "Chưa có mô tả."}</p></div>
    </> : null}
    {event.warnings.map(warning => <p key={warning} className="text-sm text-mod-attention">{warning === "TIME_OUTSIDE_PARENT" ? "Mốc thời gian nằm ngoài khoảng của nhánh cha." : warning}</p>)}
  </section>;
}
