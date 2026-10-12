import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowSquareOut, Export } from "@phosphor-icons/react";
import type { ImportResult } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { MODERATOR_DASHBOARD_PATH } from "@/features/moderator/navItems";
import { useModeratorToastStore } from "@/features/moderator/toastStore";
import { errorMessage, errorRequestId, isApiError } from "@/lib/apiError";
import { useImportWorkflow, useWorkflowImportPreview } from "../../hooks/useWorkflowImport";
import { DEFAULT_RETRY_AFTER_SECONDS, TOO_MANY_REQUESTS_STATUS } from "../create/constants";
import { ICON_SIZE, PRIMARY_ACTION_CLASS, StudioImportDialog } from "./StudioImportDialog";

const HTTP_CONFLICT = 409;
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
        <StudioImportDialog
          dialogRef={dialogRef}
          preview={preview}
          previewFetching={previewQuery.isFetching}
          previewErrorMessage={previewQuery.isError && !previewRateLimited ? errorMessage(previewError) : null}
          importErrorMessage={
            importMutation.isError &&
            !isApiError(importMutation.error, HTTP_CONFLICT) &&
            !isApiError(importMutation.error, TOO_MANY_REQUESTS_STATUS)
              ? errorMessage(importMutation.error)
              : null
          }
          importPending={importMutation.isPending}
          staleReloading={staleReloading}
          effectiveRateLimit={effectiveRateLimit}
          canConfirm={canConfirm}
          onRateLimitElapsed={clearRateLimit}
          onRetryPreview={() => void previewQuery.refetch()}
          onConfirm={handleConfirm}
          onClose={closeDialog}
        />
      ) : null}
    </>
  );
}
