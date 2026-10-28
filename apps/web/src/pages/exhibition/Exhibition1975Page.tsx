import { useLayoutEffect, type ReactElement } from "react";
import { ExhibitionExperience } from "@/features/exhibition";

export function Exhibition1975Page(): ReactElement {
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, []);
  return <ExhibitionExperience />;
}
