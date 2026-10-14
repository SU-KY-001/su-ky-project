import {
  Article,
  BookOpenText,
  CalendarBlank,
  CheckSquareOffset,
  ChartBar,
  Headphones,
  MapTrifold,
} from "@phosphor-icons/react";
import type { ShellNavItem } from "./components/ModeratorShell";
import type { ModeratorSection } from "./types";

export function moderatorWorkspaceNav(activeSection: ModeratorSection, onSelect: (section: ModeratorSection) => void): ShellNavItem[] {
  return [
    { id: "moderator-overview", label: "Tổng quan", icon: ChartBar, active: activeSection === "overview", onSelect: () => onSelect("overview") },
    { id: "history-heading", label: "THƯ VIỆN LỊCH SỬ", active: false, groupStart: true },
    {
      id: "historical-timeline",
      label: "Dòng lịch sử",
      icon: MapTrifold,
      active: activeSection === "timeline",
      onSelect: () => onSelect("timeline"),
    },
    { id: "historical-events", label: "Sự kiện", icon: Article, active: activeSection === "events", onSelect: () => onSelect("events") },
    { id: "historical-sources", label: "Nguồn tư liệu", icon: BookOpenText, active: activeSection === "sources", onSelect: () => onSelect("sources") },
    { id: "podcast-heading", label: "SẢN XUẤT PODCAST", active: false, groupStart: true },
    { id: "podcast-production", label: "Sản xuất podcast", icon: Headphones, active: activeSection === "podcast", onSelect: () => onSelect("podcast") },
    { id: "publishing-heading", label: "XUẤT BẢN", active: false, groupStart: true },
    { id: "moderator-pending", label: "Cần xử lý", icon: CheckSquareOffset, active: activeSection === "pending", onSelect: () => onSelect("pending") },
    { id: "moderator-schedule", label: "Lịch phát hành", icon: CalendarBlank, active: activeSection === "schedule", onSelect: () => onSelect("schedule") },
  ];
}
