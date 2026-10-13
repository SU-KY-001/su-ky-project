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
      {/* Light theme container: warm paper-soft background matching the landing page theme */}
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 rounded-2xl border border-bronze/25 bg-paper-soft/90 p-5 text-ink shadow-lg backdrop-blur-md md:p-7">
        {/* Row 1: Top bình luận */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 id="community-bento-title" className="flex items-center gap-2 font-serif text-lg font-bold uppercase tracking-wider text-vermilion-dark md:text-xl">
              <Trophy size={22} weight="fill" className="text-vermilion" aria-hidden="true" />
              Top bình luận
            </h2>
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => scrollByFraction(-1)}
                disabled={edge.start}
                aria-label="Cuộn trái danh sách bình luận"
                className={cn(
                  "grid size-9 place-items-center rounded-full border border-bronze/30 bg-white/70 text-ink transition-all hover:bg-white disabled:pointer-events-none disabled:opacity-30",
                )}
              >
                <CaretLeft size={18} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => scrollByFraction(1)}
                disabled={edge.end}
                aria-label="Cuộn phải danh sách bình luận"
                className={cn(
                  "grid size-9 place-items-center rounded-full border border-bronze/30 bg-white/70 text-ink transition-all hover:bg-white disabled:pointer-events-none disabled:opacity-30",
                )}
              >
                <CaretRight size={18} weight="bold" />
              </button>
            </div>
          </div>

          <div
            ref={rowRef}
            className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {topComments.map((item) => (
              <article
                key={item.id}
                className="relative flex w-64 shrink-0 snap-start flex-col justify-between gap-3 overflow-hidden rounded-xl border border-bronze/20 bg-white/80 p-4 shadow-sm transition-all hover:border-vermilion/50 hover:shadow-md md:w-72"
              >
                {/* Background image preview blur */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-10">
                  <img src={item.podcastCover} alt="" className="size-full object-cover blur-md" />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={item.userAvatar}
                      alt={item.userName}
                      className="size-9 rounded-full border border-bronze/30 object-cover"
                      loading="lazy"
                    />
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1 text-sm font-bold text-ink">
                        {item.userName}
                        <span className="text-[10px] text-vermilion">∞</span>
                      </span>
                    </div>
                  </div>
                  <img
                    src={item.podcastCover}
                    alt={item.podcastTitle}
                    className="size-11 shrink-0 rounded-md border border-bronze/20 object-cover shadow-sm"
                    loading="lazy"
                  />
                </div>

                <p className="line-clamp-2 text-xs leading-relaxed text-ink-soft">{item.content}</p>

                <div className="flex items-center gap-3 border-t border-bronze/15 pt-2 text-[11px] text-ink-soft">
                  <span className="flex items-center gap-1 hover:text-ink">
                    <ThumbsUp size={13} weight="bold" /> {item.likes}
                  </span>
                  <span className="flex items-center gap-1 hover:text-ink">
                    <ThumbsDown size={13} weight="bold" />
                  </span>
                  <span className="flex items-center gap-1 hover:text-ink">
                    <ChatCircleDots size={13} weight="bold" /> {item.replies}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Divider */}
        <hr className="border-bronze/20" />

        {/* Row 2: 4-column Bento grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {/* Col 1: Sôi nổi nhất */}
          <div className="flex flex-col gap-3 rounded-xl border border-bronze/20 bg-white/60 p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-serif text-sm font-bold uppercase tracking-wider text-vermilion-dark">
              <FilmSlate size={18} weight="fill" className="text-vermilion" aria-hidden="true" />
              Sôi nổi nhất
            </h3>
            <ul className="flex flex-col gap-2">
              {trending.map((item) => (
                <li key={item.id}>
                  <Link
                    to="/login"
                    className="group flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-white"
                  >
                    <span className="w-4 text-center text-xs font-bold text-ink-soft">{item.rank}.</span>
                    {item.trend === "up" ? (
                      <TrendUp size={14} weight="bold" className="text-emerald-600" />
                    ) : (
                      <TrendDown size={14} weight="bold" className="text-rose-600" />
                    )}
                    <img
                      src={item.cover}
                      alt=""
                      className="size-8 shrink-0 rounded object-cover shadow-xs"
                      loading="lazy"
                    />
                    <span className="truncate text-xs font-semibold text-ink group-hover:text-vermilion">
                      {item.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/login" className="mt-auto pt-2 text-right text-[11px] font-semibold text-ink-soft hover:text-vermilion">
              Xem thêm →
            </Link>
          </div>

          {/* Col 2: Yêu thích nhất */}
          <div className="flex flex-col gap-3 rounded-xl border border-bronze/20 bg-white/60 p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-serif text-sm font-bold uppercase tracking-wider text-vermilion-dark">
              <Heart size={18} weight="fill" className="text-vermilion" aria-hidden="true" />
              Yêu thích nhất
            </h3>
            <ul className="flex flex-col gap-2">
              {topLiked.map((item) => (
                <li key={item.id}>
                  <Link
                    to="/login"
                    className="group flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-white"
                  >
                    <span className="w-4 text-center text-xs font-bold text-ink-soft">{item.rank}.</span>
                    {item.trend === "up" ? (
                      <TrendUp size={14} weight="bold" className="text-emerald-600" />
                    ) : (
                      <TrendDown size={14} weight="bold" className="text-rose-600" />
                    )}
                    <img
                      src={item.cover}
                      alt=""
                      className="size-8 shrink-0 rounded object-cover shadow-xs"
                      loading="lazy"
                    />
                    <span className="truncate text-xs font-semibold text-ink group-hover:text-vermilion">
                      {item.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/login" className="mt-auto pt-2 text-right text-[11px] font-semibold text-ink-soft hover:text-vermilion">
              Xem thêm →
            </Link>
          </div>

          {/* Col 3: Thời kỳ hot */}
          <div className="flex flex-col gap-3 rounded-xl border border-bronze/20 bg-white/60 p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-serif text-sm font-bold uppercase tracking-wider text-vermilion-dark">
              <Folder size={18} weight="fill" className="text-vermilion" aria-hidden="true" />
              Thời kỳ hot
            </h3>
            <ul className="flex flex-col gap-2">
              {hotTopics.map((item) => (
                <li key={item.id}>
                  <Link
                    to="/login"
                    className="group flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-white"
                  >
                    <span className="w-4 text-center text-xs font-bold text-ink-soft">{item.rank}.</span>
                    {item.trend === "up" ? (
                      <TrendUp size={14} weight="bold" className="text-emerald-600" />
                    ) : (
                      <TrendDown size={14} weight="bold" className="text-rose-600" />
                    )}
                    <span className={cn("rounded-md px-2.5 py-0.5 text-xs font-semibold shadow-xs", item.color)}>
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/login" className="mt-auto pt-2 text-right text-[11px] font-semibold text-ink-soft hover:text-vermilion">
              Xem thêm →
            </Link>
          </div>

          {/* Col 4: Bình luận mới */}
          <div className="flex flex-col gap-3 rounded-xl border border-bronze/20 bg-white/60 p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-serif text-sm font-bold uppercase tracking-wider text-vermilion-dark">
              <Lightning size={18} weight="fill" className="text-vermilion" aria-hidden="true" />
              Bình luận mới
            </h3>
            <ul className="flex flex-col gap-2.5">
              {recentComments.map((item) => (
                <li key={item.id} className="flex flex-col gap-1 rounded-lg bg-white/80 p-2.5 text-xs shadow-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.userAvatar}
                      alt={item.userName}
                      className="size-6 shrink-0 rounded-full border border-bronze/30 object-cover"
                      loading="lazy"
                    />
                    <span className="truncate font-bold text-ink">
                      {item.userName}
                      <span className="ml-1 text-[10px] text-vermilion">∞</span>
                    </span>
                  </div>
                  <p className="line-clamp-2 pl-8 text-[11px] text-ink-soft">{item.comment}</p>
                  <p className="truncate pl-8 text-[10px] font-semibold text-bronze-dark">▶ {item.podcastTitle}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
