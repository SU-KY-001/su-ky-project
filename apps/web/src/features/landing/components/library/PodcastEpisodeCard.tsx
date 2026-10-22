import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import type { LibraryChapter } from "@repo/shared";
import { Clock, Image as ImageIcon, Play } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { PodcastEpisodeHoverPreview } from "../PodcastHoverCard";

export function PodcastEpisodeCard({ episode, selected, onPlay, onView, hoverPreview = false }: { episode: LibraryChapter; selected: boolean; onPlay: (episode: LibraryChapter) => void; onView?: (episode: LibraryChapter) => void; hoverPreview?: boolean }): ReactElement {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const previewId = useId();
  const cover = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  function keepOpen(): void { clearTimeout(closeTimer.current); }
  function close(): void { clearTimeout(timer.current); clearTimeout(closeTimer.current); setAnchor(null); }
  function isInside(target: EventTarget | null): boolean {
    return target instanceof Node && (Boolean(card.current?.contains(target)) || Boolean(document.getElementById(previewId)?.contains(target)));
  }
  function leave(target: EventTarget | null): void {
    if (isInside(target)) return;
    clearTimeout(timer.current);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setAnchor(null), 220);
  }
  function open(keyboard = false): void {
    if (!hoverPreview || (!keyboard && !window.matchMedia("(hover: hover) and (pointer: fine)").matches)) return;
    keepOpen();
    if (anchor) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (cover.current) setAnchor(cover.current.getBoundingClientRect()); }, 500);
  }
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(closeTimer.current); }, []);
  useEffect(() => {
    if (!anchor) return;
    const dismiss = (event: Event): void => {
      if (event.target instanceof Element && event.target.closest("[data-podcast-preview]")) return;
      close();
    };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("blur", dismiss);
    return () => { window.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", dismiss); window.removeEventListener("blur", dismiss); };
  }, [anchor]);
  const poster = episode.poster?.url;
  const narration = episode.narrations.find(item => item.available && item.type === "THIRD_PERSON") ?? episode.narrations.find(item => item.available);
  const seconds = narration?.durationMs ? Math.ceil(narration.durationMs / 1000) : null;
  const duration = seconds === null ? "Chưa có thời lượng" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return <article ref={card} className="podcast-poster-card" data-selected={selected} data-preview-open={Boolean(anchor)} onPointerEnter={event => { if (event.pointerType !== "touch") open(); }} onPointerLeave={event => leave(event.relatedTarget)}
    onFocus={event => { if (hoverPreview && !event.currentTarget.contains(event.relatedTarget) && cover.current?.matches(":focus-visible")) open(true); }}
    onBlur={event => { if (!isInside(event.relatedTarget)) close(); }}>
    <div className="podcast-poster-media"><Button ref={cover} variant="ghost" className="podcast-poster-button" aria-label={`${onView ? "Xem thông tin" : "Chọn nghe"} ${episode.title}`} aria-controls={anchor ? previewId : undefined} onKeyDown={event => { if (event.key === "Escape") close(); }} onClick={() => { close(); if (onView) onView(episode); else onPlay(episode); }}>
      {poster && failedSrc !== poster ? <img src={poster} alt={`Poster ${episode.title}`} loading="lazy" decoding="async" onError={() => setFailedSrc(poster)} /> : <span className="podcast-poster-fallback"><ImageIcon size={42} weight="light" aria-hidden="true" /><span>Chưa có poster</span></span>}
      <span className="podcast-duration-badge" aria-label={`Thời lượng: ${duration}`}><Clock aria-hidden="true" />{duration}</span>
    </Button>
    <Button variant="ghost" size="icon" className="podcast-poster-play" aria-label={`Nghe podcast ${episode.title}`} onClick={() => { close(); onPlay(episode); }}><Play weight="fill" aria-hidden="true" /></Button></div>
    <div className="podcast-poster-copy"><h4>{episode.title}</h4><p className="podcast-poster-description">{episode.description?.trim() || "Mô tả đang được bổ sung."}</p>{!narration && <p className="mt-3 text-xs text-ink-soft">Bản thu đang chuẩn bị</p>}</div>
    {anchor && createPortal(<PodcastEpisodeHoverPreview previewId={previewId} title={episode.title} description={episode.description?.trim() || "Mô tả đang được bổ sung."} image={poster && failedSrc !== poster ? poster : undefined} duration={duration} anchor={anchor} onPointerEnter={keepOpen} onPointerLeave={leave} onPlay={() => { close(); onPlay(episode); }} onView={onView ? () => { close(); onView(episode); } : undefined} onClose={() => { cover.current?.focus(); close(); }} />, document.body)}
  </article>;
}
