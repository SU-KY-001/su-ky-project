import type { ReactNode } from "react";
import { moderatorWorkspaceNav } from "@/features/moderator/navItems";
import type { ModeratorSection } from "../types";
import { ModeratorShell } from "./ModeratorShell";

export function ModeratorLayout({ section, onSelect, children }: { section: ModeratorSection; onSelect: (section: ModeratorSection) => void; children: ReactNode }) {
  return (
    <ModeratorShell nav={moderatorWorkspaceNav(section, onSelect)}>
      {children}
    </ModeratorShell>
  );
}
