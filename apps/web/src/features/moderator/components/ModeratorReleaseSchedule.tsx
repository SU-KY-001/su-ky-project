import { Fragment, useState, type ReactElement } from "react";
import {
  Broadcast,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  CheckCircle,
  ClockCountdown,
  GridFour,
  ListBullets,
  Prohibit,
  Ticket,
  WarningCircle,
  XCircle,
  type Icon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { DayButtonProps } from "react-day-picker";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { cn } from "@/lib/utils";
import {
  getSchedulePresentationState,
  getScheduleSession,
  getVietnamDateKey,
  getVietnamWeek,
  groupAssignmentsByDate,
  type SchedulePresentationState,
  type ScheduleSession,
  type ScheduleTone,
} from "../moderatorScheduleModel";
import { moderatorReleaseService } from "../services/moderatorReleaseService";
import type { ModeratorAssignmentSummary } from "./ModeratorAssignments";

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const DAY_MS = 24 * 60 * 60 * 1000;

const sessions: Array<{ id: ScheduleSession; label: string; time: string }> = [
  { id: "morning", label: "Buổi sáng", time: "00:00 - 11:59" },
  { id: "afternoon", label: "Buổi chiều", time: "12:00 - 17:59" },
  { id: "evening", label: "Buổi tối", time: "18:00 - 23:59" },
];

const statusIcon: Record<string, Icon> = {
  approved: CheckCircle,
  released: CheckCircle,
  publishing: Broadcast,
  blocked: WarningCircle,
  "near-deadline": WarningCircle,
  overdue: WarningCircle,
  failed: XCircle,
  cancelled: Prohibit,
  "in-production": ClockCountdown,
  unknown: ClockCountdown,
};

const toneClass: Record<ScheduleTone, { card: string; badge: string; marker: string }> = {
  primary: {
    card: "bg-[color-mix(in_srgb,var(--modPrimary)_7%,var(--modSurface))]",
    badge: "bg-[color-mix(in_srgb,var(--modPrimary)_12%,transparent)] text-mod-primary",
    marker: "[&>button]:border-mod-primary/35 [&>button]:bg-[color-mix(in_srgb,var(--modPrimary)_9%,var(--modSurface))] [&>button]:text-mod-primary",
  },
  success: {
    card: "bg-[color-mix(in_srgb,var(--modSuccess)_8%,var(--modSurface))]",
    badge: "bg-[color-mix(in_srgb,var(--modSuccess)_13%,transparent)] text-mod-success",
    marker: "[&>button]:border-mod-success/35 [&>button]:bg-[color-mix(in_srgb,var(--modSuccess)_10%,var(--modSurface))] [&>button]:text-mod-success",
  },
  attention: {
    card: "bg-[color-mix(in_srgb,var(--modAttention)_9%,var(--modSurface))]",
    badge: "bg-[color-mix(in_srgb,var(--modAttention)_15%,transparent)] text-mod-attention",
    marker: "[&>button]:border-mod-attention/35 [&>button]:bg-[color-mix(in_srgb,var(--modAttention)_12%,var(--modSurface))] [&>button]:text-mod-attention",
  },
  danger: {
    card: "bg-[color-mix(in_srgb,var(--modDanger)_7%,var(--modSurface))]",
    badge: "bg-[color-mix(in_srgb,var(--modDanger)_12%,transparent)] text-mod-danger",
    marker: "[&>button]:border-mod-danger/35 [&>button]:bg-[color-mix(in_srgb,var(--modDanger)_9%,var(--modSurface))] [&>button]:text-mod-danger",
  },
  neutral: {
    card: "bg-mod-canvas-accent",
    badge: "bg-[color-mix(in_srgb,var(--modTextMuted)_10%,transparent)] text-mod-text-muted",
    marker: "[&>button]:border-mod-text-low/40 [&>button]:bg-mod-canvas-accent [&>button]:text-mod-text-secondary",
  },
};

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dayLabelFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  weekday: "long",
});

const dayNumberFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  day: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("vi-VN", {
  month: "long",
  year: "numeric",
});

function calendarDateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year!, month! - 1, day!, 12);
}

function calendarDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function statusForAssignment(
  assignment: ModeratorAssignmentSummary,
  now: Date,
): SchedulePresentationState {
  return getSchedulePresentationState(assignment, now);
}

function ScheduleStatusIcon({ state }: { state: SchedulePresentationState }): ReactElement {
  const StatusIcon = statusIcon[state.key] ?? ClockCountdown;
  return <StatusIcon size={14} weight="bold" aria-hidden="true" />;
}

function ScheduleCard({
  assignment,
  now,
  compact = false,
}: {
  assignment: ModeratorAssignmentSummary;
  now: Date;
  compact?: boolean;
}): ReactElement {
  const state = statusForAssignment(assignment, now);
  const classes = toneClass[state.tone];

  return (
    <Card
      data-schedule-id={assignment.id}
      data-tone={state.tone}
      className={cn(
        "gap-0 rounded-[14px] border border-mod-border/60 py-0 shadow-[0_8px_20px_color-mix(in_srgb,var(--modText)_7%,transparent)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_color-mix(in_srgb,var(--modText)_10%,transparent)] motion-reduce:transform-none motion-reduce:transition-none",
        classes.card,
      )}
    >
      <CardContent className={cn("px-3.5 py-3", compact && "px-3 py-2.5")}>
        <div className="flex items-start justify-between gap-2">
          <time className="text-xs font-extrabold tabular-nums text-mod-text" dateTime={assignment.scheduledAt.toISOString()}>
            {timeFormatter.format(assignment.scheduledAt)}
          </time>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className={cn("border-0 px-2 py-1 text-[10px] font-bold", classes.badge)}>
                <ScheduleStatusIcon state={state} />
                {state.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>{state.label}</TooltipContent>
          </Tooltip>
        </div>
        <h3 className="mt-2 text-sm font-extrabold leading-5 tracking-tight text-mod-text">
          {assignment.title}
        </h3>
        {assignment.reassignmentTicket?.status === "PENDING" ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-[8px] bg-[color-mix(in_srgb,var(--modAttention)_13%,transparent)] px-2 py-1 text-[10px] font-bold text-mod-attention">
            <Ticket size={13} weight="bold" aria-hidden="true" />
            Chờ chuyển giao
          </div>
        ) : null}
        <div className="mt-3 space-y-1.5 text-[11px] leading-4 text-mod-text-secondary">
          <p className="flex items-start gap-1.5">
            <CalendarBlank size={14} className="mt-px shrink-0" aria-hidden="true" />
            <span>Hạn sản xuất: {dateTimeFormatter.format(assignment.productionDeadline)}</span>
          </p>
          <p className="flex items-start gap-1.5">
            <ListBullets size={14} className="mt-px shrink-0" aria-hidden="true" />
            <span>{assignment.episode ? `Podcast nháp v${assignment.episode.contentRevision}` : "Chưa liên kết podcast"}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ViewSwitcher({
  view,
  onChange,
}: {
  view: "week" | "month";
  onChange: (view: "week" | "month") => void;
}): ReactElement {
  return (
    <div className="flex rounded-[12px] bg-mod-canvas-accent p-1" role="group" aria-label="Chế độ xem lịch">
      <Button
        type="button"
        size="sm"
        variant={view === "week" ? "secondary" : "ghost"}
        aria-pressed={view === "week"}
        onClick={() => onChange("week")}
        className={cn("rounded-[9px] shadow-none", view === "week" && "bg-mod-surface text-mod-text shadow-sm")}
      >
        <GridFour size={16} aria-hidden="true" />
        Thời khóa biểu
      </Button>
      <Button
        type="button"
        size="sm"
        variant={view === "month" ? "secondary" : "ghost"}
        aria-pressed={view === "month"}
        onClick={() => onChange("month")}
        className={cn("rounded-[9px] shadow-none", view === "month" && "bg-mod-surface text-mod-text shadow-sm")}
      >
        <CalendarBlank size={16} aria-hidden="true" />
        Lịch tiến độ
      </Button>
    </div>
  );
}

function PeriodNavigation({
  label,
  count,
  previousLabel,
  nextLabel,
  onPrevious,
  onCurrent,
  onNext,
}: {
  label: string;
  count: number;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onCurrent: () => void;
  onNext: () => void;
}): ReactElement {
  return (
    <div className="flex flex-col gap-3 border-b border-mod-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div>
        <p className="text-base font-extrabold capitalize text-mod-text">{label}</p>
        <p className="mt-0.5 text-xs text-mod-text-secondary">{count} lịch phát hành</p>
      </div>
      <div className="flex w-full items-center overflow-hidden rounded-[12px] border border-mod-border bg-mod-surface shadow-sm sm:w-auto">
        <Button type="button" variant="ghost" size="icon" className="rounded-none" aria-label={previousLabel} onClick={onPrevious}>
          <CaretLeft size={16} aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-9 flex-1 rounded-none border-x border-mod-border px-4 sm:flex-none" onClick={onCurrent}>
          Hiện tại
        </Button>
        <Button type="button" variant="ghost" size="icon" className="rounded-none" aria-label={nextLabel} onClick={onNext}>
          <CaretRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function WeekView({
  assignments,
  now,
  anchor,
  onAnchorChange,
}: {
  assignments: ModeratorAssignmentSummary[];
  now: Date;
  anchor: Date;
  onAnchorChange: (anchor: Date) => void;
}): ReactElement {
  const grouped = groupAssignmentsByDate(assignments);
  const days = getVietnamWeek(anchor);
  const dayKeys = days.map(getVietnamDateKey);
  const count = dayKeys.reduce((total, key) => total + (grouped[key]?.length ?? 0), 0);
  const todayKey = getVietnamDateKey(now);
  const start = days[0]!;
  const end = days[6]!;
  const periodLabel = `${dayNumberFormatter.format(start)}/${new Intl.DateTimeFormat("vi-VN", { timeZone: VIETNAM_TIME_ZONE, month: "2-digit" }).format(start)} - ${shortDateFormatter.format(end)}`;

  return (
    <>
      <PeriodNavigation
        label={periodLabel}
        count={count}
        previousLabel="Tuần trước"
        nextLabel="Tuần sau"
        onPrevious={() => onAnchorChange(new Date(anchor.getTime() - 7 * DAY_MS))}
        onCurrent={() => onAnchorChange(now)}
        onNext={() => onAnchorChange(new Date(anchor.getTime() + 7 * DAY_MS))}
      />
      {!count ? (
        <p className="mx-4 mt-4 rounded-[12px] bg-mod-canvas-accent px-4 py-3 text-sm text-mod-text-secondary sm:mx-5">
          Chưa có lịch phát hành trong tuần này.
        </p>
      ) : null}
      <div data-week-scroll="true" data-scrollbar-hidden="true" aria-label="Thời khóa biểu theo tuần" className="mod-scrollbar-hidden overflow-x-auto p-4 sm:p-5">
        <div className="grid min-w-[1280px] grid-cols-[112px_repeat(7,minmax(160px,1fr))] gap-px overflow-hidden rounded-[16px] border border-mod-border bg-mod-border shadow-[0_10px_30px_color-mix(in_srgb,var(--modText)_6%,transparent)]">
          <div className="bg-mod-canvas-accent p-3" aria-hidden="true" />
          {days.map((day, index) => {
            const key = dayKeys[index]!;
            const isToday = key === todayKey;
            return (
              <div key={key} data-day-key={key} className={cn("bg-mod-surface px-3 py-2.5", isToday && "bg-[color-mix(in_srgb,var(--modPrimary)_5%,var(--modSurface))]")}>
                <p className="text-[11px] font-semibold capitalize text-mod-text-secondary">{dayLabelFormatter.format(day)}</p>
                <p className={cn("mt-1 grid size-7 place-items-center rounded-[9px] text-sm font-extrabold text-mod-text", isToday && "bg-mod-primary text-white")}>
                  {dayNumberFormatter.format(day)}
                </p>
              </div>
            );
          })}
          {sessions.map((session) => (
            <Fragment key={session.id}>
              <div className="contents" data-session-row="true" data-session={session.id} aria-label={`${session.label}, ${session.time}`}>
                <div className="flex min-h-48 flex-col justify-between bg-mod-canvas-accent p-3.5">
                  <span className="text-xs font-bold text-mod-text">{session.label}</span>
                  <span className="text-[10px] tabular-nums text-mod-text-secondary">{session.time}</span>
                </div>
                {dayKeys.map((key) => {
                  const items = (grouped[key] ?? []).filter((item) => getScheduleSession(item.scheduledAt) === session.id);
                  return (
                    <div key={`${session.id}-${key}`} className={cn("min-h-48 space-y-3 bg-mod-surface p-2.5", key === todayKey && "bg-[color-mix(in_srgb,var(--modPrimary)_3%,var(--modSurface))]")}>
                      {items.map((item) => <ScheduleCard key={item.id} assignment={item} now={now} compact />)}
                    </div>
                  );
                })}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}

const tonePriority: Record<ScheduleTone, number> = {
  danger: 5,
  attention: 4,
  success: 3,
  primary: 2,
  neutral: 1,
};

function MonthView({
  assignments,
  now,
  month,
  selectedDate,
  onMonthChange,
  onSelectedDateChange,
}: {
  assignments: ModeratorAssignmentSummary[];
  now: Date;
  month: Date;
  selectedDate: Date;
  onMonthChange: (month: Date) => void;
  onSelectedDateChange: (date: Date) => void;
}): ReactElement {
  const grouped = groupAssignmentsByDate(assignments);
  const dominantTone = Object.fromEntries(
    Object.entries(grouped).map(([key, items]) => {
      const tone = items
        .map((item) => statusForAssignment(item, now).tone)
        .sort((left, right) => tonePriority[right] - tonePriority[left])[0] ?? "neutral";
      return [key, tone];
    }),
  ) as Record<string, ScheduleTone>;
  const toneDates = (tone: ScheduleTone) =>
    Object.entries(dominantTone)
      .filter(([, itemTone]) => itemTone === tone)
      .map(([key]) => calendarDateFromKey(key));
  const selectedKey = calendarDateKey(selectedDate);
  const selectedItems = grouped[selectedKey] ?? [];
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-`;
  const count = Object.entries(grouped)
    .filter(([key]) => key.startsWith(monthPrefix))
    .reduce((total, [, items]) => total + items.length, 0);
  const MonthDayButton = ({ day, modifiers: _modifiers, children, ...buttonProps }: DayButtonProps) => {
    const key = calendarDateKey(day.date);
    const itemCount = grouped[key]?.length ?? 0;
    const label = typeof buttonProps["aria-label"] === "string" ? buttonProps["aria-label"] : key;
    return (
      <button
        {...buttonProps}
        data-has-schedules={itemCount ? "true" : undefined}
        data-schedule-tone={itemCount ? dominantTone[key] : undefined}
        aria-label={itemCount ? `${label}, ${itemCount} lịch phát hành` : label}
      >
        <span>{children}</span>
        {itemCount ? (
          <span className="mt-auto inline-flex items-center gap-1 rounded-[6px] bg-mod-surface/85 px-1.5 py-0.5 text-[9px] font-bold leading-none text-mod-text shadow-sm">
            <CalendarBlank size={10} weight="bold" aria-hidden="true" />
            {itemCount} lịch
          </span>
        ) : null}
      </button>
    );
  };
  const shiftMonth = (amount: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1, 12);
    onMonthChange(next);
    onSelectedDateChange(next);
  };

  return (
    <>
      <PeriodNavigation
        label={monthFormatter.format(month)}
        count={count}
        previousLabel="Tháng trước"
        nextLabel="Tháng sau"
        onPrevious={() => shiftMonth(-1)}
        onCurrent={() => {
          const current = calendarDateFromKey(getVietnamDateKey(now));
          onMonthChange(current);
          onSelectedDateChange(current);
        }}
        onNext={() => shiftMonth(1)}
      />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px] sm:p-5">
        <div className="min-w-0 rounded-[16px] border border-mod-border bg-mod-surface p-3 shadow-[0_10px_30px_color-mix(in_srgb,var(--modText)_6%,transparent)]">
          <Calendar
            mode="single"
            hideNavigation
            month={month}
            selected={selectedDate}
            onSelect={(date) => date && onSelectedDateChange(date)}
            onMonthChange={onMonthChange}
            components={{ DayButton: MonthDayButton }}
            modifiers={{
              primaryStatus: toneDates("primary"),
              successStatus: toneDates("success"),
              attentionStatus: toneDates("attention"),
              dangerStatus: toneDates("danger"),
              neutralStatus: toneDates("neutral"),
            }}
            modifiersClassNames={{
              primaryStatus: toneClass.primary.marker,
              successStatus: toneClass.success.marker,
              attentionStatus: toneClass.attention.marker,
              dangerStatus: toneClass.danger.marker,
              neutralStatus: toneClass.neutral.marker,
            }}
            className="w-full p-0"
            classNames={{
              months: "w-full",
              month: "w-full space-y-3",
              month_caption: "hidden",
              month_grid: "w-full border-separate border-spacing-1",
              weekdays: "grid grid-cols-7",
              weekday: "py-2 text-center text-[11px] font-semibold text-mod-text-muted",
              week: "mt-1 grid grid-cols-7",
              day: "relative min-h-20 p-0 text-center",
              day_button: "relative flex min-h-20 w-full flex-col items-start justify-start rounded-[10px] border border-transparent p-2 text-sm font-semibold text-mod-text outline-none transition-[background-color,border-color,box-shadow] hover:bg-mod-canvas-accent focus-visible:ring-2 focus-visible:ring-mod-primary/35",
              selected: "[&>button]:!border-mod-primary [&>button]:!bg-mod-primary [&>button]:!font-bold [&>button]:!text-white [&>button]:hover:!bg-mod-primary/90",
            }}
          />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-mod-border pt-3 text-[11px] text-mod-text-secondary">
            {(["primary", "success", "attention", "danger"] as const).map((tone) => (
              <span key={tone} className="inline-flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", tone === "primary" && "bg-mod-primary", tone === "success" && "bg-mod-success", tone === "attention" && "bg-mod-attention", tone === "danger" && "bg-mod-danger")} />
                {tone === "primary" ? "Đang thực hiện" : tone === "success" ? "Đã duyệt hoặc hoàn thành" : tone === "attention" ? "Cần chú ý" : "Quá hạn hoặc thất bại"}
              </span>
            ))}
          </div>
        </div>
        <Card data-selected-day-agenda className="h-fit gap-0 rounded-[16px] border-mod-border bg-mod-surface py-0 shadow-[0_10px_30px_color-mix(in_srgb,var(--modText)_6%,transparent)]">
          <CardContent className="px-4 py-4">
            <p className="text-xs font-semibold capitalize text-mod-text-secondary">
              {new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(selectedDate)}
            </p>
            <h2 className="mt-1 text-base font-extrabold text-mod-text">
              {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "long", year: "numeric" }).format(selectedDate)}
            </h2>
            <div className="mt-4 space-y-3">
              {selectedItems.length ? selectedItems.map((item) => (
                <ScheduleCard key={item.id} assignment={item} now={now} />
              )) : (
                <div className="rounded-[12px] bg-mod-canvas-accent px-4 py-5 text-center">
                  <CalendarBlank size={24} className="mx-auto text-mod-text-low" aria-hidden="true" />
                  <p className="mt-2 text-sm font-semibold text-mod-text">Không có lịch phát hành</p>
                  <p className="mt-1 text-xs text-mod-text-secondary">Ngày này chưa có công việc cần theo dõi.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function ModeratorReleaseScheduleView({
  assignments,
  now = new Date(),
}: {
  assignments: ModeratorAssignmentSummary[];
  now?: Date;
}): ReactElement {
  const currentCalendarDate = calendarDateFromKey(getVietnamDateKey(now));
  const [view, setView] = useState<"week" | "month">("week");
  const [weekAnchor, setWeekAnchor] = useState(now);
  const [month, setMonth] = useState(currentCalendarDate);
  const [selectedDate, setSelectedDate] = useState(currentCalendarDate);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-5 font-moderator">
        <DashboardHeader
          title="Lịch phát hành"
          description="Theo dõi lịch làm việc theo tuần và tiến độ phát hành nội dung trong tháng."
          actions={<ViewSwitcher view={view} onChange={setView} />}
        />
        <Card className="gap-0 overflow-hidden rounded-[16px] border-mod-border bg-mod-surface py-0 shadow-[0_18px_46px_color-mix(in_srgb,var(--modText)_9%,transparent)]">
          {view === "week" ? (
            <WeekView assignments={assignments} now={now} anchor={weekAnchor} onAnchorChange={setWeekAnchor} />
          ) : (
            <MonthView
              assignments={assignments}
              now={now}
              month={month}
              selectedDate={selectedDate}
              onMonthChange={setMonth}
              onSelectedDateChange={setSelectedDate}
            />
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
}

function ModeratorReleaseScheduleSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-5" aria-label="Đang tải lịch phát hành">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 rounded-[10px]" />
        <Skeleton className="h-4 w-full max-w-xl rounded-[8px]" />
      </div>
      <Card className="gap-4 rounded-[16px] border-mod-border bg-mod-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-48 rounded-[10px]" />
          <Skeleton className="h-10 w-52 rounded-[10px]" />
        </div>
        <Skeleton className="h-[470px] w-full rounded-[16px]" />
      </Card>
    </div>
  );
}

export function ModeratorReleaseSchedule(): ReactElement {
  const assignments = useQuery({
    queryKey: ["moderator-release-assignments"],
    queryFn: moderatorReleaseService.assignments,
  });

  if (assignments.isPending) return <ModeratorReleaseScheduleSkeleton />;
  if (assignments.isError) {
    return (
      <div role="alert" className="rounded-[16px] border border-mod-danger/25 bg-mod-surface p-6 text-sm text-mod-danger shadow-sm">
        Không tải được lịch phát hành. Vui lòng thử lại sau.
      </div>
    );
  }

  return <ModeratorReleaseScheduleView assignments={assignments.data.items} />;
}
