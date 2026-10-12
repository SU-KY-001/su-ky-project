import { useRef } from "react";
import { ArrowsClockwise, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { ModalDialog } from "./ModalDialog";

const ICON_SIZE_MD = 18;
const ICON_SIZE_LG = 22;

type ConflictDialogProps = {
  open: boolean;
  reloading?: boolean;
  onReload: () => void;
  onClose: () => void;
};

/** 409 CONFLICT dialog: prompts the moderator to reload while preserving any unsaved drafts in the store. */
export function ConflictDialog({ open, reloading = false, onReload, onClose }: ConflictDialogProps) {
  const reloadButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <ModalDialog
      open={open}
      title="Kịch bản vừa thay đổi ở nơi khác"
      busy={reloading}
      initialFocusRef={reloadButtonRef}
      onClose={onClose}
    >
      <div className="flex items-start gap-3 rounded-[12px] border border-mod-attention/40 bg-mod-attention/10 p-3.5">
        <WarningCircle size={ICON_SIZE_LG} weight="fill" className="mt-0.5 shrink-0 text-mod-attention" aria-hidden={true} />
        <ModeratorText as="p" className="text-sm text-mod-text">
          Kịch bản này vừa được cập nhật ở một cửa sổ hoặc phiên làm việc khác. Nội dung nháp bạn đang nhập vẫn được giữ nguyên. Hãy bấm <strong>Tải lại</strong> để đồng bộ phiên bản mới nhất trước khi tiếp tục.
        </ModeratorText>
      </div>
      <div className="flex flex-wrap justify-end gap-3 pt-1">
        <button
          type="button"
          disabled={reloading}
          onClick={onClose}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-4 font-moderator text-sm font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
        >
          Đóng
        </button>
        <button
          ref={reloadButtonRef}
          type="button"
          disabled={reloading}
          onClick={onReload}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 font-moderator text-sm font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-50"
        >
          {reloading ? (
            <CircleNotch size={ICON_SIZE_MD} weight="bold" className="motion-safe:animate-spin" aria-hidden={true} />
          ) : (
            <ArrowsClockwise size={ICON_SIZE_MD} weight="bold" aria-hidden={true} />
          )}
          Tải lại
        </button>
      </div>
    </ModalDialog>
  );
}
