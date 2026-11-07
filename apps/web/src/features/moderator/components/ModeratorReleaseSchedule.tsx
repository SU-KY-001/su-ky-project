import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ReleaseScheduleRecord, ReleaseScheduleStatus } from "@repo/shared";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { ReleaseScheduleTable } from "@/features/admin-release/components/ReleaseScheduleTable";
import { ReleaseScheduleDialog } from "@/features/admin-release/components/ReleaseScheduleDialog";
import { moderatorReleaseService } from "../services/moderatorReleaseService";
import { matchesVietnamDate, ModeratorDeadlineToolbar } from "./ModeratorDeadlineToolbar";

const statuses: Array<{ value: ReleaseScheduleStatus; label: string }> = [
  { value: "SCHEDULED", label: "Đã lên lịch" },
  { value: "READY_TO_PUBLISH", label: "Đủ điều kiện" },
  { value: "RELEASED", label: "Đã phát hành" },
  { value: "CANCELLED", label: "Đã hủy" },
];
const allowedStatuses = new Set<ReleaseScheduleStatus>(statuses.map(({ value }) => value));
const PAGE_SIZE = 10;

export function ModeratorReleaseScheduleView({
  schedules,
  progress = [],
  progressError = null,
  onSelect,
  selectedId,
  onClose,
}: {
  schedules: ReleaseScheduleRecord[];
  progress?: React.ComponentProps<typeof ReleaseScheduleDialog>["progress"];
  progressError?: Error | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [page, setPage] = useState(1);
  const filtered = schedules.filter((schedule) => allowedStatuses.has(schedule.status) && (status === "all" || schedule.status === status) &&
    schedule.title.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")) &&
    matchesVietnamDate(schedule.productionDeadline, deadlineDate) &&
    matchesVietnamDate(schedule.scheduledAt, releaseDate))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const selected = schedules.find((schedule) => schedule.id === selectedId) ?? null;
  const moderators = selected?.assignments.map(({ moderatorId, moderator }) => ({ id: moderatorId, name: moderator.name, email: moderator.email })) ?? [];
  const toolbar = <ModeratorDeadlineToolbar search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} searchLabel="Tìm lịch phát hành" status={status} onStatusChange={(value) => { setStatus(value); setPage(1); }} statusLabel="Lọc trạng thái lịch phát hành" statusOptions={statuses} deadlineDate={deadlineDate} onDeadlineChange={(value) => { setDeadlineDate(value); setPage(1); }} releaseDate={releaseDate} onReleaseChange={(value) => { setReleaseDate(value); setPage(1); }} />;

  return <div className="flex min-w-0 flex-col gap-6 font-moderator">
    <DashboardHeader eyebrow="XUẤT BẢN" title="Lịch phát hành" description="Theo dõi các lịch phát hành được phân công." />
    <ReleaseScheduleTable audience="moderator" items={filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)} page={currentPage} limit={PAGE_SIZE} total={filtered.length} toolbar={toolbar} onOpenEdit={(schedule) => onSelect(schedule.id)} onPageChange={setPage} />
    <ReleaseScheduleDialog mode="view" schedule={selected} moderators={moderators} progress={progress} open={Boolean(selected)} busy={false} error={progressError} onOpenChange={(open) => { if (!open) onClose(); }} onCreate={async () => undefined} onUpdate={async () => undefined} onRetry={() => undefined} onPublishNow={() => undefined} onCancel={() => undefined} />
  </div>;
}

export function ModeratorReleaseSchedule() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const schedules = useQuery({ queryKey: ["moderator-release-schedules"], queryFn: moderatorReleaseService.schedules, refetchInterval: 2_000 });
  const progress = useQuery({ queryKey: ["moderator-release-progress", selectedId], queryFn: () => moderatorReleaseService.progress(selectedId!), enabled: Boolean(selectedId), refetchInterval: 2_000 });
  if (schedules.isPending) return <div className="ui-skeleton min-h-72 rounded-2xl" aria-label="Đang tải bảng lịch" />;
  if (schedules.isError) return <p role="alert" className="rounded-2xl border border-mod-danger/20 bg-mod-surface p-5 text-sm text-mod-danger">Không tải được bảng lịch phát hành.</p>;
  return <ModeratorReleaseScheduleView schedules={schedules.data.items} selectedId={selectedId} onSelect={setSelectedId} onClose={() => setSelectedId(null)} progress={progress.data?.items ?? []} progressError={progress.error} />;
}
