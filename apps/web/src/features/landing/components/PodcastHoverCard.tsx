import { Heart, Info, Play } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "../hooks/useReducedMotion";
import type { PodcastItem } from "../types";

export const HOVER_CARD_WIDTH = 368;
const VIEWPORT_MARGIN = 8;
const OPEN_DURATION_S = 0.12;

interface PodcastHoverCardProps {
  item: PodcastItem;
  image?: string;
  /** Viewport rect of the card cover this popup is anchored to. */
  anchor: DOMRect;
  liked: boolean;
  onToggleLike: () => void;
}

const actionClass = "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-semibold transition-colors";

export function PodcastHoverCard({ item, image, anchor, liked, onToggleLike }: PodcastHoverCardProps) {
  const reducedMotion = useReducedMotion();
  const centerX = anchor.left + anchor.width / 2;
  const left = Math.min(Math.max(centerX - HOVER_CARD_WIDTH / 2, VIEWPORT_MARGIN), window.innerWidth - HOVER_CARD_WIDTH - VIEWPORT_MARGIN);
  // Document coordinates so the popup scrolls with the page instead of drifting from its card.
  const top = anchor.top + window.scrollY - VIEWPORT_MARGIN;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : OPEN_DURATION_S, ease: "easeOut" }}
      style={{ position: "absolute", left, top, width: HOVER_CARD_WIDTH }}
      className="z-50 overflow-hidden rounded-lg border-2 border-vermilion bg-night text-paper-soft shadow-2xl"
    >
      <div className="relative aspect-video w-full bg-night">
        {image ? <img src={image} alt={item.imageAlt} className="size-full object-cover" decoding="async" /> : null}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-night to-transparent" />
      </div>
      <div className="flex flex-col gap-3 p-4 pt-2">
        <div className="flex flex-col gap-0.5">
          <p className="truncate text-base font-bold">{item.title}</p>
          <p className="truncate text-sm font-semibold text-bronze">{item.period}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className={cn(actionClass, "flex-1 border-vermilion bg-vermilion text-paper-soft hover:bg-vermilion-dark")}>
            <Play size={16} weight="fill" aria-hidden="true" />
            Nghe ngay
          </Link>
          <button type="button" onClick={onToggleLike} aria-pressed={liked} aria-label={liked ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"} className={cn(actionClass, "border-white/30 hover:bg-white/10", liked && "text-bronze")}>
            <Heart size={16} weight={liked ? "fill" : "bold"} aria-hidden="true" />
            Thích
          </button>
          <Link to="/login" className={cn(actionClass, "border-white/30 hover:bg-white/10")}>
            <Info size={16} weight="bold" aria-hidden="true" />
            Chi tiết
          </Link>
        </div>
        <ul className="flex flex-wrap gap-2 text-xs">
          {[`${item.episodeCount} tập`, item.duration].map((chip) => (
            <li key={chip} className="rounded bg-white/10 px-2 py-1">{chip}</li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
