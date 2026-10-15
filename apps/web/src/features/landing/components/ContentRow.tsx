import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface ContentRowProps extends PropsWithChildren {
  id: string;
  title: string;
}

/** Fraction of the visible width scrolled per arrow click, so the last visible card stays as context. */
const PAGE_RATIO = 0.85;

const arrowClass = "absolute top-1/3 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper-soft/95 text-ink shadow-md transition hover:bg-paper-soft focus-visible:ring-2 focus-visible:ring-vermilion md:grid";

// role/aria-labelledby keeps the existing section reveal animation working.
export function ContentRow({ id, title, children }: ContentRowProps) {
  const track = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [edge, setEdge] = useState({ start: true, end: true });

  const updateEdge = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    updateEdge();
    const observer = new ResizeObserver(updateEdge);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateEdge]);

  const page = (direction: 1 | -1): void => {
    const el = track.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * PAGE_RATIO, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <section role="region" id={id} aria-labelledby={`${id}-heading`} className="w-full px-5 py-6 md:px-7 md:py-8">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
        <h2 id={`${id}-heading`} className="font-serif text-2xl font-bold text-ink md:text-3xl">{title}</h2>
        <div className="group/row relative">
          <div
            ref={track}
            onScroll={updateEdge}
            className="flex snap-x gap-4 overflow-x-auto overflow-y-hidden pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {children}
          </div>
          <button type="button" aria-label={`Cuộn trái: ${title}`} onClick={() => page(-1)} className={cn(arrowClass, "-left-5", edge.start && "pointer-events-none opacity-0")}>
            <CaretLeft size={20} weight="bold" aria-hidden="true" />
          </button>
          <button type="button" aria-label={`Cuộn phải: ${title}`} onClick={() => page(1)} className={cn(arrowClass, "-right-5", edge.end && "pointer-events-none opacity-0")}>
            <CaretRight size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
