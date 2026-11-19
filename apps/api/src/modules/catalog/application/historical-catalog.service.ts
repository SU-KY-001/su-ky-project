import type { CatalogActor } from "@repo/shared";
import { canEditHistoricalContent, formatHistoricalTime, fromLegacyYearRange } from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import type {
  HistoricalCatalogRepository,
  HistoricalNodeKind,
  HistoricalNodeRecord,
  HistoricalNodeWrite,
  HistoricalNodeQuery,
  HistoricalNodeCounts,
} from "../domain/historical-catalog.repository";

export class HistoricalCatalogService {
  constructor(readonly repository: HistoricalCatalogRepository) {}
  async getNode(kind: HistoricalNodeKind, id: string) {
    const node = await this.repository.get(kind, id);
    if (!node)
      throw new DomainError(
        404,
        "NOT_FOUND",
        "Không tìm thấy nội dung lịch sử",
      );
    return node;
  }
  async assertOwner(actor: CatalogActor, kind: HistoricalNodeKind, id: string) {
    const node = await this.getNode(kind, id);
    if (!canEditHistoricalContent(actor, node.createdById, kind))
      throw new DomainError(
        403,
        "FORBIDDEN",
        "Bạn không có quyền chỉnh sửa nội dung lịch sử này",
      );
    return node;
  }
  async createNode(
    actor: CatalogActor,
    kind: HistoricalNodeKind,
    input: HistoricalNodeWrite & { name: string },
  ) {
    if (
      kind === "entity" &&
      input.entityType === "EVENT" &&
      !input.historicalPhaseId
    )
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Sự kiện cần giai đoạn cha",
      );
    if (kind === "phase" && !input.periodId)
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Giai đoạn cần thời kỳ cha",
      );
    const time =
      input.time ??
      fromLegacyYearRange({ startYear: null, endYear: null }, "CLOSED");
    return this.repository.create(kind, actor.userId, { ...input, time });
  }
  async patchNode(
    actor: CatalogActor,
    kind: HistoricalNodeKind,
    id: string,
    input: HistoricalNodeWrite & { baseVersion: number },
  ) {
    const node = await this.assertOwner(actor, kind, id);
    if (node.deletedAt)
      throw new DomainError(
        409,
        "CONTENT_IN_TRASH",
        "Khôi phục nội dung trước khi sửa",
      );
    if (
      kind === "entity" &&
      input.entityType &&
      input.entityType !== node.entityType
    )
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Không đổi loại thực thể sau khi tạo",
      );
    if (node.entityType === "EVENT" && input.historicalPhaseId === null)
      throw new DomainError(
        422,
        "VALIDATION_ERROR",
        "Sự kiện cần giai đoạn cha",
      );
    const { baseVersion, ...patch } = input;
    return this.repository.patch(kind, id, actor.userId, baseVersion, patch);
  }
  async deleteNode(
    actor: CatalogActor,
    kind: HistoricalNodeKind,
    id: string,
    version: number,
  ) {
    await this.assertOwner(actor, kind, id);
    return this.repository.setDeleted(kind, id, actor.userId, version, true);
  }
  async restoreNode(
    actor: CatalogActor,
    kind: HistoricalNodeKind,
    id: string,
    version: number,
  ) {
    await this.assertOwner(actor, kind, id);
    return this.repository.setDeleted(kind, id, actor.userId, version, false);
  }
  async listNodes(kind: HistoricalNodeKind, query: HistoricalNodeQuery) {
    const { items, total } = await this.repository.list(kind, query);
    const counts = await this.repository.counts(
      kind,
      items.map((n) => n.id),
    );
    return {
      items: items.map((n) => this.mapNode(n, counts.get(n.id))),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
  mapNode(
    node: HistoricalNodeRecord,
    counts: HistoricalNodeCounts = {
      childCount: 0,
      sourceCount: 0,
      citationCount: 0,
      podcastCount: 0,
    },
  ) {
    return {
      ...node,
      ...counts,
      timeLabel: formatHistoricalTime(node.time),
      citations: [],
      warnings: [],
    };
  }
  async detail(kind: HistoricalNodeKind, id: string) {
    const node = await this.getNode(kind, id);
    const counts = (await this.repository.counts(kind, [id])).get(id);
    return this.mapNode(node, counts);
  }
}
