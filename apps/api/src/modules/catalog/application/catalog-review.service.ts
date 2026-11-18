import type { HistoricalReadinessDto } from "@repo/shared";
import type {
  HistoricalEvidenceRepository,
} from "../domain/historical-catalog.repository";
import type { HistoricalCatalogService } from "./historical-catalog.service";

export class CatalogReviewService {
  constructor(
    readonly repository: HistoricalEvidenceRepository,
    readonly catalog: HistoricalCatalogService,
  ) {}
  async summary() {
    return this.repository.summary();
  }
  async getEntityReadiness(id: string): Promise<HistoricalReadinessDto> {
    const node = await this.catalog.getNode("entity", id);
    const reasons: string[] = [];
    const approximate =
      node.time.kind === "POINT"
        ? node.time.at.approximate
        : node.time.kind === "RANGE"
          ? Boolean(node.time.start?.approximate || node.time.end?.approximate)
          : false;
    if (approximate && !node.time.note?.trim())
      reasons.push("MISSING_TIME_NOTE");
    if (node.deletedAt) reasons.push("CONTENT_IN_TRASH");
    if (!node.name.trim() || !node.summary?.trim())
      reasons.push("MISSING_INFO");
    if (
      node.time.kind === "UNKNOWN" ||
      (node.time.kind === "RANGE" && !node.time.start && !node.time.end)
    )
      reasons.push("MISSING_TIME");
    const phase = node.historicalPhaseId
      ? await this.repository.get("phase", node.historicalPhaseId)
      : null;
    const period = phase?.periodId
      ? await this.repository.get("period", phase.periodId)
      : null;
    if (
      !phase ||
      phase.deletedAt ||
      !phase.isActive ||
      !period ||
      period.deletedAt ||
      !period.isActive
    )
      reasons.push("MISSING_PARENT");
    return { ready: reasons.length === 0, reasons: [...new Set(reasons)] };
  }
}
