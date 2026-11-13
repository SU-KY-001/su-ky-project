import { useEffect } from "react";
import { useLocation } from "react-router";
import { LandingFooter } from "../../features/landing/components/LandingFooter";
import { LandingShowcase } from "../../features/landing/components/LandingShowcase";
import { scrollToLandingTarget } from "../../features/landing/hooks/useLandingMotion";

export function LandingContent() {
  const { hash, search } = useLocation();
  useEffect(() => {
    const id = hash.slice(1);
    if (!id) return undefined;
    const frame = requestAnimationFrame(() => scrollToLandingTarget(id));
    return () => cancelAnimationFrame(frame);
  }, [hash, search]);
  return <LandingShowcase />;
}

export function LandingFooterContent() {
  return <LandingFooter />;
}
