/**
 * Trang chi tiết Episode — /episodes/:slug
 * - Header: tên tập + series breadcrumb
 * - Narration selector (nếu có nhiều giọng đọc)
 * - Nút phát → global AudioPlayer
 * - Entities (nhân vật/sự kiện liên quan)
 * - Navigation: Previous / Next episode
 * - Sources học thuật của series
 */
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useNavigate, useLocation } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Clock,
  MicrophoneStage,
  Pause,
  Play,
  Tag,
  Warning,
} from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { listeningService } from "@/features/listening/services/listeningService";
import { useAudioPlayer } from "@/features/listening/context/AudioPlayerContext";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { MainHeader } from "@/shared/components/common/MainHeader";
import { APP_PATHS } from "@/shared/constants/routes";
import { EpisodeQuizSection } from "@/features/listening/components/EpisodeQuizSection";

/* ---------- helpers ---------- */
function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function yearLabel(y: number) {
  return y > 0 ? `${y} SCN` : `${Math.abs(y)} TCN`;
}

function narrationLabel(type: string): string {
  return type === "FIRST_PERSON" ? "Ngôi thứ nhất" : "Ngôi thứ ba";
}

/* ---------- Skeleton ---------- */
function EpisodeSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-paper">
      <div className="h-56 bg-night" />
      <div className="mx-auto max-w-3xl px-5 py-10 space-y-6">
        <div className="h-8 w-2/3 rounded bg-paper-deep" />
        <div className="h-4 w-1/3 rounded bg-paper-deep" />
        <div className="h-20 rounded-xl bg-paper-deep" />
        <div className="h-40 rounded-xl bg-paper-deep" />
      </div>
    </div>
  );
}

/* ---------- Narration selector ---------- */
function NarrationSelector({
  narrations,
  selected,
  onSelect,
}: {
  narrations: { id: string; type: string; narrator: { name: string } | null; durationMs: number | null; available: boolean }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (narrations.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Chọn phiên bản ngôi kể">
      {narrations.map((n) => (
        <button
          key={n.id}
          type="button"
          role="radio"
          aria-checked={selected === n.id}
          disabled={!n.available}
          onClick={() => onSelect(n.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-[border-color,background-color] duration-200",
            selected === n.id
              ? "border-bronze bg-bronze/10 text-bronze-dark"
              : "border-line bg-paper text-ink-soft hover:border-bronze/50",
            !n.available && "cursor-not-allowed opacity-40",
          )}
        >
          <MicrophoneStage size={14} aria-hidden />
          <span>{narrationLabel(n.type)}</span>
          {n.narrator?.name ? <span className="font-normal opacity-75">· {n.narrator.name}</span> : null}
          {n.durationMs ? (
            <span className="font-mono text-xs opacity-70">{formatDuration(n.durationMs)}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/* ---------- Page ---------- */
export function EpisodeDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const player = useAudioPlayer();
  const session = useCurrentUser();

  const { data: episode, status, error } = useQuery({
    queryKey: ["episode", slug],
    queryFn: () => listeningService.getEpisodeDetail(slug),
    enabled: !!slug,
    staleTime: 60_000,
  });

  const defaultNarration = episode?.narrations.find(
    (n) => n.type === "THIRD_PERSON" && n.available,
  ) ?? episode?.narrations.find((n) => n.available)
    ?? episode?.narrations.find((n) => n.type === "THIRD_PERSON")
    ?? episode?.narrations[0];
  const [selectedNarrationId, setSelectedNarrationId] = useState<string | null>(null);
  const activeNarrationId = selectedNarrationId ?? defaultNarration?.id ?? null;

  if (status === "pending") return <EpisodeSkeleton />;

  if (status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-5">
        <h1 className="text-2xl font-bold text-ink">Không tìm thấy tập phát sóng</h1>
        <p className="text-ink-soft">{error instanceof Error ? error.message : "Lỗi không xác định"}</p>
        <Link to="/series" className="mt-2 rounded-lg bg-vermilion px-5 py-2.5 text-sm font-semibold text-paper-soft hover:bg-vermilion-dark">
          Xem danh sách series
        </Link>
      </main>
    );
  }

  const coverUrl = episode.series.coverLandscape?.url ?? episode.series.cover?.url ?? null;
  const isPlaying = player.track?.episodeSlug === slug;
  const viewerProgress = episode.viewer?.progress.find((p) => p.narrationId === activeNarrationId);
  const isCompleted = episode.viewer?.isCompleted ?? false;

  const handlePlay = () => {
    if (!activeNarrationId) return;
    if (!session.data) {
      navigate(APP_PATHS.login, { state: { from: { pathname: location.pathname } } });
      return;
    }
    if (isPlaying && player.playing) {
      player.pause();
    } else if (isPlaying && !player.playing) {
      player.play();
    } else {
      void player.loadNarration(activeNarrationId, {
        episodeSlug: episode.slug,
        episodeTitle: episode.title,
        seriesTitle: episode.series.title,
        coverUrl: episode.series.cover?.url ?? null,
      });
    }
  };

  const activeNarration = episode.narrations.find((n) => n.id === activeNarrationId);

  return (
    <div className="min-h-screen bg-paper pb-28">
      <MainHeader />
      {/* Hero */}
      <div className="relative overflow-hidden bg-night">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={episode.series.title}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        ) : null}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night via-night/70 to-transparent" />

        <div className="relative mx-auto max-w-3xl px-5 py-10">
          {/* Breadcrumb */}
          <div className="mb-5 flex items-center gap-1.5 text-sm text-paper-deep/60">
            <Link to="/series" className="hover:text-paper-deep focus-visible:outline-2 focus-visible:outline-focus">
              Series
            </Link>
            <CaretRight size={12} aria-hidden />
            <Link to={`/series/${episode.series.slug}`} className="hover:text-paper-deep focus-visible:outline-2 focus-visible:outline-focus">
              {episode.series.title}
            </Link>
          </div>

          {/* Era label */}
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-bronze">
            {episode.series.startYear !== undefined ? yearLabel(episode.series.startYear) : ""}
            {episode.series.endYear ? ` – ${yearLabel(episode.series.endYear)}` : ""}
          </p>

          {/* Title */}
          <h1 className="font-serif text-3xl font-bold leading-snug text-paper-soft md:text-4xl">
            {episode.title}
          </h1>

          {/* Meta */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-paper-deep/70">
            {activeNarration?.durationMs ? (
              <span className="flex items-center gap-1.5">
                <Clock size={14} aria-hidden /> {formatDuration(activeNarration.durationMs)}
              </span>
            ) : null}
            {isCompleted && (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle size={14} weight="fill" aria-hidden /> Đã hoàn thành
              </span>
            )}
          </div>

          {/* Narration selector */}
          <div className="mt-4">
            <NarrationSelector
              narrations={episode.narrations}
              selected={activeNarrationId ?? ""}
              onSelect={setSelectedNarrationId}
            />
          </div>

          {/* Play button */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlay}
              disabled={!activeNarrationId || !activeNarration?.available}
              className={cn(
                "flex items-center gap-2.5 rounded-full px-6 py-3 text-base font-bold transition-[background-color,transform] duration-200 active:scale-[.97]",
                "focus-visible:outline-2 focus-visible:outline-focus",
                isPlaying && player.playing
                  ? "bg-paper-soft text-ink hover:bg-paper"
                  : "bg-vermilion text-paper-soft hover:bg-vermilion-dark",
                (!activeNarrationId || !activeNarration?.available) && "cursor-not-allowed opacity-50",
              )}
              aria-label={isPlaying && player.playing ? "Tạm dừng" : "Phát tập này"}
            >
              {isPlaying && player.playing
                ? <Pause size={20} weight="fill" aria-hidden />
                : <Play size={20} weight="fill" aria-hidden />}
              {!session.data
                ? "Đăng nhập để nghe"
                : isPlaying && player.playing
                ? "Đang phát"
                : viewerProgress?.positionMs && viewerProgress.positionMs > 0 && !isCompleted
                ? "Tiếp tục nghe"
                : "Phát tập này"}
            </button>

            {/* Progress indicator */}
            {viewerProgress && activeNarration?.durationMs && !isCompleted ? (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-paper-soft/20">
                  <div
                    className="h-full rounded-full bg-bronze"
                    style={{ width: `${Math.min(100, (viewerProgress.positionMs / activeNarration.durationMs) * 100)}%` }}
                    aria-hidden
                  />
                </div>
                <span className="text-xs text-paper-deep/60">
                  {Math.round((viewerProgress.positionMs / activeNarration.durationMs) * 100)}%
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Body */}
      <main className="mx-auto max-w-3xl px-5 py-10 space-y-10">
        {/* Description */}
        {episode.description ? (
          <section aria-labelledby="ep-desc-heading">
            <h2 id="ep-desc-heading" className="mb-3 text-lg font-bold text-ink">Giới thiệu tập</h2>
            <p className="leading-relaxed text-ink-soft whitespace-pre-wrap">{episode.description}</p>
          </section>
        ) : null}

        {/* Entities (nhân vật / sự kiện) */}
        {episode.entities.length > 0 ? (
          <section aria-labelledby="entities-heading">
            <h2 id="entities-heading" className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
              <Tag size={18} className="text-bronze" aria-hidden />
              Nhân vật & Sự kiện trong tập
            </h2>
            <div className="flex flex-wrap gap-2">
              {episode.entities.map((entity) => (
                <Link
                  key={entity.id}
                  to={`/history/events/${entity.id}`}
                  className="rounded-full border border-line bg-paper-soft px-3 py-1 text-sm font-medium text-ink hover:border-bronze hover:text-vermilion focus-visible:outline-2 focus-visible:outline-focus"
                >
                  {entity.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Retention Mini-Quiz */}
        {episode.hasQuiz ? <EpisodeQuizSection episodeSlug={slug} /> : null}

        {/* Series sources */}
        {episode.series.sources?.length > 0 ? (
          <section aria-labelledby="series-sources-heading" className="rounded-xl border border-line bg-paper-soft p-6">
            <h2 id="series-sources-heading" className="mb-4 flex items-center gap-2 font-bold text-ink">
              <BookOpen size={18} className="text-bronze" aria-hidden />
              Tài liệu sử liệu của series
              {episode.series.evidenceWarning ? (
                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-amber-600">
                  <Warning size={14} aria-hidden /> Một số nguồn cần kiểm tra
                </span>
              ) : (
                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-600">
                  <CheckCircle size={14} weight="fill" aria-hidden /> Đã xác minh
                </span>
              )}
            </h2>
            <ul className="flex flex-col gap-2">
              {episode.series.sources.map((s, idx) => (
                <li key={idx} className="rounded-lg border-l-2 border-bronze/60 bg-paper py-2 pl-4 pr-3">
                  <p className="font-semibold text-sm text-ink">{s.title}</p>
                  {s.author ? <p className="mt-0.5 text-xs text-ink-soft">{s.author}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Navigation */}
        <nav className="flex justify-between gap-4" aria-label="Điều hướng giữa các tập">
          {episode.previousEpisode ? (
            <Link
              to={`/episodes/${episode.previousEpisode.slug}`}
              className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-paper-soft p-4 text-sm hover:border-bronze hover:bg-paper focus-visible:outline-2 focus-visible:outline-focus"
            >
              <ArrowLeft size={16} className="shrink-0 text-bronze" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs text-ink-soft">Tập trước</p>
                <p className="line-clamp-1 font-semibold text-ink">{episode.previousEpisode.title}</p>
              </div>
            </Link>
          ) : <div className="flex-1" />}

          {episode.nextEpisode ? (
            <Link
              to={`/episodes/${episode.nextEpisode.slug}`}
              className="flex flex-1 items-center justify-end gap-2 rounded-xl border border-line bg-paper-soft p-4 text-right text-sm hover:border-bronze hover:bg-paper focus-visible:outline-2 focus-visible:outline-focus"
            >
              <div className="min-w-0">
                <p className="text-xs text-ink-soft">Tập tiếp theo</p>
                <p className="line-clamp-1 font-semibold text-ink">{episode.nextEpisode.title}</p>
              </div>
              <ArrowRight size={16} className="shrink-0 text-bronze" aria-hidden />
            </Link>
          ) : <div className="flex-1" />}
        </nav>
      </main>
    </div>
  );
}
