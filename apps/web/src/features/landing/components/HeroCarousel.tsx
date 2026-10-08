import { Heart, LockKey, Play } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { heroSlides } from "../data";
import { useHeroCarousel } from "../hooks/useHeroCarousel";
import { useHeroSlideMotion } from "../hooks/useHeroSlideMotion";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { scrollToLandingTarget } from "../hooks/useLandingMotion";
import type { HeroSlide } from "../types";

interface HeroThumbnailProps {
  item: HeroSlide;
  index: number;
  active: boolean;
  compact?: boolean;
  reducedMotion: boolean;
  onSelect: (index: number) => void;
}

function HeroThumbnail({ item, index, active, compact = false, reducedMotion, onSelect }: HeroThumbnailProps) {
  return (
    <div className={cn("w-32 shrink-0", compact && "w-[132px]", !active && "opacity-75", !reducedMotion && "transition duration-300")}>
      <Button
        variant="ghost"
        className={cn("relative h-[84px] w-full overflow-hidden rounded border bg-night-soft p-0 hover:bg-night-soft", compact && "h-[78px]", active ? "border-2 border-paper-soft" : "border-white/40", !reducedMotion && "transition-transform active:scale-[.98]")}
        onClick={() => onSelect(index)}
        aria-label={`Chuyển tới ${item.title}`}
        aria-current={active ? "true" : undefined}
      >
        <img src={item.thumbnailImage} alt="" className="pointer-events-none size-full object-cover" loading="lazy" decoding="async" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/50 to-transparent" />
      </Button>
      <p className={cn("mt-2 truncate text-xs", active ? "font-bold text-paper-soft" : "font-medium text-paper-deep")}>
        {item.year} - {item.title}
      </p>
    </div>
  );
}

export function HeroCarousel() {
  const carousel = useHeroCarousel(heroSlides);
  const reducedMotion = useReducedMotion();
  const pointerStart = useRef<number | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [requestedImageIds, setRequestedImageIds] = useState<Set<string>>(() => new Set([heroSlides[0].id]));
  const [readyImageIds, setReadyImageIds] = useState<Set<string>>(() => new Set());
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(() => new Set());
  const slide = heroSlides[carousel.activeIndex];
  const isFavorite = favoriteIds.includes(slide.id);
  useHeroSlideMotion(slide.id, carousel.direction, reducedMotion);

  const goToSlide = (index: number): void => {
    const target = ((index % heroSlides.length) + heroSlides.length) % heroSlides.length;
    const targetId = heroSlides[target].id;
    setRequestedImageIds((current) => new Set(current).add(targetId));
    setFailedImageIds((current) => {
      const next = new Set(current);
      next.delete(targetId);
      return next;
    });
    carousel.goTo(target);
  };

  const nextSlide = (): void => goToSlide(carousel.activeIndex + 1);
  const previousSlide = (): void => goToSlide(carousel.activeIndex - 1);
  const toggleFavorite = (): void => {
    setFavoriteIds((current) => current.includes(slide.id) ? current.filter((id) => id !== slide.id) : [...current, slide.id]);
  };
  const openSignup = (): void => scrollToLandingTarget("signup");

  return (
    <section
      id="hero"
      role="region"
      aria-roledescription="carousel"
      aria-label="Series lịch sử nổi bật"
      className="relative min-h-screen overflow-hidden bg-night"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") previousSlide();
        if (event.key === "ArrowRight") nextSlide();
      }}
      onPointerDown={(event) => { pointerStart.current = event.clientX; }}
      onPointerUp={(event) => {
        if (pointerStart.current !== null) {
          const distance = event.clientX - pointerStart.current;
          if (Math.abs(distance) > 48) distance > 0 ? previousSlide() : nextSlide();
        }
        pointerStart.current = null;
      }}
      onPointerCancel={() => { pointerStart.current = null; }}
    >
      {heroSlides.map((item, index) => (
        <div
          key={item.id}
          id={`hero-image-${item.id}`}
          className={cn("pointer-events-none absolute inset-0 overflow-hidden", index === carousel.activeIndex ? "opacity-100" : "opacity-0", !reducedMotion && "transition-opacity duration-500")}
          aria-hidden={index !== carousel.activeIndex}
        >
          <img
            src={item.thumbnailImage}
            alt={index === carousel.activeIndex && (!requestedImageIds.has(item.id) || failedImageIds.has(item.id)) ? item.imageAlt : ""}
            className="absolute inset-0 size-full object-cover object-center"
            loading="eager"
            decoding="async"
          />
          {requestedImageIds.has(item.id) && !failedImageIds.has(item.id) ? (
            <div className={cn("absolute inset-0", readyImageIds.has(item.id) ? "opacity-100" : "opacity-0", !reducedMotion && "transition-opacity duration-300")}>
              <img
                src={item.image}
                alt={index === carousel.activeIndex ? item.imageAlt : ""}
                className="size-full object-cover object-center"
                loading={index === carousel.activeIndex ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={index === carousel.activeIndex ? "high" : "auto"}
                onLoad={() => setReadyImageIds((current) => new Set(current).add(item.id))}
                onError={() => setFailedImageIds((current) => new Set(current).add(item.id))}
              />
            </div>
          ) : null}
        </div>
      ))}

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(20,17,15,.97)_0%,rgba(20,17,15,.8)_38%,rgba(20,17,15,.34)_68%,rgba(20,17,15,.58)_100%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-night/95 to-transparent" />

      <div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-[1280px] flex-col justify-center px-5 py-20 md:px-7 md:py-24">
        <div className="flex w-full flex-col gap-8 lg:flex-row lg:items-end lg:gap-10">
          <div id="hero-copy-active" className="flex w-full max-w-[680px] flex-col gap-4 md:gap-5 lg:flex-[1.12]">
            <p className="text-sm font-bold uppercase tracking-[.15em] text-bronze">{slide.period} / {slide.year}</p>
            <h1 className="max-w-[680px] font-serif text-4xl font-bold leading-tight tracking-tight text-paper-soft md:text-6xl">
              {slide.title}
            </h1>
            <p className="max-w-[620px] text-lg font-semibold leading-8 text-paper-soft md:text-xl">{slide.subtitle}</p>
            <p className="max-w-[610px] text-sm leading-7 text-paper-deep md:text-base">{slide.description}</p>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-semibold text-paper-deep">
              <span>{slide.episodeCount} tập</span><span aria-hidden="true" className="h-4 w-px bg-bronze/70" />
              <span>{slide.duration}</span><span aria-hidden="true" className="h-4 w-px bg-bronze/70" />
              <span>{slide.perspectives}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button size="icon" className="size-14 rounded-full bg-vermilion text-paper-soft hover:bg-vermilion-dark" onClick={openSignup} aria-label="Đăng nhập để nghe tập đầu">
                <Play size={24} weight="fill" />
              </Button>
              <div className="mr-2 flex flex-col gap-1">
                <span className="font-bold text-paper-soft">Nghe tập đầu</span>
                <span className="flex items-center gap-1.5 text-xs text-paper-deep"><LockKey size={13} className="text-bronze" />Đăng nhập để mở</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className={cn("size-12 rounded-full border-white/60 bg-night/25 text-paper-soft hover:bg-white/10", isFavorite && "border-vermilion bg-vermilion/20 text-vermilion")}
                onClick={toggleFavorite}
                aria-label={isFavorite ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
                aria-pressed={isFavorite}
              >
                <Heart size={21} weight={isFavorite ? "fill" : "regular"} />
              </Button>
            </div>
          </div>

          <div className="hidden w-full flex-col items-end gap-4 pb-2 lg:flex lg:flex-[.88]">
            <p className="w-full max-w-[560px] text-sm font-bold text-paper-soft">Tuyển tập nổi bật</p>
            <div className="flex w-full max-w-[560px] items-start justify-end gap-2.5">
              {heroSlides.map((item, index) => (
                <HeroThumbnail key={item.id} item={item} index={index} active={index === carousel.activeIndex} reducedMotion={reducedMotion} onSelect={goToSlide} />
              ))}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 lg:hidden">
            <p className="text-sm font-bold text-paper-soft">Tuyển tập nổi bật</p>
            <div className="w-full overflow-x-auto pb-2" aria-label="Chọn tuyển tập nổi bật">
              <div className="flex gap-2.5 pr-4">
                {heroSlides.map((item, index) => (
                  <HeroThumbnail key={item.id} item={item} index={index} active={index === carousel.activeIndex} compact reducedMotion={reducedMotion} onSelect={goToSlide} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
