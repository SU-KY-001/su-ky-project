import type { ReactNode, ReactElement } from "react";
import { LightRays } from "@/shared/components/ui/light-rays";
import { useLandingMotion } from "../hooks/useLandingMotion";
import { LandingHeader } from "./LandingHeader";
import { LandingFooter } from "./LandingFooter";

export function LandingPageShell({ children, surface = false, footer = <LandingFooter /> }: { children: ReactNode; surface?: boolean; footer?: ReactNode }): ReactElement {
  useLandingMotion();
  return <div id="landing-page" className="landing-scroll-area relative isolate bg-paper">
    <div id="landing-content" className="relative z-10"><LandingHeader surface={surface} />{children}{footer}</div>
    <LightRays className="fixed inset-0 z-0 opacity-70" count={6} color="color-mix(in srgb, var(--color-bronze) 24%, transparent)" blur={52} speed={22} length="110vh" />
  </div>;
}
