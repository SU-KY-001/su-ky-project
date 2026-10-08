import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

export function useNavbarScrollAnimation(reducedMotion: boolean): NavbarScrollAnimation {
  const navbarRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(() =>
    typeof window !== "undefined" && window.scrollY >= REDUCED_MOTION_THRESHOLD,
  );

  useLayoutEffect(() => {
    const navbar = navbarRef.current;
    const hero = document.getElementById("hero");
    if (!navbar || !hero) return undefined;
    const primaryTone = navbar.querySelectorAll<HTMLElement>("[data-navbar-tone='primary']");
    const secondaryTone = navbar.querySelectorAll<HTMLElement>("[data-navbar-tone='secondary']");

    const setTone = (scrolled: boolean): void => {
      gsap.set(primaryTone, { color: scrolled ? "#1c1714" : "#faf6ed" });
      gsap.set(secondaryTone, { color: scrolled ? "#5b4e44" : "#e9dcc2" });
    };

    if (reducedMotion) {
      const updateNavbar = (): void => {
        const nextIsScrolled = window.scrollY >= REDUCED_MOTION_THRESHOLD;
        gsap.set(navbar, nextIsScrolled ? pillNavbar : expandedNavbar);
        setTone(nextIsScrolled);
        setIsScrolled((current) => current === nextIsScrolled ? current : nextIsScrolled);
      };

      updateNavbar();
      window.addEventListener("scroll", updateNavbar, { passive: true });
      return () => {
        window.removeEventListener("scroll", updateNavbar);
        gsap.set(navbar, { clearProps: "all" });
      };
    }

    let previousToneState: boolean | null = null;
    const updateTone = (progress: number): void => {
      const nextIsScrolled = progress >= 0.5;
      if (previousToneState === nextIsScrolled) return;
      previousToneState = nextIsScrolled;
      setIsScrolled(nextIsScrolled);
    };

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: `+=${NAVBAR_SCROLL_DISTANCE}`,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => updateTone(self.progress),
          onRefresh: (self) => updateTone(self.progress),
        },
      });

      timeline.fromTo(navbar, expandedNavbar, { ...pillNavbar, ease: "none" }, 0);
      timeline.fromTo(primaryTone, { color: "#faf6ed" }, { color: "#1c1714", ease: "none" }, 0);
      timeline.fromTo(secondaryTone, { color: "#e9dcc2" }, { color: "#5b4e44", ease: "none" }, 0);
    }, navbar);

    return () => context.revert();
  }, [reducedMotion]);

  return { navbarRef, isScrolled };
}
