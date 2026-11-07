import { MagnifyingGlass } from "@phosphor-icons/react/dist/icons/MagnifyingGlass";
import { useId } from "react";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { getVietnamDateKey } from "../moderatorScheduleModel";

export function matchesVietnamDate(date: Date, selectedDate: string): boolean {
  return !selectedDate || getVietnamDateKey(date) === selectedDate;
}

export function ModeratorDeadlineToolbar({ search, onSearchChange, searchLabel, status, onStatusChange, statusLabel, statusOptions, deadlineDate, onDeadlineChange, releaseDate, onReleaseChange }: {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  status: string;
  onStatusChange: (value: string) => void;
  statusLabel: string;
  statusOptions: Array<{ value: string; label: string }>;
  deadlineDate: string;
  onDeadlineChange: (value: string) => void;
  releaseDate: string;
  onReleaseChange: (value: string) => void;
}) {
  const id = useId();
  return <div className="grid min-w-0 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_minmax(180px,220px)_minmax(170px,200px)_minmax(170px,200px)]">
    <div className="grid min-w-0 gap-1"><label htmlFor={`${id}-search`} className="text-xs font-semibold text-mod-text-secondary">{searchLabel}</label><div className="relative"><MagnifyingGlass size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-mod-text-muted" aria-hidden="true" />
      <Input id={`${id}-search`} value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchLabel} className="h-10 border-mod-border bg-mod-surface pl-9" />
    </div></div>
    <div className="grid min-w-0 gap-1"><span className="text-xs font-semibold text-mod-text-secondary">Trạng thái</span><Select value={status} onValueChange={onStatusChange}>
      <SelectTrigger aria-label={statusLabel} className="h-10 w-full border-mod-border bg-mod-surface"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem>{statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
    </Select></div>
    <div className="grid gap-1"><label htmlFor={`${id}-release`} className="text-xs font-semibold text-mod-text-secondary">Ngày phát hành</label><DatePicker id={`${id}-release`} value={releaseDate} onChange={onReleaseChange} ariaLabel="Ngày phát hành" placeholder="Chọn ngày phát hành" clearable /></div>
    <div className="grid gap-1"><label htmlFor={`${id}-deadline`} className="text-xs font-semibold text-mod-text-secondary">Hạn sản xuất</label><DatePicker id={`${id}-deadline`} value={deadlineDate} onChange={onDeadlineChange} ariaLabel="Hạn sản xuất" placeholder="Chọn hạn sản xuất" clearable /></div>
  </div>;
}
