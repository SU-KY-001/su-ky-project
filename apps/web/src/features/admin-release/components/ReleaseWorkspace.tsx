import { useMemo, useState } from "react";
import type { ReleaseScheduleStatus } from "@repo/shared";
import { ArrowClockwise, PaperPlaneTilt, Plus, X } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { DashboardHeader, DashboardPanel } from "@/shared/components/dashboard/DashboardOverview";
import {
  useAdminReleaseActions,
  useAdminReleaseSchedules,
  useReleaseModerators,
  useReleaseProgress,
} from "../hooks/useAdminReleases";
import { ReleaseScheduleForm } from "./ReleaseScheduleForm";
import { ReleaseCalendar } from "./ReleaseCalendar";
import { ReleaseProgressTimeline } from "./ReleaseProgressTimeline";

const filters: Array<{ value: ReleaseScheduleStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "SCHEDULED", label: "Đang sản xuất" },
  { value: "READY_TO_PUBLISH", label: "Sẵn sàng" },
  { value: "BLOCKED", label: "Cần xử lý" },
  { value: "FAILED", label: "Thất bại" },
];

export function ReleaseWorkspace({ initiallyCreating = false }: { initiallyCreating?: boolean }) {
  const [creating, setCreating] = useState(initiallyCreating);
  const [status, setStatus] = useState<ReleaseScheduleStatus | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filter = useMemo(() => ({ page: 1, limit: 50, status: status === "ALL" ? undefined : status }), [status]);
  const schedules = useAdminReleaseSchedules(filter);
  const moderators = useReleaseModerators();
  const progress = useReleaseProgress(selectedId);
  const actions = useAdminReleaseActions();
  const selected = schedules.data?.items.find((item) => item.id === selectedId) ?? null;

  if (schedules.isPending)
    return <div className="ui-skeleton min-h-[420px] rounded-[16px]" aria-label="Đang tải lịch phát hành" />;
  if (schedules.isError)
    return <p role="alert" className="rounded-[16px] border border-vermilion/25 bg-mod-surface p-6 text-sm text-vermilion">Không tải được lịch phát hành.</p>;

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="ĐIỀU PHỐI PODCAST"
        title="Lịch phát hành"
        description="Lập lịch, phân công Moderator và xử lý các trường hợp phát hành ngoại lệ."
        actions={<Button type="button" onClick={() => setCreating((value) => !value)} className="gap-2 bg-mod-primary text-white hover:bg-mod-primary/90"><Plus size={17} />Tạo lịch</Button>}
      />
      {creating ? (
        <DashboardPanel title="Tạo lịch phát hành" description="Tự động phát hành là luồng mặc định cho mọi lịch hợp lệ" action={<Button variant="ghost" size="icon" onClick={() => setCreating(false)} aria-label="Đóng biểu mẫu"><X size={18} /></Button>}>
          <ReleaseScheduleForm
            moderators={moderators.data?.items ?? []}
            isSubmitting={actions.create.isPending}
            onSubmit={async (input) => {
              await actions.create.mutateAsync(input);
              setCreating(false);
            }}
          />
        </DashboardPanel>
      ) : null}
      <div className="flex flex-wrap gap-2" aria-label="Lọc trạng thái lịch">
        {filters.map((item) => (
          <Button key={item.value} type="button" variant={status === item.value ? "default" : "outline"} onClick={() => setStatus(item.value)} className={status === item.value ? "bg-mod-primary text-white hover:bg-mod-primary/90" : "border-mod-border bg-mod-surface text-mod-text"}>{item.label}</Button>
        ))}
      </div>
      <ReleaseCalendar schedules={schedules.data.items} onSelect={setSelectedId} />
      {selected ? (
        <DashboardPanel title="Tiến độ phát hành" description={selected.title} action={<Button variant="ghost" size="icon" onClick={() => setSelectedId(null)} aria-label="Đóng tiến độ"><X size={18} /></Button>}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
            {progress.isPending ? <div className="ui-skeleton min-h-52 rounded-[12px]" /> : progress.isError ? <p role="alert" className="text-sm text-vermilion">Không tải được tiến độ phát hành.</p> : <ReleaseProgressTimeline events={progress.data.items} />}
            <div className="flex min-w-[190px] flex-col gap-2 border-t border-mod-border pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
              {selected.status === "FAILED" ? <Button type="button" variant="outline" onClick={() => actions.retry.mutate(selected.id)} disabled={actions.retry.isPending} className="justify-start gap-2"><ArrowClockwise size={17} />Thử lại</Button> : null}
              {["BLOCKED", "FAILED"].includes(selected.status) ? <Button type="button" onClick={() => actions.publishNow.mutate(selected.id)} disabled={actions.publishNow.isPending} className="justify-start gap-2 bg-mod-primary text-white hover:bg-mod-primary/90"><PaperPlaneTilt size={17} />Phát hành ngay</Button> : null}
              {["SCHEDULED", "READY_TO_PUBLISH", "BLOCKED", "FAILED"].includes(selected.status) ? <Button type="button" variant="outline" onClick={() => { if (window.confirm("Hủy lịch phát hành này?")) actions.cancel.mutate(selected.id); }} disabled={actions.cancel.isPending} className="justify-start gap-2 border-vermilion/30 text-vermilion hover:bg-vermilion/5"><X size={17} />Hủy lịch</Button> : null}
            </div>
          </div>
        </DashboardPanel>
      ) : null}
    </div>
  );
}
