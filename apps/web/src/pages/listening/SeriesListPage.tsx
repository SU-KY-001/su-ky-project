/**
 * Trang danh sách Series — /series
 * - Era chip rail (lọc theo thời kỳ)
 * - Lưới series card với cover, tiêu đề, số tập
 * - Skeleton loading state
 */
import { useInfiniteQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { Link } from "react-router";
import { BookOpen, Play, CaretRight, MagnifyingGlass, X, CalendarBlank } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { listeningService } from "@/features/listening/services/listeningService";
import { MainHeader } from "@/shared/components/common/MainHeader";

/* ---------- Era chips data ---------- */
const ERA_CHIPS = [
  { label: "Tất cả", id: "all", fromYear: undefined, toYear: undefined },
  { label: "Hồng Bàng & Âu Lạc", id: "hong-bang-au-lac", fromYear: -2879, toYear: -179 },
  { label: "Bắc thuộc & Khởi nghĩa", id: "bac-thuoc", fromYear: -179, toYear: 938 },
  { label: "Ngô - Đinh - Tiền Lê", id: "ngo-dinh-tien-le", fromYear: 939, toYear: 1009 },
  { label: "Thời Lý", id: "ly", fromYear: 1009, toYear: 1225 },
  { label: "Thời Trần", id: "tran", fromYear: 1225, toYear: 1400 },
  { label: "Hậu Lê & Tây Sơn", id: "hau-le-tay-son", fromYear: 1428, toYear: 1802 },
  { label: "Thời Nguyễn", id: "nguyen", fromYear: 1802, toYear: 1945 },
] as const;

/* ---------- Skeleton ---------- */
function SeriesCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-paper-soft p-0 overflow-hidden animate-pulse">
      <div className="aspect-[16/9] w-full bg-paper-deep" />
      <div className="flex flex-col gap-2 p-4 pt-0">
        <div className="h-4 w-3/4 rounded bg-paper-deep" />
        <div className="h-3 w-1/2 rounded bg-paper-deep" />
        <div className="mt-2 h-3 w-1/3 rounded bg-paper-deep" />
      </div>
    </div>
  );
}

/* ---------- Series Card ---------- */
function SeriesCard({ series }: { series: Awaited<ReturnType<typeof listeningService.listSeries>>["items"][number] }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-paper-soft transition-[border-color,box-shadow] duration-250 hover:border-bronze hover:shadow-[0_4px_24px_rgba(181,138,60,.15)] focus-within:border-bronze">
      {/* Cover */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-night">
        {series.coverLandscape?.url ?? series.cover?.url ? (
          <img
            src={series.coverLandscape?.url ?? series.cover?.url ?? ""}
            alt={series.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <BookOpen size={40} className="text-bronze/40" />
          </div>
        )}
        {/* Overlay */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/20 to-transparent" />
        {/* Year badge */}
        <span className="absolute bottom-3 left-3 font-mono text-xs font-bold text-bronze">
          {series.startYear > 0 ? series.startYear : `${Math.abs(series.startYear)} TCN`}
          {series.endYear ? ` – ${series.endYear > 0 ? series.endYear : `${Math.abs(series.endYear)} TCN`}` : ""}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 font-serif text-lg font-bold text-ink leading-snug">
          <Link
            to={`/series/${series.slug}`}
            className="focus-visible:outline-2 focus-visible:outline-focus after:absolute after:inset-0"
          >
            {series.title}
          </Link>
        </h2>
        <p className="line-clamp-2 text-sm text-ink-soft leading-relaxed">
          {series.description}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            <Play size={13} weight="fill" className="text-bronze" aria-hidden />
            {series.episodeCount} tập
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-vermilion group-hover:gap-2 transition-[gap] duration-200">
            Nghe ngay <CaretRight size={13} weight="bold" aria-hidden />
          </span>
        </div>
      </div>
    </article>
  );
}

/* ---------- Page ---------- */
export function SeriesListPage() {
  const [eraId, setEraId] = useState("all");
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const selectedEra = ERA_CHIPS.find((chip) => chip.id === eraId) ?? ERA_CHIPS[0];
  const parsedYear = /^-?\d+$/.test(year) && Number(year) !== 0 ? Number(year) : null;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, error } =
    useInfiniteQuery({
      queryKey: ["series-list", eraId, deferredSearch, parsedYear],
      queryFn: ({ pageParam = 1 }) => listeningService.listSeries(pageParam as number, 12, {
        ...(deferredSearch ? { q: deferredSearch } : {}),
        ...(parsedYear !== null
          ? { fromYear: parsedYear, toYear: parsedYear }
          : {
              ...(selectedEra.fromYear !== undefined ? { fromYear: selectedEra.fromYear } : {}),
              ...(selectedEra.toYear !== undefined ? { toYear: selectedEra.toYear } : {}),
            }),
      }),
      getNextPageParam: (last) =>
        last.page * last.limit < last.total ? last.page + 1 : undefined,
      initialPageParam: 1,
      staleTime: 60_000,
    });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="min-h-screen bg-paper">
      <MainHeader />
      {/* Hero banner */}
      <div className="relative overflow-hidden bg-night py-16 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(181,138,60,.18),transparent)]" />
        <div className="relative mx-auto max-w-2xl px-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-bronze">Podcast Lịch Sử Việt Nam</p>
          <h1 className="font-serif text-4xl font-bold text-paper-soft md:text-5xl">
            Thư Viện Sử Ký
          </h1>
          <p className="mt-4 text-base leading-relaxed text-paper-deep/80">
            Hàng nghìn năm dựng nước và giữ nước qua từng tập kể chuyện được thẩm định học thuật.
          </p>
        </div>
      </div>

      <div className="border-b border-line bg-paper-soft">
        <div className="mx-auto grid max-w-3xl gap-3 px-5 py-4 sm:grid-cols-[1fr_12rem]">
          <label htmlFor="series-search" className="sr-only">Tìm kiếm series</label>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-4 focus-within:border-bronze">
            <MagnifyingGlass size={19} className="shrink-0 text-bronze" aria-hidden />
            <input
              id="series-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên series, sự kiện, nhân vật hoặc giai đoạn"
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft/70"
            />
            {search ? (
              <button type="button" onClick={() => setSearch("")} className="rounded-md p-1 text-ink-soft hover:bg-paper-deep hover:text-ink" aria-label="Xóa nội dung tìm kiếm">
                <X size={16} aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-4 focus-within:border-bronze">
            <CalendarBlank size={19} className="shrink-0 text-bronze" aria-hidden />
            <label htmlFor="series-year" className="sr-only">Chọn năm lịch sử</label>
            <input
              id="series-year"
              type="number"
              value={year}
              onChange={(event) => {
                setYear(event.target.value);
                if (event.target.value) setEraId("all");
              }}
              placeholder="Năm, ví dụ 1945"
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft/70"
            />
            {year ? (
              <button type="button" onClick={() => setYear("")} className="rounded-md p-1 text-ink-soft hover:bg-paper-deep hover:text-ink" aria-label="Xóa năm đã chọn">
                <X size={16} aria-hidden />
              </button>
            ) : null}
          </div>
          {year === "0" ? <p className="text-xs text-vermilion sm:col-start-2">Lịch sử không có năm 0.</p> : null}
        </div>
      </div>

      {/* Era chip rail */}
      <div
        className="sticky top-16 z-30 overflow-x-auto border-b border-line bg-paper-soft/90 backdrop-blur-md"
        aria-label="Lọc theo thời kỳ lịch sử"
      >
        <div className="flex min-w-max gap-2 px-5 py-3">
          {ERA_CHIPS.map((chip) => {
            const active = eraId === chip.id;
            return (
              <button
                key={chip.id ?? "all"}
                type="button"
                onClick={() => {
                  setEraId(chip.id);
                  setYear("");
                }}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-[background-color,border-color,color] duration-200",
                  active
                    ? "border-vermilion bg-vermilion text-paper-soft"
                    : "border-line bg-paper text-ink-soft hover:border-bronze hover:text-ink",
                )}
                aria-pressed={active}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-5 py-10">
        {status === "pending" ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SeriesCardSkeleton key={i} />
            ))}
          </div>
        ) : status === "error" ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-line p-8 text-center">
            <h2 className="text-xl font-bold text-ink">Không thể tải danh sách series</h2>
            <p className="text-sm text-ink-soft">
              {error instanceof Error ? error.message : "Lỗi không xác định"}
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-line p-8 text-center">
            <BookOpen size={40} className="text-bronze/50" />
            <h2 className="text-xl font-bold text-ink">Không tìm thấy series phù hợp</h2>
            <p className="text-sm text-ink-soft">
              {deferredSearch || eraId !== "all" || parsedYear !== null ? "Thử từ khóa, năm khác hoặc chọn tất cả thời kỳ." : "Nội dung đang được biên soạn, hãy quay lại sớm."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((series) => (
                <SeriesCard key={series.id} series={series} />
              ))}
            </div>

            {hasNextPage ? (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-lg border border-bronze px-6 py-2.5 text-sm font-semibold text-bronze hover:bg-bronze/10 focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                  {isFetchingNextPage ? "Đang tải…" : "Xem thêm"}
                </button>
              </div>
            ) : null}

            <p className="mt-6 text-center text-xs text-ink-soft">
              {items.length} / {data?.pages[0]?.total ?? "?"} series
            </p>
          </>
        )}
      </main>
    </div>
  );
}
