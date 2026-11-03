import { Article } from "@phosphor-icons/react/dist/icons/Article";
import { BookOpenText } from "@phosphor-icons/react/dist/icons/BookOpenText";
import { CalendarBlank } from "@phosphor-icons/react/dist/icons/CalendarBlank";
import { ChartBar } from "@phosphor-icons/react/dist/icons/ChartBar";
import { ClipboardText } from "@phosphor-icons/react/dist/icons/ClipboardText";
import { Headphones } from "@phosphor-icons/react/dist/icons/Headphones";
import { MapTrifold } from "@phosphor-icons/react/dist/icons/MapTrifold";
import { PencilSimpleLine } from "@phosphor-icons/react/dist/icons/PencilSimpleLine";
import { Ticket } from "@phosphor-icons/react/dist/icons/Ticket";
import { Exam } from "@phosphor-icons/react/dist/icons/Exam";
import { Cube } from "@phosphor-icons/react/dist/icons/Cube";
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
    link("moderator-exhibitions", "Triển lãm 3D", Cube, "exhibitions"),
    { id: "publishing-heading", label: "XUẤT BẢN", active: false, groupStart: true },
    link("moderator-assignments", "Nhiệm vụ của tôi", ClipboardText, "assignments"),
    link("moderator-schedule", "Lịch phát hành", CalendarBlank, "schedule"),
    link("moderator-tickets", "Ticket", Ticket, "tickets"),
    { id: "quiz-heading", label: "QUIZ", active: false, groupStart: true },
    link("moderator-quizzes", "Tạo Quiz", Exam, "quizzes"),
    { id: "settings-heading", label: "CÀI ĐẶT", active: false, groupStart: true },
    link("moderator-angles", "Góc kể", PencilSimpleLine, "angles"),
  ];
}
