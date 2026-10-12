import { useId, type RefObject } from "react";
import { CircleNotch, Export, WarningCircle } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import type { WorkflowImportPreview } from "../../api/importApi";
import { RateLimitNotice } from "../create/Notices";
import { Callout } from "../workspace/steps/stepUi";

export const ICON_SIZE = 16;
export const STATUS_ICON_SIZE = 18;

export const PRIMARY_ACTION_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 text-sm font-bold text-white no-underline transition-colors hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-60";

const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-mod-border bg-mod-surface px-4 text-sm font-bold text-mod-text transition-colors hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-60";

function formatPreviewSummary(preview: WorkflowImportPreview): string {
  const sourceCount = preview.sources.length;
  if (preview.target.kind === "EXISTING_SERIES") {
    return `Sẽ thêm 3 tập nháp vào Series “${preview.target.seriesTitle}” và ${sourceCount} nguồn`;
  }
  return `Sẽ tạo Series “${preview.target.seriesTitle}” với 3 tập nháp và ${sourceCount} nguồn`;
}

type StudioImportDialogProps = {
  /** Owned by the caller, which runs the focus trap against this container. */
  dialogRef: RefObject<HTMLDivElement | null>;
  preview: WorkflowImportPreview | undefined;
  previewFetching: boolean;
  /** Set when the preview failed for a reason other than rate limiting. */
  previewErrorMessage: string | null;
  /** Set when the import failed for a reason not handled by the caller (conflict / rate limit). */
  importErrorMessage: string | null;
  importPending: boolean;
  staleReloading: boolean;
  effectiveRateLimit: number | null;
  canConfirm: boolean;
  onRateLimitElapsed: () => void;
  onRetryPreview: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

/** Modal showing the import preview and the confirm/cancel actions for "Nhập vào Studio". */
export function StudioImportDialog({
  dialogRef,
  preview,
  previewFetching,
  previewErrorMessage,
  importErrorMessage,
  importPending,
  staleReloading,
  effectiveRateLimit,
  canConfirm,
  onRateLimitElapsed,
  onRetryPreview,
  onConfirm,
  onClose,
}: StudioImportDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex w-full max-w-lg flex-col gap-4 rounded-[16px] border border-mod-border bg-mod-surface p-6 shadow-xl"
      >
        <ModeratorText as="h2" id={titleId} className="text-lg font-extrabold text-mod-text">
          Nhập kịch bản vào Studio
        </ModeratorText>

        <div id={descriptionId} className="flex flex-col gap-3">
          {staleReloading ? (
            <Callout tone="attention" role="alert">
              <ModeratorText className="text-sm font-bold text-mod-attention">
                Kịch bản đã thay đổi, đang tải lại…
              </ModeratorText>
            </Callout>
          ) : null}

          {effectiveRateLimit !== null ? (
            <RateLimitNotice seconds={effectiveRateLimit} onElapsed={onRateLimitElapsed} />
          ) : null}

          {previewFetching ? (
            <div className="flex items-center gap-2 py-2 text-mod-text-muted" role="status">
              <CircleNotch
                size={STATUS_ICON_SIZE}
                className="animate-spin text-mod-primary motion-reduce:animate-none"
                aria-hidden={true}
              />
              <ModeratorText className="text-sm">
                {staleReloading ? "Kịch bản đã thay đổi, đang tải lại…" : "Đang chuẩn bị thông tin nhập…"}
              </ModeratorText>
            </div>
          ) : previewErrorMessage !== null ? (
            <div role="alert" className="flex flex-col gap-2 rounded-[12px] border border-mod-danger/40 bg-mod-danger/10 p-3">
              <div className="flex items-center gap-2 text-mod-danger">
                <WarningCircle size={STATUS_ICON_SIZE} weight="fill" aria-hidden={true} />
                <ModeratorText className="text-sm font-bold text-mod-danger">
                  {previewErrorMessage}
                </ModeratorText>
              </div>
              <button
                type="button"
                onClick={onRetryPreview}
                className={SECONDARY_BUTTON_CLASS}
              >
                <ModeratorText>Thử lại</ModeratorText>
              </button>
            </div>
          ) : preview ? (
            <>
              <ModeratorText as="p" className="text-base font-semibold text-mod-text">
                {formatPreviewSummary(preview)}
              </ModeratorText>

              {!preview.factCheck.passed ? (
                <Callout
                  tone="attention"
                  title="Báo cáo kiểm định chưa đạt"
                  role="status"
                >
                  <ModeratorText as="p" className="text-sm text-mod-text-muted">
                    Còn {preview.factCheck.issueCount} câu cần lưu ý trong báo cáo kiểm định. Bạn vẫn có thể tiếp tục nhập bản nháp vào Studio.
                  </ModeratorText>
                </Callout>
              ) : null}
            </>
          ) : null}

          {importErrorMessage !== null ? (
            <Callout tone="danger" role="alert">
              <ModeratorText className="text-sm text-mod-danger">
                {importErrorMessage}
              </ModeratorText>
            </Callout>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={SECONDARY_BUTTON_CLASS}
          >
            <ModeratorText>Hủy</ModeratorText>
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
            className={PRIMARY_ACTION_CLASS}
          >
            {importPending ? (
              <CircleNotch size={ICON_SIZE} className="animate-spin motion-reduce:animate-none" aria-hidden={true} />
            ) : (
              <Export size={ICON_SIZE} aria-hidden={true} />
            )}
            <ModeratorText>Xác nhận nhập</ModeratorText>
          </button>
        </div>
      </div>
    </div>
  );
}
