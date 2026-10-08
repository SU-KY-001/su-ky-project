import { useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useReducedMotion } from "./useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

let activeLenis: Lenis | null = null;

export function scrollToLandingTarget(targetId: string): void {
  const target = document.getElementById(targetId);
  if (!target) return;

  if (activeLenis) {
    activeLenis.scrollTo(target, { duration: 1.35, offset: -8 });
    return;
  }

  target.scrollIntoView({ behavior: "auto", block: "start" });
}

export function revealLandingSections(root: Element): () => void {
  if (window.location.hash || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => undefined;
  }

  const context = gsap.context(() => {
    root.querySelectorAll<HTMLElement>("[role='region'][aria-labelledby]").forEach((element) => {
      gsap.fromTo(element, { y: 28, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: element, start: "top 86%", once: true },
      });
    });
  }, root);

  return () => context.revert();
}

export function useLandingMotion(): void {
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const page = document.getElementById("landing-page");
    if (!page) return undefined;

    if (reducedMotion) return undefined;

    const lenis = new Lenis({
      duration: 1.45,
      smoothWheel: true,
      syncTouch: false,
      respectReducedMotion: true,
    });
    activeLenis = lenis;
    const unsubscribeScroll = lenis.on("scroll", ScrollTrigger.update);
    const updateLenis = (time: number): void => lenis.raf(time * 1000);
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.add(updateLenis);

    const cleanupSectionReveals = revealLandingSections(page);

    return () => {
      cleanupSectionReveals();
      gsap.ticker.remove(updateLenis);
      gsap.ticker.lagSmoothing(500, 33);
      unsubscribeScroll();
      lenis.destroy();
      if (activeLenis === lenis) activeLenis = null;
    };
  }, [reducedMotion]);
}
