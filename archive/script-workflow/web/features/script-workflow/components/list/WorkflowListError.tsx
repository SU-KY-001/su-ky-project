import { ArrowClockwise, WarningOctagon } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { errorMessage, errorRequestId } from "@/lib/apiError";

type WorkflowListErrorProps = { error: unknown; retrying: boolean; onRetry: () => void };

export function WorkflowListError({ error, retrying, onRetry }: WorkflowListErrorProps) {
  const requestId = errorRequestId(error);
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-mod-danger/40 bg-mod-danger/5 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <WarningOctagon size={22} weight="fill" className="mt-0.5 shrink-0 text-mod-danger" aria-hidden={true} />
        <div className="flex min-w-0 flex-col gap-1">
          <ModeratorText className="text-sm font-bold text-mod-danger">Không tải được danh sách kịch bản</ModeratorText>
          <ModeratorText className="break-words text-xs text-mod-text-muted">{errorMessage(error)}</ModeratorText>
          {requestId ? <ModeratorText className="text-xs text-mod-text-secondary">Mã yêu cầu: {requestId}</ModeratorText> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-mod-danger px-4 text-sm font-bold text-mod-danger hover:bg-mod-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-60"
      >
        <ArrowClockwise size={18} weight="bold" className={retrying ? "motion-safe:animate-spin" : undefined} aria-hidden={true} />
        Thử lại
      </button>
    </div>
  );
}
