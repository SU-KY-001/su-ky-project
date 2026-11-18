import { ExhibitionDocumentSchema, PREMIUM_FEATURE_LIMITS, type ExhibitionDocument, type ExhibitionPodcastQuery } from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import type { ExhibitionRecord, ExhibitionRepository } from "../domain/exhibition.repository";
import { formatQuotaResetIn, reserveFeatureUsage } from "../../membership/application/feature-quota";

export class ExhibitionService {
  constructor(private readonly repository: ExhibitionRepository) {}

  listPublished() { return this.repository.listPublished(); }

  private async workspace(record: ExhibitionRecord) {
    return { id: record.id, slug: record.slug, revision: record.revision, updatedAt: record.updatedAt.toISOString(), publicationStatus: record.publishedRevision === null ? "UNPUBLISHED" as const : "PUBLISHED" as const, publishedRevision: record.publishedRevision, document: record.document, resolved: await this.repository.resolve(record.document), allowedActions: ["edit", "publish"] as ("edit" | "publish")[] };
  }

  list(ownerId: string, query: { q: string; status: "all" | "published" | "unpublished"; page: number; limit: number }) { return this.repository.list(ownerId, query); }
  podcastOptions(query: ExhibitionPodcastQuery) { return this.repository.podcastOptions(query); }

  async get(id: string, ownerId: string) {
    const record = await this.repository.find(id, ownerId);
    if (!record) throw new DomainError(404, "NOT_FOUND", "Không tìm thấy triển lãm");
    return this.workspace(record);
  }
  async publicExhibition(slug: string) {
    const document = await this.repository.findPublished(slug);
    if (!document) throw new DomainError(404, "NOT_FOUND", "Không tìm thấy triển lãm");
    return this.repository.resolve(document);
  }
  /** Claims the Free visitor's one exhibition per day; revisits of the same exhibition stay free. */
  async enterExhibition(slug: string, userId: string, role: string | null | undefined) {
    if (!await this.repository.findPublished(slug)) throw new DomainError(404, "NOT_FOUND", "Không tìm thấy triển lãm");
    const outcome = await reserveFeatureUsage({ userId, role, feature: "exhibition", refKey: slug });
    if (outcome === "limit")
      throw new DomainError(
        403,
        "DAILY_QUOTA_EXHAUSTED",
        `Mỗi ngày tài khoản Free được vào ${PREMIUM_FEATURE_LIMITS.exhibition} triển lãm. Đặt lại sau ${formatQuotaResetIn()}. Nâng cấp Premium để tham quan không giới hạn.`,
      );
  }
  async publish(id: string, ownerId: string, revision: number) {
    if (!await this.repository.find(id, ownerId)) throw new DomainError(404, "NOT_FOUND", "Không tìm thấy triển lãm");
    const published = await this.repository.publish(id, ownerId, revision);
    if (!published) throw new DomainError(409, "EXHIBITION_REVISION_CONFLICT", "Bản nháp đã thay đổi ở nơi khác");
    return this.workspace(published);
  }

  async create(ownerId: string, input: ExhibitionDocument) {
    return this.workspace(await this.repository.create(ownerId, ExhibitionDocumentSchema.parse(input)));
  }

  async saveDraft(id: string, ownerId: string, revision: number, input: ExhibitionDocument) {
    const current = await this.repository.find(id, ownerId);
    if (!current) throw new DomainError(404, "NOT_FOUND", "Không tìm thấy triển lãm");
    const document = ExhibitionDocumentSchema.parse(input);
    const saved = await this.repository.save(id, ownerId, revision, document);
    if (!saved) throw new DomainError(409, "EXHIBITION_REVISION_CONFLICT", "Bản nháp đã thay đổi ở nơi khác");
    return this.workspace(saved);
  }
}
