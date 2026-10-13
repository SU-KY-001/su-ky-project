import { useLayoutEffect } from "react";
import { LandingFooter } from "../../features/landing/components/LandingFooter";
import { CommunityBento } from "../../features/landing/components/CommunityBento";
import { LandingShowcase } from "../../features/landing/components/LandingShowcase";
import { revealLandingSections } from "../../features/landing/hooks/useLandingMotion";

export function LandingContent() {
  useLayoutEffect(() => {
    const root = document.getElementById("landing-content");
    return root ? revealLandingSections(root) : undefined;
  }, []);

  return (
    <div id="landing-content">
      <LandingShowcase />
      <CommunityBento />
    </div>
  );
}

export function LandingFooterContent() {
  return <LandingFooter />;
}
