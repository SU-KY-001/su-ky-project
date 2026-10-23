import type { CatalogActor, HistoricalReadinessDto } from "@repo/shared";
import type {
  HistoricalEvidenceRepository,
  HistoricalNodeRecord,
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
    const rows = await this.repository.citations({ kind: "entity", id });
    if (!rows.length) reasons.push("MISSING_SOURCE");
    for (const c of rows) {
      if (!c.locator.trim()) reasons.push("MISSING_LOCATOR");
      if (c.source.archivedAt) reasons.push("SOURCE_ARCHIVED");
      if (c.source.version !== c.sourceVersion) reasons.push("SOURCE_OUTDATED");
      if (
        c.source.verificationStatus !== "VERIFIED" ||
        c.source.verifiedVersion !== c.sourceVersion
      )
        reasons.push("SOURCE_UNVERIFIED");
    }
    if (
      node.reviewStatus !== "APPROVED" ||
      node.reviewedVersion !== node.version
    )
      reasons.push("CONTENT_NOT_APPROVED");
    return { ready: reasons.length === 0, reasons: [...new Set(reasons)] };
  }
  async submitEntityReview(
    actor: CatalogActor,
    id: string,
    input: {
      baseVersion: number;
      expectedStatus: HistoricalNodeRecord["reviewStatus"];
    },
  ) {
    const node = await this.catalog.assertOwner(actor, "entity", id);
    this.assertEvent(node);
    if (!["DRAFT", "CHANGES_REQUESTED"].includes(input.expectedStatus))
      throw new DomainError(
        409,
        "INVALID_REVIEW_STATE",
        "Nội dung không ở trạng thái gửi duyệt",
      );
    const readiness = await this.getEntityReadiness(id);
    if (readiness.reasons.some((r) => r !== "CONTENT_NOT_APPROVED"))
      throw new DomainError(
        422,
        "CONTENT_NOT_READY",
        readiness.reasons
          .filter((r) => r !== "CONTENT_NOT_APPROVED")
          .join(", "),
      );
    await this.repository.reviewEntity(
      actor.userId,
      id,
      input.baseVersion,
      input.expectedStatus,
      "IN_REVIEW",
      "",
    );
    return this.catalog.detail("entity", id);
  }
  async reviewEntity(
    actor: CatalogActor,
    id: string,
    input: {
      baseVersion: number;
      expectedStatus: HistoricalNodeRecord["reviewStatus"];
      decision: "APPROVE" | "REQUEST_CHANGES";
      note: string;
    },
  ) {
    const node = await this.catalog.getNode("entity", id);
    this.assertEvent(node);
    this.assertReviewer(actor, node.createdById);
    if (input.expectedStatus !== "IN_REVIEW")
      throw new DomainError(
        409,
        "INVALID_REVIEW_STATE",
        "Nội dung chưa được gửi duyệt",
      );
    if (input.decision === "APPROVE") {
      const ready = await this.getEntityReadiness(id);
      if (ready.reasons.some((r) => r !== "CONTENT_NOT_APPROVED"))
        throw new DomainError(
          422,
          "CONTENT_NOT_READY",
          ready.reasons.join(", "),
        );
    }
    await this.repository.reviewEntity(
      actor.userId,
      id,
      input.baseVersion,
      input.expectedStatus,
      input.decision === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED",
      input.note,
    );
    return this.catalog.detail("entity", id);
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
  private assertEvent(node: HistoricalNodeRecord) {
    if (node.entityType !== "EVENT")
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Luồng kiểm duyệt này chỉ dành cho sự kiện",
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
