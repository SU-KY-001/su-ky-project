import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import { X } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ICON_SIZE_MD = 18;

type ModalDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  busy?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  maxWidthClass?: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Accessible modal dialog with focus trap, Escape-to-close, and trigger focus restoration.
 */
export function ModalDialog({
  open,
  title,
  description,
  busy = false,
  initialFocusRef,
  maxWidthClass = "max-w-lg",
  onClose,
  children,
}: ModalDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      previousFocusRef.current = active;
    }

    const focusTarget =
      initialFocusRef?.current ??
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      panelRef.current;
    focusTarget?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (!busy) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
      return;
    }

    if (event.key !== "Tab" || !panelRef.current) return;
    const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;

    if (event.shiftKey) {
      if (current === first || !panelRef.current.contains(current)) {
        event.preventDefault();
        last?.focus();
      }
    } else if (current === last || !panelRef.current.contains(current)) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-mod-text/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto rounded-[16px] border border-mod-border bg-mod-surface p-5 shadow-xl focus:outline-none",
          maxWidthClass,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <ModeratorText id={titleId} as="h2" className="text-lg font-extrabold text-mod-text">
              {title}
            </ModeratorText>
            {description ? (
              <ModeratorText id={descriptionId} as="p" className="text-sm text-mod-text-muted">
                {description}
              </ModeratorText>
            ) : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] border border-mod-border bg-mod-surface text-mod-text-muted hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            <X size={ICON_SIZE_MD} weight="bold" aria-hidden={true} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
