import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowSquareOut, CheckCircle, CircleNotch, Export, WarningCircle } from "@phosphor-icons/react";
import type { ImportResult } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { MODERATOR_DASHBOARD_PATH } from "@/features/moderator/navItems";
import { useModeratorToastStore } from "@/features/moderator/toastStore";
import { errorMessage, errorRequestId, isApiError } from "@/lib/apiError";
import type { WorkflowImportPreview } from "../../api/importApi";
import { useImportWorkflow, useWorkflowImportPreview } from "../../hooks/useWorkflowImport";
import { DEFAULT_RETRY_AFTER_SECONDS, TOO_MANY_REQUESTS_STATUS } from "../create/constants";
import { RateLimitNotice } from "../create/Notices";
import { Callout } from "../workspace/steps/stepUi";

const HTTP_CONFLICT = 409;
const ICON_SIZE = 16;
const STATUS_ICON_SIZE = 18;
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PRIMARY_ACTION_CLASS =
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

export function ImportResultBanner({ result }: { result: ImportResult }) {
  const newSourcesCount = result.createdSourceIds.length;
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-[12px] border border-mod-success/40 bg-mod-success/10 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-mod-success">
          <CheckCircle size={STATUS_ICON_SIZE} weight="fill" aria-hidden={true} />
          <ModeratorText className="text-sm font-extrabold text-mod-success">
            Đã tạo Series và 3 tập nháp ({newSourcesCount} nguồn mới)
          </ModeratorText>
        </div>
        <Link
          to={MODERATOR_DASHBOARD_PATH}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-mod-primary px-3.5 text-xs font-bold text-white no-underline hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
        >
          <ModeratorText>Mở trong Studio</ModeratorText>
          <ArrowSquareOut size={ICON_SIZE} aria-hidden={true} />
        </Link>
      </div>
      {result.episodes.length > 0 ? (
        <ul className="flex flex-col gap-1 pl-6 text-sm text-mod-text">
          {result.episodes.map((episode) => (
            <li key={episode.episodeId} className="list-disc">
              <ModeratorText>
                Tập {episode.episodeNo}: {episode.title}
              </ModeratorText>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type StudioImportButtonProps = {
  workflowId: number;
  importedResult: ImportResult | null | undefined;
};

/**
 * Header button for S4:
 * - When already imported: renders a link "Mở trong Studio" pointing to `/moderator`.
 * - Otherwise: renders "Nhập vào Studio" which opens the preview confirmation modal.
 */
export function StudioImportButton({ workflowId, importedResult }: StudioImportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [staleReloading, setStaleReloading] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const showToast = useModeratorToastStore((state) => state.show);
  const previewQuery = useWorkflowImportPreview(workflowId, dialogOpen);
  const importMutation = useImportWorkflow(workflowId);

  const clearRateLimit = useCallback(() => setRateLimitSeconds(null), []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setStaleReloading(false);
    window.setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  }, []);

  const openDialog = () => {
    setStaleReloading(false);
    importMutation.reset();
    setDialogOpen(true);
    if (previewQuery.data !== undefined || previewQuery.isError) {
      void previewQuery.refetch();
    }
  };

  // Focus first interactive element on open, trap Tab, and handle Escape.
  useEffect(() => {
    if (!dialogOpen) return;
    const container = dialogRef.current;
    const focusables = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusables?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== "Tab" || !container) return;
      const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dialogOpen, closeDialog]);

  if (importedResult) {
    return (
      <Link to={MODERATOR_DASHBOARD_PATH} className={PRIMARY_ACTION_CLASS}>
        <ModeratorText>Mở trong Studio</ModeratorText>
        <ArrowSquareOut size={ICON_SIZE} aria-hidden={true} />
      </Link>
    );
  }

  const preview = previewQuery.data;
  const previewError = previewQuery.error;
  const previewRateLimited = isApiError(previewError, TOO_MANY_REQUESTS_STATUS);
  const effectiveRateLimit =
    rateLimitSeconds ??
    (previewRateLimited ? (previewError.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS) : null);

  const canConfirm =
    Boolean(preview) &&
    !previewQuery.isFetching &&
    !importMutation.isPending &&
    effectiveRateLimit === null;

  const handleConfirm = () => {
    if (!preview) return;
    setStaleReloading(false);
    importMutation.mutate(preview, {
      onSuccess: () => {
        closeDialog();
        showToast("Đã tạo Series và 3 tập nháp");
      },
      onError: (error) => {
        if (isApiError(error, HTTP_CONFLICT)) {
          setStaleReloading(true);
          void previewQuery.refetch();
        } else if (isApiError(error, TOO_MANY_REQUESTS_STATUS)) {
          setRateLimitSeconds(error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS);
        } else {
          showToast(errorMessage(error), errorRequestId(error));
        }
      },
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        className={PRIMARY_ACTION_CLASS}
      >
        <Export size={ICON_SIZE} aria-hidden={true} />
        <ModeratorText>Nhập vào Studio</ModeratorText>
      </button>

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDialog();
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
                <RateLimitNotice seconds={effectiveRateLimit} onElapsed={clearRateLimit} />
              ) : null}

              {previewQuery.isFetching ? (
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
              ) : previewQuery.isError && !previewRateLimited ? (
                <div role="alert" className="flex flex-col gap-2 rounded-[12px] border border-mod-danger/40 bg-mod-danger/10 p-3">
                  <div className="flex items-center gap-2 text-mod-danger">
                    <WarningCircle size={STATUS_ICON_SIZE} weight="fill" aria-hidden={true} />
                    <ModeratorText className="text-sm font-bold text-mod-danger">
                      {errorMessage(previewError)}
                    </ModeratorText>
                  </div>
                  <button
                    type="button"
                    onClick={() => void previewQuery.refetch()}
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

              {importMutation.isError &&
              !isApiError(importMutation.error, HTTP_CONFLICT) &&
              !isApiError(importMutation.error, TOO_MANY_REQUESTS_STATUS) ? (
                <Callout tone="danger" role="alert">
                  <ModeratorText className="text-sm text-mod-danger">
                    {errorMessage(importMutation.error)}
                  </ModeratorText>
                </Callout>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeDialog}
                className={SECONDARY_BUTTON_CLASS}
              >
                <ModeratorText>Hủy</ModeratorText>
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={handleConfirm}
                className={PRIMARY_ACTION_CLASS}
              >
                {importMutation.isPending ? (
                  <CircleNotch size={ICON_SIZE} className="animate-spin motion-reduce:animate-none" aria-hidden={true} />
                ) : (
                  <Export size={ICON_SIZE} aria-hidden={true} />
                )}
                <ModeratorText>Xác nhận nhập</ModeratorText>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
