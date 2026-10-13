import { CaretLeft, CaretRight, ChatCircleDots, FilmSlate, Folder, Heart, Lightning, ThumbsDown, ThumbsUp, TrendDown, TrendUp, Trophy } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { communityBentoMock } from "../communityData";
import { useReducedMotion } from "../hooks/useReducedMotion";

export function CommunityBento() {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const reducedMotion = useReducedMotion();
  const { topComments, trending, topLiked, hotTopics, recentComments } = communityBentoMock;

  const updateEdge = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setEdge({
      start: el.scrollLeft <= 4,
      end: maxScroll <= 0 || el.scrollLeft >= maxScroll - 4,
    });
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    updateEdge();
    el.addEventListener("scroll", updateEdge, { passive: true });
    const ro = new ResizeObserver(updateEdge);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdge);
      ro.disconnect();
    };
  }, [updateEdge]);

  const scrollByFraction = (dir: -1 | 1): void => {
    const el = rowRef.current;
    if (!el) return;
    const distance = el.clientWidth * 0.8 * dir;
    el.scrollBy({ left: distance, behavior: reducedMotion ? "instant" : "smooth" });
  };

  return (
    <section aria-labelledby="community-bento-title" className="w-full px-5 py-6 md:px-7 md:py-8">
      {/* Flat panel one tone deeper than the page so it separates without floating; columns are split by borders only. */}
      <div className="mx-auto flex max-w-[1400px] flex-col rounded-2xl border border-bronze/30 bg-paper-deep/50 md:rounded-[20px]">
        {/* Row 1: Top bình luận */}
        <div className="flex flex-col gap-4 p-5 md:p-6">
          <div className="flex items-center justify-between">
            <h2 id="community-bento-title" className="flex items-center gap-2 font-serif text-sm font-bold uppercase tracking-wider text-bronze md:text-base">
              <Trophy size={18} weight="fill" className="text-bronze" aria-hidden="true" />
              Top bình luận
            </h2>
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => scrollByFraction(-1)}
                disabled={edge.start}
                aria-label="Cuộn trái danh sách bình luận"
                className="grid size-8 place-items-center rounded-full border border-bronze/25 text-ink-soft transition-all hover:border-bronze hover:text-ink disabled:pointer-events-none disabled:opacity-20"
              >
                <CaretLeft size={16} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => scrollByFraction(1)}
                disabled={edge.end}
                aria-label="Cuộn phải danh sách bình luận"
                className="grid size-8 place-items-center rounded-full border border-bronze/25 text-ink-soft transition-all hover:border-bronze hover:text-ink disabled:pointer-events-none disabled:opacity-20"
              >
                <CaretRight size={16} weight="bold" />
              </button>
            </div>
          </div>

          <div
            ref={rowRef}
            className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-4"
          >
            {topComments.map((item) => (
              <article
                key={item.id}
                className="relative isolate flex w-60 shrink-0 snap-start flex-col justify-between gap-3 overflow-hidden rounded-xl border border-bronze/25 p-4 transition-colors hover:border-bronze/60 md:w-68"
              >
                {/* Blurred cover supplies each tile's colour; the paper scrim keeps the text legible. */}
                <img src={item.podcastCover} alt="" aria-hidden="true" className="absolute inset-0 -z-20 size-full scale-125 object-cover blur-xl saturate-150" loading="lazy" />
                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-paper-soft/55" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={item.userAvatar}
                      alt={item.userName}
                      className="size-8 rounded-full border border-bronze/30 object-cover"
                      loading="lazy"
                    />
                    <span className="flex items-center gap-1 text-xs font-bold text-ink">
                      {item.userName}
                      <span className="text-[10px] text-bronze">∞</span>
                    </span>
                  </div>
                  <img
                    src={item.podcastCover}
                    alt={item.podcastTitle}
                    className="size-10 shrink-0 rounded object-cover shadow-xs"
                    loading="lazy"
                  />
                </div>

                <p className="line-clamp-2 text-xs font-medium leading-relaxed text-ink">{item.content}</p>

                <div className="flex items-center gap-3 pt-1 text-[11px] font-medium text-ink">
                  <span className="flex items-center gap-1">
                    <ThumbsUp size={12} weight="bold" /> {item.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsDown size={12} weight="bold" />
                  </span>
                  <span className="flex items-center gap-1">
                    <ChatCircleDots size={12} weight="bold" /> {item.replies}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Row 2: 4 columns divided purely by internal borders (border-t + border-r) */}
        <div className="grid grid-cols-1 border-t border-bronze/25 md:grid-cols-2 xl:grid-cols-4">
          {/* Col 1: Sôi nổi nhất */}
          <div className="flex flex-col gap-3 p-5 md:p-6 md:border-r md:border-bronze/25">
            <h3 className="flex items-center gap-2 font-serif text-xs font-bold uppercase tracking-wider text-bronze md:text-sm">
              <FilmSlate size={16} weight="fill" className="text-bronze" aria-hidden="true" />
              Sôi nổi nhất
            </h3>
            <ul className="flex flex-col gap-2">
              {trending.map((item) => (
                <li key={item.id}>
                  <Link
                    to="/login"
                    className="group flex items-center gap-2.5 rounded p-1 transition-colors hover:bg-paper-soft/60"
                  >
                    <span className="w-3 text-center text-xs font-bold text-ink-soft">{item.rank}.</span>
                    {item.trend === "up" ? (
                      <TrendUp size={13} weight="bold" className="text-emerald-600" />
                    ) : (
                      <TrendDown size={13} weight="bold" className="text-rose-600" />
                    )}
                    <img
                      src={item.cover}
                      alt=""
                      className="size-7 shrink-0 rounded object-cover shadow-xs"
                      loading="lazy"
                    />
                    <span className="truncate text-xs text-ink group-hover:text-vermilion">
                      {item.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/login" className="mt-auto pt-2 text-right text-[11px] text-ink-soft hover:text-vermilion">
              Xem thêm →
            </Link>
          </div>

          {/* Col 2: Yêu thích nhất */}
          <div className="flex flex-col gap-3 border-t border-bronze/25 p-5 md:border-t-0 md:p-6 xl:border-r xl:border-bronze/25">
            <h3 className="flex items-center gap-2 font-serif text-xs font-bold uppercase tracking-wider text-bronze md:text-sm">
              <Heart size={16} weight="fill" className="text-bronze" aria-hidden="true" />
              Yêu thích nhất
            </h3>
            <ul className="flex flex-col gap-2">
              {topLiked.map((item) => (
                <li key={item.id}>
                  <Link
                    to="/login"
                    className="group flex items-center gap-2.5 rounded p-1 transition-colors hover:bg-paper-soft/60"
                  >
                    <span className="w-3 text-center text-xs font-bold text-ink-soft">{item.rank}.</span>
                    {item.trend === "up" ? (
                      <TrendUp size={13} weight="bold" className="text-emerald-600" />
                    ) : (
                      <TrendDown size={13} weight="bold" className="text-rose-600" />
                    )}
                    <img
                      src={item.cover}
                      alt=""
                      className="size-7 shrink-0 rounded object-cover shadow-xs"
                      loading="lazy"
                    />
                    <span className="truncate text-xs text-ink group-hover:text-vermilion">
                      {item.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/login" className="mt-auto pt-2 text-right text-[11px] text-ink-soft hover:text-vermilion">
              Xem thêm →
            </Link>
          </div>

          {/* Col 3: Thời kỳ hot */}
          <div className="flex flex-col gap-3 border-t border-bronze/25 p-5 md:p-6 md:border-r md:border-bronze/25 xl:border-t-0">
            <h3 className="flex items-center gap-2 font-serif text-xs font-bold uppercase tracking-wider text-bronze md:text-sm">
              <Folder size={16} weight="fill" className="text-bronze" aria-hidden="true" />
              Thời kỳ hot
            </h3>
            <ul className="flex flex-col gap-2">
              {hotTopics.map((item) => (
                <li key={item.id}>
                  <Link
                    to="/login"
                    className="group flex items-center gap-2.5 rounded p-1 transition-colors hover:bg-paper-soft/60"
                  >
                    <span className="w-3 text-center text-xs font-bold text-ink-soft">{item.rank}.</span>
                    {item.trend === "up" ? (
                      <TrendUp size={13} weight="bold" className="text-emerald-600" />
                    ) : (
                      <TrendDown size={13} weight="bold" className="text-rose-600" />
                    )}
                    <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold shadow-xs", item.color)}>
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/login" className="mt-auto pt-2 text-right text-[11px] text-ink-soft hover:text-vermilion">
              Xem thêm →
            </Link>
          </div>

          {/* Col 4: Bình luận mới */}
          <div className="flex flex-col gap-3 border-t border-bronze/25 p-5 md:p-6 xl:border-t-0">
            <h3 className="flex items-center gap-2 font-serif text-xs font-bold uppercase tracking-wider text-bronze md:text-sm">
              <Lightning size={16} weight="fill" className="text-bronze" aria-hidden="true" />
              Bình luận mới
            </h3>
            <ul className="flex flex-col gap-2.5">
              {recentComments.map((item) => (
                <li key={item.id} className="flex flex-col gap-0.5 border-b border-bronze/15 pb-2 text-xs last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.userAvatar}
                      alt={item.userName}
                      className="size-5 shrink-0 rounded-full border border-bronze/30 object-cover"
                      loading="lazy"
                    />
                    <span className="truncate text-xs font-bold text-ink">
                      {item.userName}
                      <span className="ml-1 text-[10px] text-bronze">∞</span>
                    </span>
                  </div>
                  <p className="line-clamp-2 pl-7 text-[11px] text-ink-soft">{item.comment}</p>
                  <p className="truncate pl-7 text-[10px] text-vermilion">▶ {item.podcastTitle}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
