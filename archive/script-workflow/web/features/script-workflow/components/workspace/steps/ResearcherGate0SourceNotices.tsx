import { ArrowUUpLeft, CircleNotch, FloppyDisk } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { INPUT_CLASS } from "./ResearcherGate0FocusSection";
import { ICON_SIZE_SM } from "./ResearcherSources";

const ICON_SIZE_MD = 18;

type DeletedSourceNoticeProps = {
  sourceName: string;
  onUndo: () => void;
};

/** Status row shown after deleting a source, offering a one-step undo. */
export function DeletedSourceNotice({ sourceName, onUndo }: DeletedSourceNoticeProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-mod-attention/40 bg-mod-attention/10 px-3.5 py-2.5"
    >
      <ModeratorText className="text-sm font-semibold text-mod-text">
        Đã xoá nguồn “{sourceName}”.
      </ModeratorText>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
      >
        <ArrowUUpLeft size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
        Hoàn tác
      </button>
    </div>
  );
}

type UnsavedSourcesBarProps = {
  note: string;
  saving: boolean;
  saveDisabled: boolean;
  onNoteChange: (note: string) => void;
  onResetAll: () => void;
  onSave: () => void;
};

/** Unsaved catalogue edits: revert-all, save as a new version, and an optional change note. */
export function UnsavedSourcesBar({ note, saving, saveDisabled, onNoteChange, onResetAll, onSave }: UnsavedSourcesBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-mod-attention/40 bg-mod-attention/10 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ModeratorText className="text-sm font-bold text-mod-text">
          Bạn có thay đổi danh mục nguồn chưa lưu.
        </ModeratorText>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onResetAll}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            Hoàn tác tất cả
          </button>
          <button
            type="button"
            disabled={saveDisabled}
            onClick={onSave}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-mod-primary px-3.5 font-moderator text-xs font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            {saving ? (
              <CircleNotch size={ICON_SIZE_MD} weight="bold" className="motion-safe:animate-spin" aria-hidden={true} />
            ) : (
              <FloppyDisk size={ICON_SIZE_MD} weight="bold" aria-hidden={true} />
            )}
            Lưu chỉnh sửa
          </button>
        </div>
      </div>
      <input
        type="text"
        disabled={saving}
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="Ghi chú thay đổi danh mục nguồn (tuỳ chọn)…"
        aria-label="Ghi chú thay đổi danh mục nguồn"
        className={INPUT_CLASS}
      />
    </div>
  );
}
