import { Outlet, useLocation } from "react-router";
import { moderatorWorkspaceNav } from "@/features/moderator/navItems";
import { ModeratorShell } from "./ModeratorShell";

export function ModeratorLayout() {
  const location = useLocation();

  return (
    <ModeratorShell nav={moderatorWorkspaceNav(`${location.pathname}${location.search}`)}>
      <Outlet />
    </ModeratorShell>
  );
}
