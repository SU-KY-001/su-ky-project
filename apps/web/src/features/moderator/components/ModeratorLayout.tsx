import type { ReactNode } from "react";
import { moderatorWorkspaceNav } from "@/features/moderator/navItems";
import type { ModeratorSection } from "../types";
import { ModeratorShell } from "./ModeratorShell";

export function ModeratorLayout({ section, children }: { section: ModeratorSection; children: ReactNode }) {
  return <ModeratorShell nav={moderatorWorkspaceNav(section)}>{children}</ModeratorShell>;
}
