import { useMemo } from "react";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { ArrowClockwise } from "@phosphor-icons/react/dist/icons/ArrowClockwise";
import { CalendarPlus } from "@phosphor-icons/react/dist/icons/CalendarPlus";
import { FloppyDisk } from "@phosphor-icons/react/dist/icons/FloppyDisk";
import { PaperPlaneTilt } from "@phosphor-icons/react/dist/icons/PaperPlaneTilt";
import { X } from "@phosphor-icons/react/dist/icons/X";
import { ApiError, errorMessage } from "@/lib/apiError";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";
import type { ReleaseScheduleDraft } from "../services/adminReleaseService";
import { ReleaseProgressTimeline, type ReleaseProgressItem } from "./ReleaseProgressTimeline";
import { ReleaseScheduleForm, type ReleaseModeratorOption } from "./ReleaseScheduleForm";

function toLocalDateTime(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

const statusLabels: Record<ReleaseScheduleRecord["status"], string> = {
  SCHEDULED: "Đã lên lịch",
  READY_TO_PUBLISH: "Sẵn sàng phát hành",
  PUBLISHING: "Đang phát hành",
  RELEASED: "Đã phát hành",
  BLOCKED: "Bị chặn",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
};
const releaseScheduleFormId = "release-schedule-form";

export function ReleaseScheduleDialog({
  mode,
  schedule,
  currentStatus,
  moderators,
  progress,
  open,
  busy,
  error,
  onOpenChange,
  onCreate,
  onUpdate,
  onRetry,
  onPublishNow,
  onCancel,
}: {
  mode: "create" | "edit";
  schedule: ReleaseScheduleRecord | null;
  currentStatus?: ReleaseScheduleRecord["status"];
  moderators: ReleaseModeratorOption[];
  progress: ReleaseProgressItem[];
  open: boolean;
  busy: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: ReleaseScheduleDraft) => Promise<unknown>;
  onUpdate: (schedule: ReleaseScheduleRecord, draft: ReleaseScheduleDraft) => Promise<unknown>;
  onRetry: (schedule: ReleaseScheduleRecord) => void;
  onPublishNow: (schedule: ReleaseScheduleRecord) => void;
  onCancel: (schedule: ReleaseScheduleRecord) => void;
}) {
  // Live state must not replace the edit snapshot/baseUpdatedAt or erase unsaved input.
  const status = currentStatus ?? schedule?.status ?? "SCHEDULED";
  const locked = status === "PUBLISHING" || status === "RELEASED" || status === "CANCELLED";
  const initialValues = useMemo<ReleaseScheduleDraft | undefined>(() => {
    if (mode !== "edit" || !schedule) return undefined;
    return {
      title: schedule.title,
      episodeId: schedule.episodeId,
      productionDeadline: toLocalDateTime(schedule.productionDeadline),
      scheduledAt: toLocalDateTime(schedule.scheduledAt),
      moderatorId: schedule.assignments[0]?.moderatorId ?? "",
    };
  }, [mode, schedule]);
  const submit = async (draft: ReleaseScheduleDraft) => {
    if (mode === "edit" && locked) return;
    try {
      if (mode === "edit" && schedule) await onUpdate(schedule, draft);
      else await onCreate(draft);
      onOpenChange(false);
    } catch {
      // Mutation state owns the displayed error; retaining this component keeps edits intact.
    }
  };
  const stale = error instanceof ApiError && error.errorCode === "STALE_WRITE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[min(760px,calc(100dvh-2rem))] max-w-[720px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden bg-mod-surface p-0 sm:p-0">
        <DialogHeader className="border-b border-mod-border px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{mode === "edit" ? "Cập nhật lịch phát hành" : "Tạo lịch phát hành"}</DialogTitle>
            {mode === "edit" && schedule ? (
              <CardBadge type="status" tone={cardBadgeToneForStatus(status)}>
                {statusLabels[status]}
              </CardBadge>
            ) : null}
          </div>
          <DialogDescription>
            {mode === "edit"
              ? "Chỉnh sửa trực tiếp thông tin lịch và người phụ trách."
              : "Lập thời gian phát hành và giao trọn công đoạn sản xuất cho Moderator."}
          </DialogDescription>
        </DialogHeader>

        <div
          data-dialog-scroll-area="true"
          className="mod-dialog-scroll-area min-h-0 overflow-y-auto px-5 py-5 sm:px-6"
        >
          <div className="flex flex-col gap-5">
            {schedule?.episode ? (
              <div className="rounded-xl border border-mod-border bg-mod-canvas-accent/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-mod-text-muted">Podcast đã liên kết · chỉ đọc</p>
                <p className="mt-1 text-sm font-bold text-mod-text">{schedule.episode.title}</p>
                <p className="mt-0.5 text-xs text-mod-text-secondary">Phiên bản nội dung {schedule.episode.contentRevision}</p>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="rounded-xl border border-vermilion/20 bg-vermilion/5 px-3 py-2.5 text-sm font-medium text-vermilion">
                {stale
                  ? "Lịch đã thay đổi trên hệ thống. Tải lại dữ liệu trước khi lưu lại; nội dung bạn đang nhập vẫn được giữ nguyên."
                  : errorMessage(error)}
              </p>
            ) : null}

            <ReleaseScheduleForm
              mode={mode}
              moderators={moderators}
              initialValues={initialValues}
              initialValuesKey={schedule?.id ?? "create"}
              isSubmitting={busy}
              onSubmit={submit}
              formId={releaseScheduleFormId}
              showSubmitAction={false}
            />

            {mode === "edit" && schedule ? (
              <details className="rounded-xl border border-mod-border bg-mod-canvas-accent/35 p-3">
                <summary className="cursor-pointer text-sm font-bold text-mod-text">Tiến độ phát hành</summary>
                <div className="mt-4"><ReleaseProgressTimeline events={progress} /></div>
              </details>
            ) : null}
          </div>
        </div>

        <DialogFooter className="border-t border-mod-border bg-mod-surface px-5 py-4 sm:px-6">
          {mode === "edit" && schedule ? (
            <>
              {["SCHEDULED", "READY_TO_PUBLISH", "BLOCKED", "FAILED"].includes(status) ? <Button type="button" variant="ghost" disabled={busy} className="text-vermilion" onClick={() => onCancel(schedule)}><X /> Hủy lịch</Button> : null}
              {status === "FAILED" ? <Button type="button" variant="outline" disabled={busy} onClick={() => onRetry(schedule)}><ArrowClockwise /> Thử lại</Button> : null}
              {["BLOCKED", "FAILED", "READY_TO_PUBLISH"].includes(status) ? <Button type="button" variant="outline" disabled={busy} onClick={() => onPublishNow(schedule)}><PaperPlaneTilt /> Phát hành ngay</Button> : null}
            </>
          ) : null}
          <Button
            type="submit"
            form={releaseScheduleFormId}
            disabled={busy || !moderators.length || (mode === "edit" && locked)}
            className="bg-mod-primary text-white hover:bg-mod-primary/90"
          >
            {mode === "edit" ? <FloppyDisk size={18} /> : <CalendarPlus size={18} />}
            {busy
              ? mode === "edit" ? "Đang lưu" : "Đang tạo lịch"
              : mode === "edit" ? "Lưu thay đổi" : "Tạo lịch phát hành"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
