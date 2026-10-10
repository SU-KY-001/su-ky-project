import { useLayoutEffect } from "react";
import { CitationsSection } from "../../features/landing/components/CitationsSection";
import { DiscoverySection } from "../../features/landing/components/DiscoverySection";
import { FeaturedSeries } from "../../features/landing/components/FeaturedSeries";
import { GlobalTimeline } from "../../features/landing/components/GlobalTimeline";
import { LandingFooter } from "../../features/landing/components/LandingFooter";
import { LearningSection } from "../../features/landing/components/LearningSection";
import { NarrativeDemo } from "../../features/landing/components/NarrativeDemo";
import { revealLandingSections } from "../../features/landing/hooks/useLandingMotion";

export function LandingContent() {
  useLayoutEffect(() => {
    const root = document.getElementById("landing-content");
    return root ? revealLandingSections(root) : undefined;
  }, []);

  return (
    <div id="landing-content">
      <GlobalTimeline />
      <NarrativeDemo />
      <FeaturedSeries />
      <DiscoverySection />
      <LearningSection />
      <CitationsSection />
    </div>
  );
}

export function LandingFooterContent() {
  return <LandingFooter />;
}
