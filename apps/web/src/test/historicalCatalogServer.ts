import type { HistoricalPeriodDetailDto } from "@repo/shared";

const PERIOD_ID = "11111111-1111-4111-8111-111111111111";

function createPeriod(owner: string): HistoricalPeriodDetailDto {
  return {
    id: PERIOD_ID,
    name: "Thời kỳ kiểm thử",
    slug: "thoi-ky-kiem-thu",
    summary: "Dữ liệu phục vụ kiểm thử giao diện quản lý lịch sử.",
    time: {
      kind: "RANGE",
      start: { year: 938, precision: "YEAR", approximate: false },
      end: { year: 1009, precision: "YEAR", approximate: false },
      endState: "KNOWN",
    },
    timeLabel: "938–1009",
    startYear: 938,
    endYear: 1009,
    version: 1,
    deletedAt: null,
    createdById: owner,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    childCount: 0,
    sourceCount: 0,
    citationCount: 0,
    podcastCount: 0,
    citations: [],
    warnings: [],
    isActive: true,
    phases: [],
  };
}

export function historicalCatalogServer(owner: string) {
  const periods = [createPeriod(owner)];

  return {
    periods,
    async respond(
      input: URL | RequestInfo,
      init?: RequestInit,
    ): Promise<Response | undefined> {
      const url = new URL(
        input instanceof Request ? input.url : input.toString(),
      );
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");
      const collectionPath = "/api/studio/historical-periods";

      if (method === "GET" && url.pathname === collectionPath) {
        return Response.json({
          items: periods,
          page: 1,
          limit: 20,
          total: periods.length,
        });
      }

      if (method === "GET" && url.pathname.startsWith(`${collectionPath}/`)) {
        const id = url.pathname.slice(collectionPath.length + 1);
        const period = periods.find((item) => item.id === id);
        return period
          ? Response.json(period)
          : Response.json(
              { error_code: "NOT_FOUND", message: "Không tìm thấy thời kỳ" },
              { status: 404 },
            );
      }

      return undefined;
    },
  };
}
