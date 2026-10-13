import type {
  HistoricalNodeKind,
  HistoricalNodeRecord,
} from "../domain/historical-catalog.repository";
import type { HistoricalCatalogService } from "./historical-catalog.service";
import type { HistoricalCitationService } from "./historical-citation.service";
import type { CatalogReviewService } from "./catalog-review.service";
function outside(child: HistoricalNodeRecord, parent: HistoricalNodeRecord) {
  const start = (n: HistoricalNodeRecord) =>
    n.time.kind === "POINT"
      ? n.time.at.year
      : n.time.kind === "RANGE"
        ? n.time.start?.year
        : undefined;
  const end = (n: HistoricalNodeRecord) =>
    n.time.kind === "POINT"
      ? n.time.at.year
      : n.time.kind === "RANGE"
        ? n.time.end?.year
        : undefined;
  const cs = start(child),
    ce = end(child),
    ps = start(parent),
    pe = end(parent);
  return (cs !== undefined && ps !== undefined && cs < ps) ||
    (ce !== undefined && pe !== undefined && ce > pe)
    ? ["TIME_OUTSIDE_PARENT"]
    : [];
}

export function createHistoricalPresenter(
  catalog: HistoricalCatalogService,
  citations: HistoricalCitationService,
  review: CatalogReviewService,
) {
  return async (kind: HistoricalNodeKind, id: string, detail = true) => {
    const node = await catalog.detail(kind, id);
    const common = {
      ...node,
      citations: detail ? await citations.listCitations({ kind, id }) : [],
    };
    if (kind === "period") return { ...common, phases: [] };
    if (kind === "phase") {
      const p = node.periodId
        ? await catalog.getNode("period", node.periodId)
        : null;
      return {
        ...common,
        warnings: p ? outside(node, p) : [],
        period: p ? { id: p.id, name: p.name } : undefined,
      };
    }
    const phase = node.historicalPhaseId
      ? await catalog.detail("phase", node.historicalPhaseId)
      : null;
    const period = phase?.periodId
      ? await catalog.getNode("period", phase.periodId)
      : null;
    const readiness = await review.getEntityReadiness(id);
    const displayStatus =
      readiness.reasons.includes("MISSING_TIME") ||
      readiness.reasons.includes("MISSING_INFO")
        ? "DRAFT"
        : readiness.reasons.includes("MISSING_SOURCE")
          ? "MISSING_SOURCE"
          : readiness.ready
            ? "COMPLETE"
            : "NEEDS_REVIEW";
    return {
      ...common,
      warnings: phase ? outside(node, phase) : [],
      historicalPhase: phase
        ? {
            ...phase,
            period: period ? { id: period.id, name: period.name } : undefined,
          }
        : null,
      readiness,
      displayStatus,
    };
  };
}
