import { useCallback, useState } from "react";

interface UsePaginationOptions {
  initialPage?: number;
}

export function usePagination({ initialPage = 1 }: UsePaginationOptions = {}) {
  const [page, setPage] = useState(initialPage);

  const nextPage = useCallback((): void => {
    setPage((currentPage) => currentPage + 1);
  }, []);

  const reset = useCallback((): void => {
    setPage(initialPage);
  }, [initialPage]);

  return { page, nextPage, reset };
}
