import { useEffect, useState, type KeyboardEvent } from "react";
import { CalendarBlank, Clock, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

function parseLocalDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 12);
}

function localDateValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string): string {
  const date = parseLocalDate(value);
  return date
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date)
    : "";
}

function typedDateValue(value: string): string | undefined {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day, 12);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return undefined;
  return localDateValue(date);
}

function validTimeValue(value: string): string | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return undefined;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function DatePicker({
  value,
  onChange,
  ariaLabel,
  id,
  placeholder = "Chọn ngày",
  clearable = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  id?: string;
  placeholder?: string;
  clearable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(displayDate(value));
  const selected = parseLocalDate(value);

  useEffect(() => setDraft(displayDate(value)), [value]);

  const commitDraft = () => {
    if (!draft.trim()) {
      onChange("");
      return;
    }
    const nextValue = typedDateValue(draft);
    if (!nextValue) {
      setDraft(displayDate(value));
      return;
    }
    setDraft(displayDate(nextValue));
    onChange(nextValue);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitDraft();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative h-10 w-full", className)}>
        <Input
          id={id}
          value={draft}
          inputMode="numeric"
          autoComplete="off"
          aria-label={`${ariaLabel} - nhập ngày`}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
          className="h-10 border-mod-border bg-mod-canvas pr-10 font-medium tabular-nums shadow-xs"
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={ariaLabel}
            data-slot="date-picker-trigger"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-mod-text-muted hover:bg-mod-canvas-accent hover:text-mod-text"
          >
            <CalendarBlank size={17} aria-hidden="true" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return;
            const nextValue = localDateValue(date);
            setDraft(displayDate(nextValue));
            onChange(nextValue);
            setOpen(false);
          }}
        />
        {clearable && value ? (
          <div className="border-t border-mod-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center text-mod-text-secondary"
              onClick={() => {
                setDraft("");
                onChange("");
                setOpen(false);
              }}
            >
              <X size={15} /> Xóa ngày
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function DateTimePicker({
  value,
  onChange,
  ariaLabel,
  id,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  id?: string;
  placeholder: string;
}) {
  const [date = "", time = ""] = value.split("T");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
      <DatePicker
        value={date}
        id={id}
        ariaLabel={ariaLabel}
        placeholder={placeholder}
        onChange={(nextDate) => onChange(`${nextDate}T${time || "09:00"}`)}
      />
      <TimePicker
        aria-label={`${ariaLabel} - giờ`}
        value={time}
        disabled={!date}
        onChange={(nextTime) => onChange(`${date}T${nextTime}`)}
      />
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [selectedHour = "09", selectedMinute = "00"] = value.split(":");

  useEffect(() => setDraft(value), [value]);

  const commitDraft = () => {
    const nextValue = validTimeValue(draft);
    if (!nextValue) {
      setDraft(value);
      return;
    }
    setDraft(nextValue);
    onChange(nextValue);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitDraft();
  };
  const selectTime = (nextValue: string) => {
    setDraft(nextValue);
    onChange(nextValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative h-10 w-full">
        <Input
          value={draft}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="off"
          aria-label={ariaLabel}
          placeholder="HH:mm"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
          className="h-10 border-mod-border bg-mod-canvas pr-10 font-medium tabular-nums shadow-xs"
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={`Mở ${ariaLabel}`}
            data-slot="time-picker-trigger"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-mod-text-muted hover:bg-mod-canvas-accent hover:text-mod-text"
          >
            <Clock size={17} aria-hidden="true" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent align="end" className="w-56 overflow-hidden">
        <div className="grid grid-cols-2 border-b border-mod-border bg-mod-canvas-accent/65 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-mod-text-muted">
          <span>Giờ</span>
          <span>Phút</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-mod-border p-1.5">
          <div className="mod-dialog-scroll-area max-h-56 overflow-y-auto pr-1" role="listbox" aria-label="Chọn giờ">
            {hours.map((hour) => (
              <Button
                key={hour}
                type="button"
                variant="ghost"
                size="sm"
                role="option"
                aria-label={`Chọn giờ ${hour}`}
                aria-selected={selectedHour === hour}
                onClick={() => selectTime(`${hour}:${selectedMinute}`)}
                className="mb-0.5 w-full justify-center tabular-nums text-mod-text aria-selected:bg-mod-primary aria-selected:font-bold aria-selected:text-white"
              >
                {hour}
              </Button>
            ))}
          </div>
          <div className="mod-dialog-scroll-area max-h-56 overflow-y-auto pl-1" role="listbox" aria-label="Chọn phút">
            {minutes.map((minute) => (
              <Button
                key={minute}
                type="button"
                variant="ghost"
                size="sm"
                role="option"
                aria-label={`Chọn phút ${minute}`}
                aria-selected={selectedMinute === minute}
                onClick={() => {
                  selectTime(`${selectedHour}:${minute}`);
                  setOpen(false);
                }}
                className="mb-0.5 w-full justify-center tabular-nums text-mod-text aria-selected:bg-mod-primary aria-selected:font-bold aria-selected:text-white"
              >
                {minute}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
