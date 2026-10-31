import { useEffect } from "react";
import { LandingFooter } from "../../features/landing/components/LandingFooter";
import { LandingShowcase } from "../../features/landing/components/LandingShowcase";
import { scrollToLandingTarget } from "../../features/landing/hooks/useLandingMotion";

export function LandingContent() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return undefined;
    const frame = requestAnimationFrame(() => scrollToLandingTarget(id));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <LandingShowcase />;
}

export function LandingFooterContent() {
  return <LandingFooter />;
}
