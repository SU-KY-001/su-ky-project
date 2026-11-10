import type { CatalogActor, HistoricalReadinessDto } from "@repo/shared";
import type {
  HistoricalEvidenceRepository,
} from "../domain/historical-catalog.repository";
import type { HistoricalCatalogService } from "./historical-catalog.service";
import type { HistoricalCitationService } from "./historical-citation.service";
import { DomainError } from "../../../core/errors/domain-error";

export class CatalogReviewService {
  constructor(
    readonly repository: HistoricalEvidenceRepository,
    readonly catalog: HistoricalCatalogService,
    readonly citations: HistoricalCitationService,
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
  async reviewSource(
    actor: CatalogActor,
    id: string,
    input: {
      baseVersion: number;
      expectedStatus: "PENDING" | "VERIFIED" | "REJECTED";
      decision: "VERIFY" | "REJECT";
      note: string;
    },
  ) {
    const source = await this.repository.getSource(id);
    if (!source)
      throw new DomainError(404, "NOT_FOUND", "Không tìm thấy nguồn");
    this.assertReviewer(actor, source.createdById);
    if (
      input.expectedStatus === "REJECTED" ||
      (input.expectedStatus === "VERIFIED" && input.decision !== "REJECT")
    )
      throw new DomainError(
        409,
        "INVALID_REVIEW_STATE",
        "Nguồn cần chỉnh sửa trước khi gửi xác minh lại",
      );
    return this.repository.reviewSource(
      actor.userId,
      id,
      input.baseVersion,
      input.expectedStatus,
      input.decision === "VERIFY" ? "VERIFIED" : "REJECTED",
      input.note,
    );
  }
  private assertReviewer(actor: CatalogActor, creator: string | null) {
    if (!["moderator", "admin"].includes(actor.role ?? ""))
      throw new DomainError(403, "FORBIDDEN", "Không có quyền duyệt");
    if (actor.userId === creator)
      throw new DomainError(
        403,
        "SELF_REVIEW_FORBIDDEN",
        "Người tạo không được tự xác minh hoặc duyệt nội dung của mình",
      );
  }
}
