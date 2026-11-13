import type { ReactElement } from "react";
import { LandingLoader } from "@/features/landing/components/LandingLoader";

export function LandingLoadingPage(): ReactElement {
  return <main className="grid h-dvh place-items-center bg-paper p-6"><LandingLoader /></main>;
}
