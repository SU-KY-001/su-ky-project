import { Play } from "@phosphor-icons/react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { ShineBorder } from "@/shared/components/ui/shine-border";
import type { CardOrientation, PodcastItem } from "../types";

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

export function PodcastCard({ item, orientation = "portrait", progress, caption }: PodcastCardProps) {
  const image = orientation === "portrait" ? item.portraitImage ?? item.landscapeImage : item.landscapeImage ?? item.portraitImage;

  return (
    <Link to="/login" className="group relative flex shrink-0 snap-start items-end gap-1" aria-label={item.title}>
      <div className="flex flex-col gap-2">
        <div className={cn("relative overflow-hidden rounded-lg bg-night", SIZE[orientation])}>
          {image ? <img src={image} alt={item.imageAlt} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" /> : null}
          <span className="absolute inset-0 grid place-items-center bg-night/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Play size={32} weight="fill" className="text-paper-soft" aria-hidden="true" />
          </span>
          {progress !== undefined ? (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <span className="block h-full bg-vermilion" style={{ width: `${progress * 100}%` }} />
            </span>
          ) : null}
          <ShineBorder borderWidth={2} duration={6} shineColor={["var(--color-vermilion)", "var(--color-bronze)"]} className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        </div>
        <div className={cn("flex flex-col", SIZE[orientation].split(" ")[0])}>
          <p className="truncate text-sm font-bold text-ink">{item.title}</p>
          <p className="truncate text-xs text-ink-soft">{caption ?? `${item.episodeCount} tập · ${item.duration}`}</p>
        </div>
      </div>
    </Link>
  );
}
