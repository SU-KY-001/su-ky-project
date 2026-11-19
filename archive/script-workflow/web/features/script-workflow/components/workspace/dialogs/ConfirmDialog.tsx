import { useRef } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ModalDialog } from "./ModalDialog";

const ICON_SIZE_MD = 18;

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Hủy",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <ModalDialog
      open={open}
      title={title}
      description={description}
      busy={busy}
      initialFocusRef={confirmButtonRef}
      onClose={onCancel}
    >
      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-4 font-moderator text-sm font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          ref={confirmButtonRef}
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 font-moderator text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-50",
            tone === "danger" ? "bg-mod-danger hover:opacity-90" : "bg-mod-primary hover:bg-mod-primary-hover",
          )}
        >
          {busy ? <CircleNotch size={ICON_SIZE_MD} weight="bold" className="motion-safe:animate-spin" aria-hidden={true} /> : null}
          {confirmLabel}
        </button>
      </div>
    </ModalDialog>
  );
}
