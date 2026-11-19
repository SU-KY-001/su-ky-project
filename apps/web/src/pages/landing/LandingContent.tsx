import { useEffect } from "react";
import { useLocation } from "react-router";
import { LandingFooter, LandingShowcase, scrollToLandingTarget } from "@/features/landing";
import { MembershipOffer } from "@/features/membership";

export function LandingContent() {
  const { hash, search } = useLocation();
  useEffect(() => {
    const id = hash.slice(1);
    if (!id) return undefined;
    const frame = requestAnimationFrame(() => scrollToLandingTarget(id));
    return () => cancelAnimationFrame(frame);
  }, [hash, search]);
  return <><LandingShowcase /><MembershipOffer /></>;
}

export function LandingFooterContent() {
  return <LandingFooter />;
}
