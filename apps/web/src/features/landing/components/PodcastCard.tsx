import { Headphones } from "@phosphor-icons/react/dist/icons/Headphones";
import { ListBullets } from "@phosphor-icons/react/dist/icons/ListBullets";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import type { CardOrientation, PodcastItem } from "../types";
import { PodcastHoverCard } from "./PodcastHoverCard";

interface PodcastCardProps {
  item: PodcastItem;
  orientation?: CardOrientation;
  /** 0..1, renders a progress bar (continue listening). */
  progress?: number;
  /** Replaces the default "N tập · duration" line. */
  caption?: string;
}

const SIZE: Record<CardOrientation, string> = {
  portrait: "w-44 md:w-56 xl:w-60 aspect-[2/3]",
  landscape: "w-80 md:w-96 xl:w-[26rem] aspect-video",
};

// Touch devices have no hover; the popup would open on tap and block navigation.
const HOVER_CAPABLE = "(hover: hover) and (pointer: fine)";
// Intent delay: the popup opens only if the pointer rests on the card, so sweeping across a row does not flash popups.
const HOVER_OPEN_DELAY_MS = 700;
// Frosted glass: a light tint plus heavy blur, so each badge takes on the colour of the cover under it.
const cornerBadge = "pointer-events-none absolute rounded-md bg-night/35 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md backdrop-saturate-150 md:text-sm [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]";

export function PodcastCard({ item, orientation = "portrait", progress, caption }: PodcastCardProps) {
  const coverRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>(undefined);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  // Local until a favorites API exists, same as the hero carousel.
  const [liked, setLiked] = useState(false);
  const portrait = orientation === "portrait";
  const image = portrait ? item.portraitImage ?? item.landscapeImage : item.landscapeImage ?? item.portraitImage;
  const popupImage = item.landscapeImage ?? item.portraitImage;

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const open = (): void => {
    if (!coverRef.current || !window.matchMedia(HOVER_CAPABLE).matches) return;
    const cover = coverRef.current;
    timerRef.current = window.setTimeout(() => setAnchor(cover.getBoundingClientRect()), HOVER_OPEN_DELAY_MS);
  };
  const close = (): void => {
    window.clearTimeout(timerRef.current);
    setAnchor(null);
  };

  // React treats portal children as descendants for enter/leave, so moving onto the popup does not close it.
  return (
    <div className="shrink-0 snap-start" onMouseEnter={open} onMouseLeave={close}>
      <Link to="/login" className="group flex flex-col gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion" aria-label={item.title}>
        <div ref={coverRef} className={cn("relative overflow-hidden rounded-md bg-night", SIZE[orientation])}>
          {image ? <img src={image} alt={item.imageAlt} className="size-full object-cover" loading="lazy" decoding="async" /> : null}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-md border-2 border-transparent group-hover:border-vermilion" />
          <Badge className={cn(cornerBadge, "left-2 top-2")}>{item.period}</Badge>
          <Badge className={cn(cornerBadge, "right-2 top-2 px-1.5")}><Headphones aria-label="Podcast âm thanh" className="size-4!" /></Badge>
          <Badge className={cn(cornerBadge, "bottom-3 left-2")}><ListBullets aria-hidden="true" />{item.episodeCount} tập</Badge>
          <Badge className={cn(cornerBadge, "bottom-3 right-2")}>{item.duration}</Badge>
          {progress !== undefined ? (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <span className="block h-full bg-vermilion" style={{ width: `${progress * 100}%` }} />
            </span>
          ) : null}
        </div>
        <div className="flex w-0 min-w-full flex-col gap-0.5">
          <p className="truncate text-base font-bold text-ink md:text-lg">{item.title}</p>
          {caption ? <p className="truncate text-sm text-ink-soft">{caption}</p> : null}
        </div>
      </Link>
      {anchor ? createPortal(<PodcastHoverCard item={item} image={popupImage} anchor={anchor} liked={liked} onToggleLike={() => setLiked((value) => !value)} />, document.body) : null}
    </div>
  );
}
