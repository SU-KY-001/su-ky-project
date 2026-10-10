import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { errorMessage, errorRequestId } from "@/lib/apiError";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";

const SKELETON_ROW_COUNT = 5;
const ICON_SIZE_RETRY = 16;
const ICON_SIZE_ALERT = 28;

const SKELETON_BLOCK_CLASS = "animate-pulse rounded-md bg-mod-canvas-accent motion-reduce:animate-none";

export function EventLogSkeleton() {
  return (
    <div
      role="status"
      aria-busy={true}
      className="flex flex-col gap-3 rounded-[16px] border border-mod-border bg-mod-surface p-4 sm:p-5"
    >
      <span className="sr-only">Đang tải nhật ký sự kiện…</span>
      <div className={`${SKELETON_BLOCK_CLASS} h-6 w-48`} aria-hidden={true} />
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <div
          key={index}
          aria-hidden={true}
          className="flex flex-col gap-2 rounded-[12px] border border-mod-border bg-mod-canvas p-3.5"
        >
          <div className={`${SKELETON_BLOCK_CLASS} h-5 w-56`} />
          <div className={`${SKELETON_BLOCK_CLASS} h-4 w-4/5`} />
        </div>
      ))}
    </div>
  );
}

export function EventLogError({ error, retrying, onRetry }: { error: Error; retrying: boolean; onRetry: () => void }) {
  const requestId = errorRequestId(error);
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[16px] border border-mod-border bg-mod-surface p-6 text-center"
    >
      <WarningCircle size={ICON_SIZE_ALERT} weight="fill" className="text-mod-danger" aria-hidden={true} />
      <ModeratorText as="h2" className="text-base font-extrabold text-mod-text">
        Không tải được nhật ký sự kiện
      </ModeratorText>
      <ModeratorText as="p" className="text-sm text-mod-text-secondary">
        {errorMessage(error)}
      </ModeratorText>
      {requestId ? (
        <ModeratorText as="p" className="font-mono text-xs text-mod-text-secondary">
          Mã yêu cầu: {requestId}
        </ModeratorText>
      ) : null}
      <button
        type="button"
        disabled={retrying}
        onClick={onRetry}
        className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 text-sm font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-60"
      >
        <ArrowClockwise size={ICON_SIZE_RETRY} aria-hidden={true} />
        <ModeratorText>Thử lại</ModeratorText>
      </button>
    </div>
  );
}
