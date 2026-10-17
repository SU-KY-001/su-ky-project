import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { useHistoricalEvent } from "../hooks/useHistoricalCatalog";
import { historicalCatalogService as api } from "../services/historicalCatalogService";
import { HistoricalSourceFields } from "./HistoricalSourceFields";
import { HistoricalReviewPanel } from "./HistoricalReviewPanel";
export function HistoricalEventDetail({ id, showContent = true }: { id: string; showContent?: boolean }) {
  const q = useHistoricalEvent(id);
  const [history, setHistory] = useState(false);
  const revisions = useQuery({
    queryKey: ["historical-catalog", "revisions", id],
    queryFn: () => api.revisions(id),
    enabled: history,
  });
  if (q.isPending) return <p>Đang tải sự kiện…</p>;
  if (q.error) return <p role="alert">{q.error.message}</p>;
  const event = q.data;
  return (
    <section aria-label="Nội dung lịch sử đang chọn" className="space-y-5">
      {showContent ? <><header>
        <h2 className="text-lg font-semibold">{event.name}</h2>
        <p className="text-sm text-mod-text-secondary">{event.timeLabel}</p>
      </header>
      <p className="whitespace-pre-wrap text-sm">
        {event.summary || "Chưa có mô tả."}
      </p>
      </> : null}
      {event.warnings.map((w) => (
        <p key={w} className="text-sm text-mod-warning">
          {w === "TIME_OUTSIDE_PARENT"
            ? "Mốc thời gian nằm ngoài khoảng của nhánh cha."
            : w}
        </p>
      ))}
      <HistoricalSourceFields kind="entity" id={id} />
      <HistoricalReviewPanel entity={event} />
      {event.readiness.ready ? (
        <Link
          className="text-sm underline"
          to={`/history/events/${event.slug}`}
        >
          Xem trang công khai
        </Link>
      ) : null}
      <div>
        <Button variant="ghost" onClick={() => setHistory(!history)}>
          Lịch sử phiên bản
        </Button>
        {history ? (
          <div className="mt-2 space-y-2">
            {revisions.isPending ? (
              <p>Đang tải phiên bản…</p>
            ) : revisions.error ? (
              <p role="alert">{revisions.error.message}</p>
            ) : (
              revisions.data?.items.map((r) => (
                <details key={r.id}>
                  <summary>
                    Phiên bản {r.version} ·{" "}
                    {r.createdAt.toLocaleString("vi-VN")}
                  </summary>
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">
                    {JSON.stringify(r.snapshot, null, 2)}
                  </pre>
                </details>
              ))
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
