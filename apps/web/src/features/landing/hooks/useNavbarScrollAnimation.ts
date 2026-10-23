import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { gsap } from "gsap";



const NAVBAR_SCROLL_DISTANCE = 220;
const REDUCED_MOTION_THRESHOLD = NAVBAR_SCROLL_DISTANCE / 2;

const expandedNavbar = {
  width: "100%",
  maxWidth: "1248px",
  height: "76px",
  marginTop: "0px",
  borderRadius: "0px",
  borderWidth: "0px",
  borderColor: "transparent",
  backgroundColor: "rgba(250, 246, 237, 0)",
  boxShadow: "none",
};

const pillNavbar = {
  width: "100%",
  maxWidth: "1248px",
  height: "76px",
  marginTop: "0px",
  borderRadius: "18px",
  borderWidth: "1px",
  borderColor: "rgba(217, 205, 183, 0.8)",
  backgroundColor: "rgb(250, 246, 237)",
  boxShadow: "0 8px 28px rgba(28, 23, 20, 0.12)",
};

interface NavbarScrollAnimation {
  navbarRef: RefObject<HTMLDivElement | null>;
  isScrolled: boolean;
}

export function useNavbarScrollAnimation(reducedMotion: boolean, surface = false): NavbarScrollAnimation {
  const navbarRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(surface);

  useLayoutEffect(() => {
    const navbar = navbarRef.current;
    const page = navbar?.closest<HTMLElement>("#landing-page");
    if (!navbar || !page) return;
    const primaryTone = navbar.querySelectorAll<HTMLElement>("[data-navbar-tone='primary']");
    const secondaryTone = navbar.querySelectorAll<HTMLElement>("[data-navbar-tone='secondary']");
    let frame = 0;
    let timeline: gsap.core.Timeline;
    const context = gsap.context(() => {
      timeline = gsap.timeline({ paused: true });
      timeline.fromTo(navbar, expandedNavbar, { ...pillNavbar, duration: 1, ease: "none" }, 0);
      if (primaryTone.length) timeline.fromTo(primaryTone, { color: "#faf6ed" }, { color: "#1c1714", duration: 1, ease: "none" }, 0);
      if (secondaryTone.length) timeline.fromTo(secondaryTone, { color: "#e9dcc2" }, { color: "#5b4e44", duration: 1, ease: "none" }, 0);
    }, navbar);
    const update = (): void => {
      const scrolled = surface || page.scrollTop >= REDUCED_MOTION_THRESHOLD;
      const progress = surface ? 1 : reducedMotion ? Number(scrolled) : Math.min(1, Math.max(0, page.scrollTop / NAVBAR_SCROLL_DISTANCE));
      timeline.progress(progress);
      setIsScrolled(scrolled);
    };
    const onScroll = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    // Initialize from this page's own scroll position before the first paint.
    update();
    if (!surface) page.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      page.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      context.revert();
    };
  }, [reducedMotion, surface]);

  return { navbarRef, isScrolled };
}