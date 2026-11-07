import type { ModeratorAssignmentSummary } from "./components/ModeratorAssignments";

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const DAY_MS = 24 * 60 * 60 * 1000;

export type ScheduleSession = "morning" | "afternoon" | "evening";
export type ScheduleTone = "primary" | "success" | "attention" | "danger" | "neutral";

export interface SchedulePresentationState {
  key: string;
  label: string;
  tone: ScheduleTone;
}

interface VietnamDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

const vietnamDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: VIETNAM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

function getVietnamDateParts(value: Date): VietnamDateParts {
  const parts = vietnamDateTimeFormatter.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((item) => item.type === type)?.value ?? 0);

  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
  };
}

function dateKeyFromParts({ year, month, day }: VietnamDateParts): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getVietnamDateKey(value: Date): string {
  return dateKeyFromParts(getVietnamDateParts(value));
}

export function getVietnamWeek(anchor: Date): Date[] {
  const { year, month, day } = getVietnamDateParts(anchor);
  const localCalendarDate = new Date(Date.UTC(year, month - 1, day));
  const mondayOffset = (localCalendarDate.getUTCDay() + 6) % 7;
  const monday = new Date(localCalendarDate.getTime() - mondayOffset * DAY_MS);

  return Array.from({ length: 7 }, (_, index) => new Date(monday.getTime() + index * DAY_MS));
}

export function getScheduleSession(value: Date): ScheduleSession {
  const { hour } = getVietnamDateParts(value);
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function getSchedulePresentationState(
  assignment: ModeratorAssignmentSummary,
  now: Date,
): SchedulePresentationState {
  if (assignment.status === "SCHEDULED") {
    const remaining = assignment.productionDeadline.getTime() - now.getTime();
    if (remaining < 0) return { key: "overdue", label: "Quá hạn sản xuất", tone: "danger" };
    if (remaining <= DAY_MS) return { key: "near-deadline", label: "Gần hạn sản xuất", tone: "attention" };
    return { key: "in-production", label: "Đang sản xuất", tone: "primary" };
  }

  const states: Record<string, SchedulePresentationState> = {
    READY_TO_PUBLISH: { key: "approved", label: "Đã duyệt", tone: "success" },
    PUBLISHING: { key: "publishing", label: "Đang phát hành", tone: "primary" },
    RELEASED: { key: "released", label: "Đã hoàn thành", tone: "success" },
    BLOCKED: { key: "blocked", label: "Cần xử lý", tone: "attention" },
    FAILED: { key: "failed", label: "Phát hành thất bại", tone: "danger" },
    CANCELLED: { key: "cancelled", label: "Đã hủy", tone: "neutral" },
  };

  return states[assignment.status] ?? { key: "unknown", label: assignment.status, tone: "neutral" };
}

export function groupAssignmentsByDate(
  assignments: readonly ModeratorAssignmentSummary[],
): Record<string, ModeratorAssignmentSummary[]> {
  const grouped: Record<string, ModeratorAssignmentSummary[]> = {};

  for (const assignment of assignments) {
    const key = getVietnamDateKey(assignment.scheduledAt);
    grouped[key] = [...(grouped[key] ?? []), assignment];
  }

  for (const items of Object.values(grouped)) {
    items.sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());
  }

  return grouped;
}
