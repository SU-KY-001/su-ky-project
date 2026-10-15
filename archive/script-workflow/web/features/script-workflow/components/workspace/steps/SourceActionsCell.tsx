import { PencilSimple, Trash } from "@phosphor-icons/react";
import type { SourceItem } from "@repo/shared";

const ICON_SIZE_SM = 14;

type SourceActionsCellProps = {
  source: SourceItem;
  confirmingDelete: boolean;
  onEdit?: (source: SourceItem) => void;
  onRequestDelete?: (sourceId: string) => void;
  onConfirmDelete?: (sourceId: string) => void;
  onCancelDelete?: () => void;
};

/** Interactive sources-table cell: edit/delete, switching to an inline confirm pair while a delete is pending. */
export function SourceActionsCell({
  source,
  confirmingDelete,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: SourceActionsCellProps) {
  return (
    <td className="whitespace-nowrap px-4 py-3.5 text-right">
      <div className="inline-flex flex-wrap items-center justify-end gap-2">
        {confirmingDelete ? (
          <>
            <button
              type="button"
              onClick={onCancelDelete}
              className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => onConfirmDelete?.(source.id)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-mod-danger px-3 font-moderator text-xs font-bold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
            >
              <Trash size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
              Xác nhận xoá
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onEdit?.(source)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
            >
              <PencilSimple size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
              Sửa
            </button>
            <button
              type="button"
              onClick={() => onRequestDelete?.(source.id)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-danger hover:bg-mod-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
            >
              <Trash size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
              Xoá
            </button>
          </>
        )}
      </div>
    </td>
  );
}
