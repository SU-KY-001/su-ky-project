import { FileText, SquaresFour } from "@phosphor-icons/react";
import type { ShellNavItem } from "./components/ModeratorShell";

export const MODERATOR_DASHBOARD_PATH = "/moderator";
export const SCRIPT_WORKFLOWS_PATH = "/moderator/script-workflows";

export function scriptWorkflowNavItem(active: boolean): ShellNavItem {
  return { id: "script-workflows", label: "Kịch bản", icon: FileText, active, to: SCRIPT_WORKFLOWS_PATH };
}

/** Navigation for moderator pages that are not the dashboard. */
export function scriptWorkflowPageNav(): ShellNavItem[] {
  return [
    { id: "overview", label: "Tổng quan", icon: SquaresFour, active: false, to: MODERATOR_DASHBOARD_PATH },
    scriptWorkflowNavItem(true),
  ];
}
