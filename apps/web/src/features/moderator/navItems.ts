import {
  Article,
  BookOpenText,
  CalendarBlank,
  ChartBar,
  CheckSquareOffset,
  ClipboardText,
  Headphones,
  MapTrifold,
  PencilSimpleLine,
  Ticket,
} from "@phosphor-icons/react";
import type { ShellNavItem } from "./components/ModeratorShell";
import { moderatorSectionPath } from "./paths";
import type { ModeratorSection } from "./types";

export function moderatorWorkspaceNav(activeSection: ModeratorSection): ShellNavItem[] {
  const link = (id: string, label: string, icon: ShellNavItem["icon"], section: ModeratorSection): ShellNavItem => ({
    id,
    label,
    icon,
    active: activeSection === section,
    to: moderatorSectionPath[section],
  });
  return [
    link("moderator-overview", "Tổng quan", ChartBar, "overview"),
    { id: "history-heading", label: "THƯ VIỆN LỊCH SỬ", active: false, groupStart: true },
    link("historical-timeline", "Dòng lịch sử", MapTrifold, "timeline"),
    link("historical-events", "Sự kiện", Article, "events"),
    link("historical-sources", "Nguồn tư liệu", BookOpenText, "sources"),
    { id: "podcast-heading", label: "SẢN XUẤT PODCAST", active: false, groupStart: true },
    link("podcast-production", "Sản xuất podcast", Headphones, "podcast"),
    link("moderator-assignments", "Nhiệm vụ của tôi", ClipboardText, "assignments"),
    link("moderator-tickets", "Ticket", Ticket, "tickets"),
    { id: "publishing-heading", label: "XUẤT BẢN", active: false, groupStart: true },
    link("moderator-pending", "Cần xử lý", CheckSquareOffset, "pending"),
    link("moderator-schedule", "Lịch phát hành", CalendarBlank, "schedule"),
    { id: "settings-heading", label: "CÀI ĐẶT", active: false, groupStart: true },
    link("moderator-angles", "Góc kể", PencilSimpleLine, "angles"),
  ];
}
