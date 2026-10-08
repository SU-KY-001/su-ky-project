import { useLayoutEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "./useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

interface StickyHeaderState {
  headerRef: RefObject<HTMLDivElement | null>;
}

export function useStickyHeader(): StickyHeaderState {
  const headerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const header = headerRef.current;
    const hero = document.getElementById("hero");
    if (!header || !hero) return undefined;

    const expandedStyle = {
      height: 56,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(244,236,220,.14)",
      backgroundColor: "rgba(20,17,15,.42)",
      boxShadow: "0 8px 24px rgba(20,17,15,.12)",
    };
    const collapsedStyle = {
      height: 52,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "rgba(244,236,220,.18)",
      backgroundColor: "rgba(20,17,15,.96)",
      boxShadow: "0 8px 24px rgba(20,17,15,.2)",
    };

    if (reducedMotion) {
      const updateFromPosition = (): void => {
        gsap.set(header, window.scrollY >= 48 ? collapsedStyle : expandedStyle);
      };
      updateFromPosition();
      window.addEventListener("scroll", updateFromPosition, { passive: true });
      return () => window.removeEventListener("scroll", updateFromPosition);
    }

    const tween = gsap.fromTo(header, expandedStyle, {
      ...collapsedStyle,
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "+=96",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(header, { clearProps: "height,borderRadius,borderWidth,borderColor,backgroundColor,boxShadow" });
    };
  }, [reducedMotion]);

  return { headerRef };
}
