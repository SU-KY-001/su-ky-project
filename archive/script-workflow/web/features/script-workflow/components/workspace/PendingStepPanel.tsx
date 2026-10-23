import { useState } from "react";
import { Clock, HourglassMedium, WarningCircle } from "@phosphor-icons/react";
import type { WorkflowStep } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { SLOW_STEP_WARNING_MS } from "../../constants";
import { STEP_LABELS } from "../../labels";
import { useNow } from "./useNow";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SKELETON_LINE_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-full", "w-2/3"] as const;

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function SkeletonLines() {
  return (
    <div className="flex flex-col gap-3" aria-hidden={true}>
      {SKELETON_LINE_WIDTHS.map((width, index) => (
        <div key={index} className={`h-4 animate-pulse rounded-md bg-mod-canvas-accent motion-reduce:animate-none ${width}`} />
      ))}
    </div>
  );
}

type PendingStepPanelProps = { step: WorkflowStep };

/**
 * QUEUED / RUNNING: skeleton, what is happening, and how long it has been going. The API has
 * no start time for a step, so the timer counts from when this panel first appeared.
 */
export function PendingStepPanel({ step }: PendingStepPanelProps) {
  const queued = step.status === "QUEUED";
  const [startedAt] = useState(() => Date.now());
  const now = useNow();
  const elapsed = now - startedAt;
  const slow = !queued && elapsed > SLOW_STEP_WARNING_MS;

  return (
    <div className="flex flex-col gap-5" aria-busy={true}>
      <div className="flex flex-wrap items-center gap-3">
        <HourglassMedium size={22} className="text-mod-primary-hover" aria-hidden={true} />
        <ModeratorText role="status" className="text-base font-bold text-mod-text">
          {queued ? "Đang xếp hàng" : "AI đang xử lý…"} {STEP_LABELS[step.type].toLocaleLowerCase("vi-VN")}
        </ModeratorText>
        <ModeratorText className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-mod-text-muted">
          <Clock size={16} aria-hidden={true} />
          <span className="sr-only">Đã chạy </span>
          {formatElapsed(elapsed)}
        </ModeratorText>
      </div>

      {slow ? (
        <div role="status" className="flex items-start gap-2 rounded-[10px] border border-mod-attention/40 bg-mod-attention/10 px-3 py-2.5">
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-mod-attention" aria-hidden={true} />
          <ModeratorText className="text-sm font-semibold text-mod-text">
            Bước này đang chạy lâu hơn bình thường. Bạn có thể đợi thêm, hệ thống tự cập nhật khi xong.
          </ModeratorText>
        </div>
      ) : null}

      <SkeletonLines />
    </div>
  );
}
