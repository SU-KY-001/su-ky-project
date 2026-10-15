import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  historicalCatalogService as api,
  type CatalogFilter,
  type HistoricalDraft,
  type HistoricalKind,
} from "../services/historicalCatalogService";
import { useIdempotentMutation } from "@/lib/useIdempotentMutation";
import { loadHistoricalBranch, type HistoricalBranch } from "../services/historicalBranchService";
import type { UseQueryResult } from "@tanstack/react-query";
export const catalogKeys = { root: ["historical-catalog"] as const };
export function useHistoricalBranch(periodId: string, includeDeleted: boolean): UseQueryResult<HistoricalBranch, Error> {
  return useQuery({
    queryKey: [...catalogKeys.root, "branch", periodId, includeDeleted],
    queryFn: () => loadHistoricalBranch(periodId, includeDeleted),
  });
}
const next = (page: { page: number; limit: number; total: number }) =>
  page.page * page.limit < page.total ? page.page + 1 : undefined;
export function useHistoricalPeriods(f: CatalogFilter = {}) {
  return useInfiniteQuery({
    queryKey: [...catalogKeys.root, "periods", f],
    queryFn: ({ pageParam }) => api.periods({ ...f, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: next,
  });
}
export function useHistoricalPhases(
  periodId: string | undefined,
  f: CatalogFilter = {},
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: [...catalogKeys.root, "phases", periodId, f],
    queryFn: ({ pageParam }) =>
      api.phases({
        ...f,
        ...(periodId ? { periodId } : {}),
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: next,
    enabled,
  });
}
export function useHistoricalEntities(f: CatalogFilter = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...catalogKeys.root, "events", f],
    queryFn: ({ pageParam }) => api.events({ ...f, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: next,
    enabled,
  });
}
export function useHistoricalSummary() {
  return useQuery({
    queryKey: [...catalogKeys.root, "summary"],
    queryFn: api.summary,
  });
}
export function useHistoricalEvent(id: string) {
  return useQuery({
    queryKey: [...catalogKeys.root, "event", id],
    queryFn: () => api.event(id),
    enabled: Boolean(id),
  });
}
export function useHistoricalNode(kind: HistoricalKind, id: string) {
  return useQuery({
    queryKey: [...catalogKeys.root, "detail", kind, id],
    queryFn: () => api.detail(kind, id),
    enabled: Boolean(id),
  });
}
export function useHistoricalSources(
  q = "",
  page = 1,
  includeArchived = false,
) {
  return useQuery({
    queryKey: [...catalogKeys.root, "sources", q, page, includeArchived],
    queryFn: () => api.sources(q, page, includeArchived),
  });
}
export function useCatalogInvalidation() {
  const c = useQueryClient();
  return async () => {
    await c.invalidateQueries({ queryKey: catalogKeys.root });
    await c.invalidateQueries({ queryKey: ["podcast-production"] });
  };
}
export function useCreateHistoricalItem() {
  const invalidate = useCatalogInvalidation();
  return useIdempotentMutation(
    (d: HistoricalDraft, key) => api.create(d, key),
    invalidate,
  );
}
export function usePatchHistoricalItem() {
  const invalidate = useCatalogInvalidation();
  return useMutation({
    mutationFn: (d: {
      kind: HistoricalKind;
      id: string;
      input: Omit<HistoricalDraft, "kind">;
      baseVersion: number;
    }) => api.patch(d.kind, d.id, d.input, d.baseVersion),
    onSuccess: invalidate,
  });
}
export function useDeleteHistoricalItem() {
  const invalidate = useCatalogInvalidation();
  return useMutation({
    mutationFn: (d: {
      kind: HistoricalKind;
      id: string;
      baseVersion: number;
    }) => api.remove(d.kind, d.id, d.baseVersion),
    onSuccess: invalidate,
  });
}
export function useRestoreHistoricalItem() {
  const invalidate = useCatalogInvalidation();
  return useMutation({
    mutationFn: (d: {
      kind: HistoricalKind;
      id: string;
      baseVersion: number;
    }) => api.restore(d.kind, d.id, d.baseVersion),
    onSuccess: invalidate,
  });
}
