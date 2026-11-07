import type { ReactNode } from "react";
import { WifiSlash, XCircle } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";

type RunFailedBannerProps = {
  /** Vietnamese name of the step the run stopped at, when known. */
  stepName: string | null;
  errorMessage: string | null;
  /** The retry button, supplied by the rerun phase. */
  action?: ReactNode;
};

/** Red banner at the top when the whole run is FAILED. */
export function RunFailedBanner({ stepName, errorMessage, action }: RunFailedBannerProps) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-[12px] border border-mod-danger/40 bg-mod-danger/10 px-4 py-3.5">
      <XCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-mod-danger" aria-hidden={true} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <ModeratorText className="text-sm font-extrabold text-mod-danger">
          {stepName ? `Kịch bản dừng ở bước “${stepName}”` : "Kịch bản đã dừng do lỗi"}
        </ModeratorText>
        {errorMessage ? <ModeratorText as="p" className="text-sm text-mod-text">{errorMessage}</ModeratorText> : null}
        <ModeratorText as="p" className="text-sm text-mod-text-muted">
          Bấm <strong>Làm lại</strong> hoặc tạo kịch bản mới. Lỗi tạm thời đã được hệ thống tự thử lại tối đa 3 lần trước khi báo thất bại.
        </ModeratorText>
        {action}
      </div>
    </div>
  );
}

/** Shown while realtime updates are down and the page falls back to polling. */
export function RealtimeLostBanner() {
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-[12px] border border-mod-attention/40 bg-mod-attention/10 px-4 py-3">
      <WifiSlash size={20} weight="bold" className="shrink-0 text-mod-attention" aria-hidden={true} />
      <ModeratorText className="text-sm font-semibold text-mod-text">
        Mất kết nối realtime. Trang vẫn tự cập nhật mỗi vài giây.
      </ModeratorText>
    </div>
  );
}
