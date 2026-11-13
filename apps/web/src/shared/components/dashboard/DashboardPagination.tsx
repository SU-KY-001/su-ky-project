import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/components/ui/pagination";

type PaginationEntry = number | "ellipsis";

function pageEntries(page: number, totalPages: number): PaginationEntry[] {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  const visible = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...visible]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
  return pages.flatMap((value, index) => {
    const previous = pages[index - 1];
    return previous && value - previous > 1 ? ["ellipsis" as const, value] : [value];
  });
}

export function DashboardPagination({
  page,
  limit,
  total,
  itemLabel,
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const goTo = (nextPage: number) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    onPageChange(nextPage);
  };

  return (
    <div className="flex w-full flex-col items-center justify-between gap-3 sm:flex-row">
      <span className="text-sm tabular-nums text-mod-text-muted">
        Trang {page}/{totalPages} · {total} {itemLabel}
      </span>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={`?page=${Math.max(1, page - 1)}`}
              aria-disabled={page <= 1}
              tabIndex={page <= 1 ? -1 : undefined}
              className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
              onClick={goTo(page - 1)}
            />
          </PaginationItem>
          {pageEntries(page, totalPages).map((entry, index) => entry === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={entry}>
              <PaginationLink
                href={`?page=${entry}`}
                isActive={entry === page}
                aria-label={`Trang ${entry}`}
                onClick={goTo(entry)}
              >
                {entry}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href={`?page=${Math.min(totalPages, page + 1)}`}
              aria-disabled={page >= totalPages}
              tabIndex={page >= totalPages ? -1 : undefined}
              className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
              onClick={goTo(page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
