/**
 * Trang lịch sử nghe — /me/listening-history
 * - Danh sách episodes đã nghe, sắp xếp theo lastListenedAt
 * - Lọc: Tất cả / Đang nghe / Đã xong
 * - Resume play button
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Play,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { listeningService } from "@/features/listening/services/listeningService";
import { useAudioPlayer } from "@/features/listening/context/AudioPlayerContext";
import { MainHeader } from "@/shared/components/common/MainHeader";
import type { HistoryItem } from "@/features/listening/services/listeningService";

type FilterStatus = "all" | "in_progress" | "completed";

const FILTER_TABS: { label: string; value: FilterStatus }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Đang nghe", value: "in_progress" },
  { label: "Đã hoàn thành", value: "completed" },
];

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function HistoryCard({ item }: { item: HistoryItem }) {
  const player = useAudioPlayer();

  const handleResume = () => {
    void player.loadNarration(item.lastNarrationId, {
      episodeSlug: item.episode.slug,
      episodeTitle: item.episode.title,
      seriesTitle: item.episode.series.title,
      coverUrl: null,
    });
  };

  return (
    <article className={cn(
      "flex items-center gap-4 rounded-xl border px-4 py-4 transition-[border-color] duration-200",
      item.episode.available
        ? "border-line bg-paper-soft hover:border-bronze/40"
        : "border-line bg-paper-soft opacity-60",
    )}>
      {/* Percent ring placeholder */}
      <div
        className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-line"
        title={`${Math.round(item.percent)}% đã nghe`}
        aria-label={`${Math.round(item.percent)}% đã nghe`}
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden>
          <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" strokeWidth="3" className="text-paper-deep" />
          <circle
            cx="22" cy="22" r="19" fill="none"
            stroke="currentColor" strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 19}`}
            strokeDashoffset={`${2 * Math.PI * 19 * (1 - item.percent / 100)}`}
            className={item.isCompleted ? "text-emerald-500" : "text-bronze"}
            strokeLinecap="round"
          />
        </svg>
        {item.isCompleted ? (
          <CheckCircle size={16} weight="fill" className="text-emerald-500" aria-hidden />
        ) : (
          <span className="text-[10px] font-bold text-bronze-dark">{Math.round(item.percent)}%</span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <Link
          to={`/episodes/${item.episode.slug}`}
          className="line-clamp-1 font-bold text-ink hover:text-vermilion focus-visible:outline-2 focus-visible:outline-focus"
        >
          {item.episode.title}
        </Link>
        <Link
          to={`/series/${item.episode.series.slug}`}
          className="mt-0.5 block text-sm text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          {item.episode.series.title}
        </Link>
        <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft/70">
          <Clock size={11} aria-hidden />
          {formatDate(item.lastListenedAt)}
        </p>
      </div>

      {/* Resume button */}
      {item.episode.available && !item.isCompleted ? (
        <button
          type="button"
          onClick={handleResume}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-bronze/40 text-bronze hover:bg-bronze/10 focus-visible:outline-2 focus-visible:outline-focus"
          aria-label={`Tiếp tục nghe: ${item.episode.title}`}
        >
          <Play size={17} weight="fill" aria-hidden />
        </button>
      ) : item.isCompleted ? (
        <span className="text-xs font-semibold text-emerald-600">Xong</span>
      ) : (
        <span className="text-xs text-ink-soft/60">Không khả dụng</span>
      )}
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-paper-soft p-4 animate-pulse">
      <div className="h-12 w-12 shrink-0 rounded-full bg-paper-deep" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-paper-deep" />
        <div className="h-3 w-1/2 rounded bg-paper-deep" />
      </div>
    </div>
  );
}

export function ListeningHistoryPage() {
  const [filter, setFilter] = useState<FilterStatus>("all");

  const { data, status, error } = useQuery({
    queryKey: ["listening-history", filter],
    queryFn: () => listeningService.getHistory(1, 50, filter),
    staleTime: 30_000,
  });

  return (
    <div className="min-h-screen bg-paper">
      <MainHeader />
      {/* Header */}
      <div className="bg-night py-12">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-bronze">Cá nhân</p>
          <h1 className="font-serif text-3xl font-bold text-paper-soft">Lịch sử nghe</h1>
          <p className="mt-2 text-sm text-paper-deep/70">Theo dõi tiến độ và tiếp tục nghe bất cứ lúc nào.</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="sticky top-16 z-20 border-b border-line bg-paper-soft/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl gap-1 px-5 py-2.5" role="tablist" aria-label="Lọc lịch sử">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={filter === tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-[background-color,color] duration-200",
                filter === tab.value
                  ? "bg-vermilion text-paper-soft"
                  : "text-ink-soft hover:bg-paper hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-5 py-8">
        {status === "pending" ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : status === "error" ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-line p-8 text-center">
            <h2 className="font-bold text-ink">Không thể tải lịch sử</h2>
            <p className="text-sm text-ink-soft">{error instanceof Error ? error.message : "Lỗi không xác định"}</p>
          </div>
        ) : !data?.items.length ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-line p-8 text-center">
            <BookOpen size={40} className="text-bronze/40" />
            <h2 className="font-bold text-ink">Chưa có lịch sử nghe</h2>
            <p className="text-sm text-ink-soft">
              {filter !== "all" ? "Không có tập nào phù hợp với bộ lọc này." : "Bắt đầu nghe series đầu tiên của bạn!"}
            </p>
            <Link
              to="/series"
              className="rounded-lg bg-vermilion px-5 py-2.5 text-sm font-semibold text-paper-soft hover:bg-vermilion-dark"
            >
              Khám phá series
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-ink-soft">{data.total} tập</p>
            <div className="flex flex-col gap-3">
              {data.items.map((item) => (
                <HistoryCard key={`${item.episode.id}-${item.lastListenedAt}`} item={item} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
