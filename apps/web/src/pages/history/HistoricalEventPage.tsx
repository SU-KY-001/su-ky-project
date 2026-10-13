import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { historicalCatalogService } from "@/features/historical-library/services/historicalCatalogService";
import { PublicHistoricalSources } from "@/features/historical-library/components/PublicHistoricalSources";
export function HistoricalEventPage() {
  const { slug = "" } = useParams();
  const q = useQuery({
    queryKey: ["public-history", slug],
    queryFn: () => historicalCatalogService.publicEvent(slug),
  });
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-5 py-10 font-sans">
      {q.isPending ? (
        <p>Đang tải sự kiện…</p>
      ) : q.error ? (
        <p role="alert">
          Không tìm thấy sự kiện đã duyệt hoặc sự kiện chưa sẵn sàng công khai.
        </p>
      ) : (
        <>
          <header>
            <p className="text-sm text-muted-foreground">
              {q.data.parent.period.name} / {q.data.parent.phase.name}
            </p>
            <h1 className="mt-3 text-3xl font-bold">{q.data.name}</h1>
            <p className="mt-2">{q.data.timeLabel}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Nội dung được duyệt ngày{" "}
              {q.data.reviewedAt.toLocaleDateString("vi-VN")}
            </p>
          </header>
          <p className="whitespace-pre-wrap leading-relaxed">
            {q.data.summary}
          </p>
          <PublicHistoricalSources citations={q.data.citations} />
        </>
      )}
    </main>
  );
}
