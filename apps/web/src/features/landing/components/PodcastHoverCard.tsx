import { Heart } from "@phosphor-icons/react/dist/icons/Heart";
import { Info } from "@phosphor-icons/react/dist/icons/Info";
import { Play } from "@phosphor-icons/react/dist/icons/Play";
import { motion } from "motion/react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { MagicCard } from "@/shared/components/ui/magic-card";
import { Button } from "@/shared/components/ui/button";
import { useReducedMotion } from "../hooks/useReducedMotion";
import type { PodcastItem } from "../types";

export function PodcastEpisodeHoverPreview({ title, description, image, duration, anchor, previewId, onPlay, onView, onClose, onPointerEnter, onPointerLeave }: { title: string; description: string; image?: string; duration: string; anchor: DOMRect; previewId: string; onPlay: () => void; onView?: () => void; onClose: () => void; onPointerEnter: () => void; onPointerLeave: (target: EventTarget | null) => void }) {
  const reducedMotion = useReducedMotion();
  const width = Math.min(anchor.width * 1.04, 480, window.innerWidth - 24);
  const left = Math.max(12, Math.min(anchor.left - (width - anchor.width) / 2, window.innerWidth - width - 12));
  // Reserve space for the compact copy; image height shrinks on short viewports.
  const imageHeight = image ? Math.max(0, Math.min(width * 9 / 16, window.innerHeight - 254)) : 0;
  const height = imageHeight + 230;
  const top = Math.max(12, Math.min(anchor.top - 8, window.innerHeight - height - 12));
  const summary = description.split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim();
  const excerpt = summary.length > 180 ? `${summary.slice(0, 177).replace(/\s+\S*$/, "")}…` : summary;
  return <div id={previewId} data-podcast-preview={previewId} role="region" aria-label={`Xem trước ${title}`} tabIndex={onView ? 0 : undefined}
    onClick={event => { if (!(event.target instanceof Element && event.target.closest("button"))) onView?.(); }}
    onPointerEnter={onPointerEnter} onPointerLeave={event => onPointerLeave(event.relatedTarget)}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } else if (event.target === event.currentTarget && onView && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onView(); } }}
    style={{ position: "fixed", left, top, width, cursor: onView ? "pointer" : undefined }} className="podcast-hover-preview z-50 rounded-2xl bg-paper-soft text-ink shadow-2xl focus-visible:outline-2 focus-visible:outline-vermilion">
    <motion.div initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : .24, ease: "easeOut" }}>
      <MagicCard mode="orb" glowFrom="var(--color-bronze)" glowTo="var(--color-paper-soft)" glowOpacity={reducedMotion ? 0 : .09} glowBlur={50} glowSize={260} gradientFrom="var(--color-bronze)" gradientTo="var(--color-paper-soft)" className="rounded-2xl [--color-background:var(--color-paper-soft)]">
        {image && <img src={image} alt="" style={{ height: imageHeight }} className="w-full object-cover" />}
        <div className="flex h-[230px] flex-col items-start gap-2 overflow-hidden p-4">
          <p className="shrink-0 text-xs text-bronze-dark">{duration}</p>
          <h4 className="line-clamp-2 shrink-0 text-base font-semibold leading-6">{title}</h4>
          <p className="line-clamp-3 text-sm leading-6 text-ink-soft">{excerpt}</p>
          <div className="relative z-20 mt-auto flex shrink-0 gap-2"><Button className="rounded-full bg-vermilion text-paper-soft hover:bg-vermilion-dark" onClick={onPlay}><Play weight="fill" aria-hidden="true" />Nghe podcast</Button></div>
        </div>
      </MagicCard>
    </motion.div>
  </div>;
}
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
      className="z-50 overflow-hidden rounded-lg bg-night text-paper-soft shadow-2xl"
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
