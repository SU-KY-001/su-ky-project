import type { ReleaseScheduleStatus } from "@repo/shared";
import { Kanban, List, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { ReleaseWorkspaceViewMode } from "../releaseWorkspaceModel";

const statusOptions: Array<{ value: ReleaseScheduleStatus | ""; label: string }> = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "SCHEDULED", label: "Đã lên lịch" },
  { value: "READY_TO_PUBLISH", label: "Sẵn sàng phát hành" },
  { value: "PUBLISHING", label: "Đang phát hành" },
  { value: "RELEASED", label: "Đã phát hành" },
  { value: "BLOCKED", label: "Bị chặn" },
  { value: "FAILED", label: "Thất bại" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export function ReleaseWorkspaceToolbar({
  view,
  search,
  moderatorId,
  status,
  from,
  to,
  moderators,
  onViewChange,
  onSearchChange,
  onModeratorChange,
  onStatusChange,
  onFromChange,
  onToChange,
  onCreate,
}: {
  view: ReleaseWorkspaceViewMode;
  search: string;
  moderatorId: string;
  status: ReleaseScheduleStatus | "";
  from: string;
  to: string;
  moderators: Array<{ id: string; name: string; email: string }>;
  onViewChange: (view: ReleaseWorkspaceViewMode) => void;
  onSearchChange: (value: string) => void;
  onModeratorChange: (value: string) => void;
  onStatusChange: (value: ReleaseScheduleStatus | "") => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-mod-border bg-mod-surface p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Chế độ hiển thị"
          className="flex rounded-lg bg-mod-canvas-accent p-1"
        >
          {([
            { value: "kanban" as const, label: "Kanban", icon: Kanban },
            { value: "table" as const, label: "Bảng", icon: List },
          ]).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              onClick={() => onViewChange(value)}
              className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition ${
                view === value
                  ? "bg-mod-surface text-mod-text shadow-sm"
                  : "text-mod-text-muted hover:text-mod-text"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <label className="relative min-w-52 flex-1">
          <span className="sr-only">Tìm lịch phát hành</span>
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-mod-text-muted" size={16} />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm lịch phát hành"
            className="border-mod-border bg-mod-canvas pl-9"
          />
        </label>

        <Button
          type="button"
          onClick={onCreate}
          className="bg-mod-primary text-white hover:bg-mod-primary/90"
        >
          <Plus size={16} weight="bold" /> Tạo lịch phát hành
        </Button>
      </div>

      <div className="mt-3 grid gap-3 border-t border-mod-border pt-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-xs font-semibold text-mod-text-secondary">
          Người phụ trách
          <Select value={moderatorId || "all"} onValueChange={(value) => onModeratorChange(value === "all" ? "" : value)}>
            <SelectTrigger aria-label="Người phụ trách" className="border-mod-border bg-mod-canvas">
              <SelectValue placeholder="Tất cả Moderator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả Moderator</SelectItem>
              {moderators.map((moderator) => (
                <SelectItem key={moderator.id} value={moderator.id}>{moderator.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-mod-text-secondary">
          Trạng thái
          <Select value={status || "all"} onValueChange={(value) => onStatusChange(value === "all" ? "" : value as ReleaseScheduleStatus)}>
            <SelectTrigger aria-label="Trạng thái" className="border-mod-border bg-mod-canvas">
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value || "all"} value={option.value || "all"}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-mod-text-secondary">
          Từ ngày
          <Input type="date" value={from} onChange={(event) => onFromChange(event.target.value)} className="border-mod-border bg-mod-canvas" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-mod-text-secondary">
          Đến ngày
          <Input type="date" value={to} onChange={(event) => onToChange(event.target.value)} className="border-mod-border bg-mod-canvas" />
        </label>
      </div>
    </div>
  );
}
