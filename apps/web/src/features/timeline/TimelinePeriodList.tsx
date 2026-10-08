import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { client } from "../../shared/api/client";
import { readJson } from "../../shared/api/http";

interface TimelinePeriodListProps {
  title: string;
  description: string;
}

export function TimelinePeriodList({ title, description }: TimelinePeriodListProps) {
  const periodsQuery = useQuery({
    queryKey: ["timeline"],
    queryFn: async () => readJson(await client.api.timeline.$get()),
  });

  const periods = periodsQuery.data?.items ?? [];

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-[#0F1420] p-6">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-white">
          <Radio className="size-4 text-amber-500" aria-hidden="true" />{title}
        </h2>
        <p className="text-xs text-slate-400">{description}</p>
      </div>

      {periodsQuery.isPending ? (
        <p className="animate-pulse py-8 text-center text-sm font-mono text-slate-500" aria-live="polite">Đang tải danh sách triều đại từ backend...</p>
      ) : periodsQuery.isError ? (
        <p role="status" className="rounded-lg border border-rose-900/50 bg-rose-950/20 p-5 text-sm text-rose-300">Không thể tải dòng thời gian lúc này. Vui lòng thử lại sau.</p>
      ) : periods.length ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {periods.map((period) => (
            <li key={period.id} className="space-y-2 rounded-lg border border-slate-800 bg-[#131B2A]/60 p-4 transition-colors hover:border-amber-500/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-200">{period.name}</span>
                <span className="whitespace-nowrap rounded bg-amber-400/10 px-2 py-0.5 text-xs font-mono text-amber-400/80">{period.startYear} – {period.endYear ?? "nay"}</span>
              </div>
              <p className="line-clamp-2 text-xs text-slate-400">{period.description || "Chưa có mô tả chi tiết."}</p>
              <p className="pt-1 text-[11px] font-mono text-slate-500">{period.episodesCount ?? 0} tập podcast</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs leading-6 text-slate-400">
          Backend đã sẵn sàng nhận kết nối. Khi khởi động PostgreSQL và chạy seed (<code>bun run db:seed</code>), dữ liệu triều đại sẽ tự động hiển thị tại đây.
        </p>
      )}
    </section>
  );
}
