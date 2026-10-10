import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";

const PAGE_BUTTON_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-[10px] border border-mod-border bg-mod-surface px-3 text-sm font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:cursor-not-allowed disabled:opacity-50";

type ListPaginationProps = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function ListPagination({ page, limit, total, onPageChange }: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Phân trang danh sách kịch bản" className="flex items-center justify-between gap-3">
      <button type="button" className={PAGE_BUTTON_CLASS} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <CaretLeft size={16} weight="bold" aria-hidden={true} />
        <span className="hidden sm:inline">Trang trước</span>
        <span className="sr-only sm:hidden">Trang trước</span>
      </button>
      <ModeratorText className="text-sm text-mod-text-muted" aria-live="polite">
        Trang {page} / {totalPages} · {total} kịch bản
      </ModeratorText>
      <button type="button" className={PAGE_BUTTON_CLASS} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        <span className="hidden sm:inline">Trang sau</span>
        <span className="sr-only sm:hidden">Trang sau</span>
        <CaretRight size={16} weight="bold" aria-hidden={true} />
      </button>
    </nav>
  );
}
