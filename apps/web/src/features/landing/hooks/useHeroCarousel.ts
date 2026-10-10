import { useCallback, useState } from "react";
import type { HeroSlide } from "../types";

interface HeroCarouselState {
  activeIndex: number;
  direction: 1 | -1;
  goTo: (index: number) => void;
  next: () => void;
  previous: () => void;
}

export function useHeroCarousel(slides: HeroSlide[]): HeroCarouselState {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const goTo = useCallback((index: number): void => {
    const target = ((index % slides.length) + slides.length) % slides.length;
    if (target === activeIndex) return;
    const forwardDistance = (target - activeIndex + slides.length) % slides.length;
    setDirection(forwardDistance <= slides.length / 2 ? 1 : -1);
    setActiveIndex(target);
  }, [activeIndex, slides.length]);
  const next = useCallback((): void => {
    setDirection(1);
    setActiveIndex((current) => (current + 1) % slides.length);
  }, [slides.length]);
  const previous = useCallback((): void => {
    setDirection(-1);
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  }, [slides.length]);

  return {
    activeIndex,
    direction,
    goTo,
    next,
    previous,
  };
}
