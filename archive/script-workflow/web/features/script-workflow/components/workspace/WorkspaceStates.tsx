import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowClockwise, FileX, WarningCircle } from "@phosphor-icons/react";
import { errorMessage, errorRequestId } from "@/lib/apiError";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { SCRIPT_WORKFLOWS_PATH } from "@/features/moderator/navItems";

const STEPPER_SKELETON_ROWS = 7;
const LINK_BUTTON_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 text-sm font-bold text-white no-underline hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary";

const SKELETON_BLOCK = "animate-pulse rounded-md bg-mod-canvas-accent motion-reduce:animate-none";

/** First load: same layout as the loaded workspace (stepper and panel). */
export function WorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-busy={true}>
      <span className="sr-only">Đang tải kịch bản…</span>
      <div className={`${SKELETON_BLOCK} h-9 w-2/3`} aria-hidden={true} />
      <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]" aria-hidden={true}>
        <div className="flex flex-col gap-2">
          {Array.from({ length: STEPPER_SKELETON_ROWS }, (_, index) => (
            <div key={index} className={`${SKELETON_BLOCK} h-11`} />
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-[16px] border border-mod-border bg-mod-surface p-5">
          <div className={`${SKELETON_BLOCK} h-6 w-1/2`} />
          <div className={`${SKELETON_BLOCK} h-4 w-full`} />
          <div className={`${SKELETON_BLOCK} h-4 w-11/12`} />
          <div className={`${SKELETON_BLOCK} h-4 w-4/5`} />
          <div className={`${SKELETON_BLOCK} h-32 w-full`} />
        </div>
      </div>
    </div>
  );
}

function StateCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div role="alert" className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-3 rounded-[16px] border border-mod-border bg-mod-surface p-8 text-center">
      {icon}
      <ModeratorText as="h1" className="text-xl font-extrabold tracking-tight text-mod-text">{title}</ModeratorText>
      {children}
    </div>
  );
}

export function WorkspaceNotFound() {
  return (
    <StateCard icon={<FileX size={32} className="text-mod-text-secondary" aria-hidden={true} />} title="Không tìm thấy kịch bản">
      <ModeratorText as="p" className="text-sm text-mod-text-secondary">
        Kịch bản này không tồn tại hoặc đã bị xoá.
      </ModeratorText>
      <Link to={SCRIPT_WORKFLOWS_PATH} className={LINK_BUTTON_CLASS}>Về danh sách kịch bản</Link>
    </StateCard>
  );
}

export function WorkspaceError({ error, retrying, onRetry }: { error: Error; retrying: boolean; onRetry: () => void }) {
  const requestId = errorRequestId(error);
  return (
    <StateCard icon={<WarningCircle size={32} weight="fill" className="text-mod-danger" aria-hidden={true} />} title="Không tải được kịch bản">
      <ModeratorText as="p" className="text-sm text-mod-text-secondary">{errorMessage(error)}</ModeratorText>
      {requestId ? <ModeratorText as="p" className="font-mono text-xs text-mod-text-secondary">Mã yêu cầu: {requestId}</ModeratorText> : null}
      <button
        type="button"
        disabled={retrying}
        onClick={onRetry}
        className={`${LINK_BUTTON_CLASS} disabled:opacity-60`}
      >
        <ArrowClockwise size={16} aria-hidden={true} />
        Thử lại
      </button>
    </StateCard>
  );
}
