import {
  Article,
  BookOpenText,
  CalendarBlank,
  CheckSquareOffset,
  Headphones,
  MapTrifold,
} from "@phosphor-icons/react";
import type { ShellNavItem } from "./components/ModeratorShell";

export const MODERATOR_DASHBOARD_PATH = "/moderator";
export const SCRIPT_WORKFLOWS_PATH = "/moderator/script-workflows";
export const PODCAST_PRODUCTION_PATH = "/moderator/podcast";
export const HISTORICAL_TIMELINE_PATH = "/moderator/timeline";
export const HISTORICAL_EVENTS_PATH = "/moderator/events";
export const HISTORICAL_SOURCES_PATH = "/moderator/sources";
export const MODERATOR_PENDING_PATH = "/moderator/pending";
export const MODERATOR_SCHEDULE_PATH = "/moderator/schedule";

function isActivePath(path: string, activePath: string): boolean {
  const pathname = activePath.split("?", 1)[0];
  return path === pathname || (path !== HISTORICAL_TIMELINE_PATH && pathname.startsWith(`${path}/`));
}

export function moderatorWorkspaceNav(activePath: string): ShellNavItem[] {
  const pathname = activePath.split("?", 1)[0];
  const timelineActive = pathname === MODERATOR_DASHBOARD_PATH || isActivePath(HISTORICAL_TIMELINE_PATH, activePath);
  return [
    { id: "history-heading", label: "THƯ VIỆN LỊCH SỬ", active: false, groupStart: true },
    {
      id: "historical-timeline",
      label: "Dòng lịch sử",
      icon: MapTrifold,
      active: timelineActive,
      to: HISTORICAL_TIMELINE_PATH,
    },
    { id: "historical-events", label: "Sự kiện", icon: Article, active: isActivePath(HISTORICAL_EVENTS_PATH, activePath), to: HISTORICAL_EVENTS_PATH },
    { id: "historical-sources", label: "Nguồn tư liệu", icon: BookOpenText, active: activePath === HISTORICAL_SOURCES_PATH, to: HISTORICAL_SOURCES_PATH },
    { id: "podcast-heading", label: "SẢN XUẤT PODCAST", active: false, groupStart: true },
    { id: "podcast-production", label: "Sản xuất podcast", icon: Headphones, active: isActivePath(PODCAST_PRODUCTION_PATH, activePath) || isActivePath(SCRIPT_WORKFLOWS_PATH, activePath), to: PODCAST_PRODUCTION_PATH },
    { id: "publishing-heading", label: "XUẤT BẢN", active: false, groupStart: true },
    { id: "moderator-pending", label: "Cần xử lý", icon: CheckSquareOffset, active: activePath === MODERATOR_PENDING_PATH, to: MODERATOR_PENDING_PATH },
    { id: "moderator-schedule", label: "Lịch phát hành", icon: CalendarBlank, active: activePath === MODERATOR_SCHEDULE_PATH, to: MODERATOR_SCHEDULE_PATH },
  ];
}
