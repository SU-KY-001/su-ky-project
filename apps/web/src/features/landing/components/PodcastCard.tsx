import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
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
  portrait: "w-40 md:w-48 aspect-[2/3]",
  landscape: "w-72 md:w-80 aspect-video",
};

// Touch devices have no hover; the popup would open on tap and block navigation.
const HOVER_CAPABLE = "(hover: hover) and (pointer: fine)";

export function PodcastCard({ item, orientation = "portrait", progress, caption }: PodcastCardProps) {
  const coverRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  // Local until a favorites API exists, same as the hero carousel.
  const [liked, setLiked] = useState(false);
  const portrait = orientation === "portrait";
  const image = portrait ? item.portraitImage ?? item.landscapeImage : item.landscapeImage ?? item.portraitImage;
  const popupImage = item.landscapeImage ?? item.portraitImage;

  const open = (): void => {
    if (coverRef.current && window.matchMedia(HOVER_CAPABLE).matches) setAnchor(coverRef.current.getBoundingClientRect());
  };

  // React treats portal children as descendants for enter/leave, so moving onto the popup does not close it.
  return (
    <div className="shrink-0 snap-start" onMouseEnter={open} onMouseLeave={() => setAnchor(null)}>
      <Link to="/login" className="group flex flex-col gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion" aria-label={item.title}>
        <div ref={coverRef} className={cn("relative overflow-hidden rounded-lg bg-night", SIZE[orientation])}>
          {image ? <img src={image} alt={item.imageAlt} className="size-full object-cover" loading="lazy" decoding="async" /> : null}
          {progress !== undefined ? (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <span className="block h-full bg-vermilion" style={{ width: `${progress * 100}%` }} />
            </span>
          ) : null}
        </div>
        <div className={cn("flex flex-col", SIZE[orientation].split(" ")[0])}>
          <p className="truncate text-sm font-bold text-ink">{item.title}</p>
          <p className="truncate text-xs text-ink-soft">{caption ?? `${item.episodeCount} tập · ${item.duration}`}</p>
        </div>
      </Link>
      {anchor ? createPortal(<PodcastHoverCard item={item} image={popupImage} anchor={anchor} liked={liked} onToggleLike={() => setLiked((value) => !value)} />, document.body) : null}
    </div>
  );
}
