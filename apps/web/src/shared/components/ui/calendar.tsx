import type { ComponentProps } from "react";
import { CaretDown, CaretLeft, CaretRight, CaretUp } from "@phosphor-icons/react";
import { DayPicker, type ChevronProps } from "react-day-picker";
import { vi } from "react-day-picker/locale";
import { cn } from "@/lib/utils";

function CalendarChevron({ orientation, className, size = 16 }: ChevronProps) {
  const Icon = orientation === "left"
    ? CaretLeft
    : orientation === "right"
      ? CaretRight
      : orientation === "up"
        ? CaretUp
        : CaretDown;
  return <Icon size={size} className={className} aria-hidden="true" />;
}

export function Calendar({
  className,
  classNames,
  components,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      data-slot="calendar"
      locale={vi}
      showOutsideDays={showOutsideDays}
      className={cn("p-3 font-moderator", className)}
      classNames={{
        root: "relative",
        months: "flex flex-col gap-4",
        month: "space-y-3",
        month_caption: "flex h-9 items-center justify-center px-10",
        caption_label: "text-sm font-bold capitalize text-mod-text",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: "grid size-9 place-items-center rounded-md text-mod-text-secondary transition-colors hover:bg-mod-canvas-accent hover:text-mod-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mod-primary/35 disabled:opacity-40",
        button_next: "grid size-9 place-items-center rounded-md text-mod-text-secondary transition-colors hover:bg-mod-canvas-accent hover:text-mod-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mod-primary/35 disabled:opacity-40",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 py-1 text-center text-[11px] font-semibold text-mod-text-muted",
        week: "mt-1 flex w-full",
        day: "relative size-9 p-0 text-center text-sm",
        day_button: "grid size-9 place-items-center rounded-md text-sm font-medium text-mod-text outline-none transition-colors hover:bg-mod-canvas-accent focus-visible:ring-2 focus-visible:ring-mod-primary/35",
        selected: "[&>button]:bg-mod-primary [&>button]:font-bold [&>button]:text-white [&>button]:hover:bg-mod-primary/90",
        today: "[&>button]:border [&>button]:border-mod-primary/35 [&>button]:font-bold [&>button]:text-mod-primary",
        outside: "text-mod-text-low opacity-45",
        disabled: "pointer-events-none opacity-35",
        hidden: "invisible",
        ...classNames,
      }}
      components={{ ...components, Chevron: components?.Chevron ?? CalendarChevron }}
      {...props}
    />
  );
}
