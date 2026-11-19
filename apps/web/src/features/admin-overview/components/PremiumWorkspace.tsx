import type { ReactNode } from "react";
import { premiumDestinations } from "./PremiumOverview";
import type { PremiumSection } from "../types";
import "../adminOverview.css";

export function PremiumWorkspace({ section, children }: { section: PremiumSection; children: ReactNode }): ReactNode {
  const destination = premiumDestinations.find(({ id }) => id === section);
  return <div className="admin-overview grid gap-6" data-admin-premium={section}>
    <header className="admin-overview-header"><div><h1>{destination?.label}</h1><p>{destination?.description}</p></div></header>
    {children}
  </div>;
}
