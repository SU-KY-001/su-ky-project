import { useState, type ReactElement } from "react";
import { Clock } from "@phosphor-icons/react/dist/icons/Clock";
import { Play } from "@phosphor-icons/react/dist/icons/Play";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { libraryService } from "../../services/libraryService";
import { LibraryPages, LibraryState } from "./LibraryPrimitives";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export function ListeningHistoryPanel({ onResume }: { onResume: (seriesSlug: string, episodeId: string) => void }): ReactElement {
  const [page, setPage] = useState(1);
  const session = useCurrentUser();
  const [status, setStatus] = useState<"all" | "in_progress" | "completed">("all");
  const query = useQuery({
    queryKey: ["listening-history", session.data?.id, page, status],
    queryFn: ({ signal }) => libraryService.history({ page, limit: 10, status }, signal),
    staleTime: 15_000,
    enabled: Boolean(session.data),
  });

  const emptyState = {
    all: { title: "Bạn chưa có lịch sử nghe", description: "Bắt đầu nghe một tập podcast để lưu lại tiến trình của bạn." },
    in_progress: { title: "Bạn chưa có podcast đang nghe dở", description: "Các tập podcast chưa hoàn thành sẽ xuất hiện tại đây." },
    completed: { title: "Bạn chưa hoàn thành podcast nào", description: "Các tập podcast đã hoàn thành sẽ xuất hiện tại đây." },
  }[status];

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc lịch sử nghe">
      {([["all", "Tất cả"], ["in_progress", "Đang nghe"], ["completed", "Đã hoàn thành"]] as const).map(([value, label]) => <Button key={value} size="sm" variant={status === value ? "default" : "outline"} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}>{label}</Button>)}
    </div>
    {query.isPending ? <LibraryState loading /> : query.isError ? <LibraryState error title="Chưa tải được lịch sử nghe" description="Vui lòng thử lại sau." retry={() => { void query.refetch(); }} /> : query.data.items.length === 0 ? <LibraryState {...emptyState} /> : <>
    <div className="grid gap-3 md:grid-cols-2">
      {query.data.items.map((item) => {
        const percent = Math.round(Math.min(100, Math.max(0, item.percent)));
        return <article key={item.episode.id} className="rounded-xl border border-line/80 bg-paper/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-bronze-dark">{item.episode.series.title}</p>
              <h3 className="mt-1 line-clamp-2 font-medium leading-6">{item.episode.title}</h3>
            </div>
            {item.isCompleted ? <CheckCircle className="mt-1 shrink-0 text-history-success" aria-label="Đã hoàn thành" /> : <Clock className="mt-1 shrink-0 text-bronze-dark" aria-label="Đang nghe" />}
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-deep" aria-label={`Đã nghe ${percent}%`}><div className="h-full rounded-full bg-vermilion" style={{ width: `${percent}%` }} /></div>
            <span className="w-10 text-right">{percent}%</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Nghe gần nhất: {formatDate(item.lastListenedAt)}</p>
          <Button className={cn("mt-4 w-full", !item.episode.available && "cursor-not-allowed")} size="sm" variant="outline" disabled={!item.episode.available} onClick={() => onResume(item.episode.series.slug, item.episode.id)}>
            <Play weight="fill" aria-hidden="true" /> {item.episode.available ? "Tiếp tục nghe" : "Nội dung không còn khả dụng"}
          </Button>
        </article>;
      })}
    </div>
    <LibraryPages page={query.data.page} limit={query.data.limit} total={query.data.total} onChange={setPage} />
    </>}
  </div>;
}
