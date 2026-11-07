import { HistoricalPeriodDetailSchema, type HistoricalPeriodDetailDto, type HistoricalPhaseDetailDto, type HistoricalEntityDetailDto } from "@repo/shared";
import { historicalCatalogService as api } from "./historicalCatalogService";

interface CatalogPage<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface HistoricalBranch {
  period: HistoricalPeriodDetailDto;
  phases: { phase: HistoricalPhaseDetailDto; events: HistoricalEntityDetailDto[] }[];
}

async function allPages<T>(load: (page: number) => Promise<CatalogPage<T>>): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  while (true) {
    const result = await load(page);
    items.push(...result.items);
    if (result.page * result.limit >= result.total) return items;
    page = result.page + 1;
  }
}

export async function loadHistoricalBranch(periodId: string, includeDeleted: boolean): Promise<HistoricalBranch> {
  const [period, phases] = await Promise.all([
    api.detail("period", periodId).then((node) => HistoricalPeriodDetailSchema.parse(node)),
    allPages((page) => api.phases({ periodId, includeDeleted, page })),
  ]);
  return {
    period,
    phases: await Promise.all(phases.map(async (phase) => ({
      phase,
      events: await allPages((page) => api.events({ historicalPhaseId: phase.id, includeDeleted, page })),
    }))),
  };
}
