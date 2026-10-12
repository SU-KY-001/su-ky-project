import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { publishedEpisodeRows } from "@/features/podcast-production/mockData";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { Input } from "@/shared/components/ui/input";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function PodcastProductionPage() {
  const [query, setQuery] = useState("");
  const filteredEpisodes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
    if (!normalizedQuery) return publishedEpisodeRows;
    return publishedEpisodeRows.filter((row) =>
      `${row.series} ${row.episode} ${row.episodeNumber}`.toLocaleLowerCase("vi-VN").includes(normalizedQuery),
    );
  }, [query]);

  return (
    <section className="flex w-full flex-col gap-5" aria-labelledby="podcast-page-title">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-mod-border pb-4">
        <div>
          <ModeratorText as="h1" id="podcast-page-title" className="text-2xl font-bold tracking-tight text-mod-text">
            Sản xuất podcast
          </ModeratorText>
          <ModeratorText as="p" className="mt-1 text-sm text-mod-text-secondary">
            Danh sách series và episode đã phát hành.
          </ModeratorText>
        </div>
        <label className="relative w-full sm:w-[300px]">
          <span className="sr-only">Tìm series hoặc episode</span>
          <MagnifyingGlass size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mod-text-low" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm series hoặc episode"
            className="h-10 border-mod-border bg-white pl-9 text-sm shadow-none"
          />
        </label>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <caption className="sr-only">Các episode podcast đã phát hành</caption>
          <thead>
            <tr className="border-b border-mod-border text-xs font-semibold uppercase tracking-wide text-mod-text-secondary">
              <th scope="col" className="px-3 py-3">Series</th>
              <th scope="col" className="px-3 py-3">Episode</th>
              <th scope="col" className="px-3 py-3">Ngày phát hành</th>
              <th scope="col" className="px-3 py-3">Thời lượng</th>
              <th scope="col" className="px-3 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mod-border">
            {filteredEpisodes.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-mod-canvas-accent/70">
                <th scope="row" className="px-3 py-4 text-sm font-semibold text-mod-text">{row.series}</th>
                <td className="px-3 py-4 text-mod-text-secondary">
                  <span className="mr-2 text-xs font-semibold tabular-nums text-mod-text-low">Tập {String(row.episodeNumber).padStart(2, "0")}</span>
                  {row.episode}
                </td>
                <td className="whitespace-nowrap px-3 py-4 tabular-nums text-mod-text-secondary">
                  {dateFormatter.format(new Date(`${row.publishedAt}T12:00:00`))}
                </td>
                <td className="whitespace-nowrap px-3 py-4 tabular-nums text-mod-text-secondary">{row.duration}</td>
                <td className="px-3 py-4">
                  <span className="inline-flex rounded-full border border-mod-success/15 bg-mod-success/5 px-2.5 py-1 text-xs font-semibold text-mod-success">
                    Đã phát hành
                  </span>
                </td>
              </tr>
            ))}
            {filteredEpisodes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-sm text-mod-text-secondary">
                  Không tìm thấy series hoặc episode phù hợp.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <ModeratorText as="p" aria-live="polite" className="text-xs text-mod-text-secondary">
        Hiển thị {filteredEpisodes.length} / {publishedEpisodeRows.length} episode đã phát hành
      </ModeratorText>
    </section>
  );
}
