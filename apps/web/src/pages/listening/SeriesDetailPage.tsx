/**
 * Trang chi tiết Series — /series/:slug
 * - Hero cover landscape
 * - Danh sách episodes với trạng thái tiến độ (nếu đăng nhập)
 * - Sources trích dẫn học thuật
 * - Nút phát episode → AudioPlayer
 */
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  Play,
  SealCheck,
  Warning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { listeningService } from "@/features/listening/services/listeningService";
import { useAudioPlayer } from "@/features/listening/context/AudioPlayerContext";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { MainHeader } from "@/shared/components/common/MainHeader";
import { APP_PATHS } from "@/shared/constants/routes";
import type { EpisodeBrief, SeriesDetail } from "@/features/listening/services/listeningService";

/* ---------- helpers ---------- */
function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin} phút`;
  return `${Math.floor(totalMin / 60)} giờ ${totalMin % 60} phút`;
}

function yearLabel(y: number) {
  return y > 0 ? `${y} SCN` : `${Math.abs(y)} TCN`;
}

/* ---------- Episode row ---------- */
function EpisodeRow({
  episode,
  index,
  seriesTitle,
  coverUrl,
}: {
  episode: EpisodeBrief;
  index: number;
  seriesTitle: string;
  coverUrl: string | null;
}) {
  const player = useAudioPlayer();
  const session = useCurrentUser();
  const navigate = useNavigate();

  const narration = episode.narrations.find((n) => n.available) ?? episode.narrations[0];
  const progress = episode.viewer?.progress.find((p) => p.narrationId === narration?.id);
  const isCompleted = episode.viewer?.isCompleted ?? false;
  const hasProgress = !!progress && progress.positionMs > 0;

  const handlePlay = () => {
    if (!narration?.available) return;
    if (!session.data) {
      navigate(APP_PATHS.login, {
        state: { from: { pathname: APP_PATHS.episodeDetail(episode.slug) } },
      });
      return;
    }
    void player.loadNarration(narration.id, {
      episodeSlug: episode.slug,
      episodeTitle: episode.title,
      seriesTitle,
      coverUrl,
    });
  };

  return (
    <div className={cn(
      "group flex items-start gap-4 rounded-xl border px-4 py-4 transition-[border-color,background-color] duration-200",
      player.track?.narrationId === narration?.id
        ? "border-bronze/50 bg-bronze/5"
        : "border-line bg-paper-soft hover:border-bronze/40 hover:bg-paper",
    )}>
      {/* Number */}
      <span className="mt-0.5 min-w-[36px] font-mono text-xl font-bold text-bronze-dark">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={`/episodes/${episode.slug}`}
          className="line-clamp-2 font-bold text-ink hover:text-vermilion focus-visible:outline-2 focus-visible:outline-focus"
        >
          {episode.title}
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          {narration?.durationMs ? (
            <span className="flex items-center gap-1">
              <Clock size={12} aria-hidden /> {formatDuration(narration.durationMs)}
            </span>
          ) : null}
          {isCompleted && (
            <span className="flex items-center gap-1 font-semibold text-emerald-600">
              <CheckCircle size={13} weight="fill" aria-hidden /> Đã hoàn thành
            </span>
          )}
          {hasProgress && !isCompleted && (
            <span className="text-amber-600">
              Đã nghe {Math.round((progress?.positionMs ?? 0) / 60_000)} phút
            </span>
          )}
        </div>

        {/* Progress bar */}
        {hasProgress && narration?.durationMs ? (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-paper-deep">
            <div
              className="h-full rounded-full bg-vermilion"
              style={{ width: `${Math.min(100, ((progress?.positionMs ?? 0) / narration.durationMs) * 100)}%` }}
              aria-hidden
            />
          </div>
        ) : null}
      </div>

      {/* Play button */}
      <button
        type="button"
        onClick={handlePlay}
        disabled={!narration?.available}
        title={!session.data ? "Đăng nhập để nghe" : narration?.available ? "Phát" : "Chưa có audio"}
        className={cn(
          "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-[border-color,background-color,color] duration-200",
          player.track?.narrationId === narration?.id
            ? "border-bronze bg-bronze text-paper-soft"
            : "border-bronze/40 text-bronze hover:border-bronze hover:bg-bronze/10",
          (!narration?.available) && "cursor-not-allowed opacity-40",
        )}
        aria-label={`Phát tập ${index + 1}: ${episode.title}`}
      >
        <Play size={18} weight="fill" aria-hidden />
      </button>
    </div>
  );
}

/* ---------- Sources section ---------- */
function SourcesSection({ series }: { series: SeriesDetail }) {
  if (!series.sources?.length) return null;
  return (
    <section aria-labelledby="sources-heading" className="rounded-xl border border-line bg-paper-soft p-6">
      <h2 id="sources-heading" className="mb-4 flex items-center gap-2 font-bold text-ink">
        <SealCheck size={20} className="text-bronze" aria-hidden />
        Tài liệu tham khảo
        {series.evidenceWarning ? (
          <span className="ml-auto flex items-center gap-1 text-xs font-normal text-amber-600">
            <Warning size={14} aria-hidden /> Một số nguồn cần kiểm tra lại
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-600">
            <CheckCircle size={14} weight="fill" aria-hidden /> Đã xác minh học thuật
          </span>
        )}
      </h2>
      <ul className="flex flex-col gap-3">
        {series.sources.map((source, idx) => (
          <li key={idx} className="flex gap-3 rounded-lg border-l-2 border-bronze/60 bg-paper pl-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{source.title}</p>
              {source.author ? <p className="mt-0.5 text-sm text-ink-soft">{source.author}</p> : null}
              {source.locator ? <p className="mt-1 text-xs text-ink-soft">{source.locator}</p> : null}
            </div>
            <span className={cn(
              "shrink-0 self-start rounded-full px-2 py-0.5 text-xs font-bold",
              source.tier === "PRIMARY" ? "bg-bronze/15 text-bronze-dark" : "bg-paper-deep text-ink-soft",
            )}>
              {source.tier === "PRIMARY" ? "Sử liệu gốc" : "Tham khảo"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Skeleton ---------- */
function SeriesDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-64 w-full bg-night-soft md:h-80" />
      <div className="mx-auto max-w-4xl px-5 py-8 space-y-4">
        <div className="h-8 w-3/4 rounded bg-paper-deep" />
        <div className="h-4 w-1/2 rounded bg-paper-deep" />
        <div className="mt-8 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-paper-deep" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export function SeriesDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();

  const { data: series, status, error } = useQuery({
    queryKey: ["series", slug],
    queryFn: () => listeningService.getSeriesDetail(slug),
    enabled: !!slug,
    staleTime: 60_000,
  });

  if (status === "pending") return <SeriesDetailSkeleton />;

  if (status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-5">
        <h1 className="text-2xl font-bold text-ink">Không tìm thấy series</h1>
        <p className="text-ink-soft">{error instanceof Error ? error.message : "Lỗi không xác định"}</p>
        <Link
          to="/series"
          className="mt-2 rounded-lg bg-vermilion px-5 py-2.5 text-sm font-semibold text-paper-soft hover:bg-vermilion-dark"
        >
          Xem danh sách series
        </Link>
      </main>
    );
  }

  const coverUrl = series.coverLandscape?.url ?? series.cover?.url ?? null;

  return (
    <div className="min-h-screen bg-paper">
      <MainHeader />
      {/* Hero */}
      <div className="relative overflow-hidden bg-night">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={series.title}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        ) : null}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night via-night/70 to-night/30" />

        <div className="relative mx-auto max-w-5xl px-5 py-12 md:py-16">
          <Link
            to="/series"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-paper-deep/70 hover:text-paper-soft focus-visible:outline-2 focus-visible:outline-focus"
          >
            <ArrowLeft size={15} aria-hidden /> Tất cả series
          </Link>

          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            {/* Cover thumb */}
            {series.cover?.url ? (
              <img
                src={series.cover.url}
                alt={series.title}
                className="h-36 w-36 shrink-0 rounded-xl object-cover shadow-xl md:h-44 md:w-44"
              />
            ) : (
              <div className="grid h-36 w-36 shrink-0 place-items-center rounded-xl border border-bronze/30 bg-night-soft">
                <BookOpen size={44} className="text-bronze/40" />
              </div>
            )}

            <div className="flex min-w-0 flex-col gap-3">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-bronze">
                {series.startYear !== undefined ? yearLabel(series.startYear) : ""}
                {series.endYear !== null && series.endYear !== undefined
                  ? ` – ${yearLabel(series.endYear)}` : ""}
              </p>
              <h1 className="font-serif text-3xl font-bold leading-snug text-paper-soft md:text-4xl">
                {series.title}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-paper-deep/80">
                {series.description}
              </p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-paper-deep/70">
                  <Play size={14} weight="fill" className="text-bronze" aria-hidden />
                  {series.episodes.length} tập
                </span>
                {series.evidenceWarning === null && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <SealCheck size={13} weight="fill" aria-hidden /> Đã xác minh học thuật
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <main className="mx-auto max-w-4xl px-5 py-10 space-y-10">
        {/* Episodes list */}
        <section aria-labelledby="episodes-heading">
          <h2 id="episodes-heading" className="mb-4 text-xl font-bold text-ink">
            Danh sách tập
          </h2>
          {series.episodes.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-line p-8 text-center">
              <Clock size={36} className="text-bronze/40" />
              <p className="font-semibold text-ink">Chưa có tập nào</p>
              <p className="text-sm text-ink-soft">Nội dung đang được biên soạn.</p>
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {series.episodes.map((episode, idx) => (
                <li key={episode.id}>
                  <EpisodeRow
                    episode={episode}
                    index={idx}
                    seriesTitle={series.title}
                    coverUrl={series.cover?.url ?? null}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Sources */}
        <SourcesSection series={series} />
      </main>
    </div>
  );
}
