import {
  HistoricalEntityDetailSchema,
  PublicHistoricalEventSchema,
} from "@repo/shared";
import type {
  HistoricalEvidenceRepository,
  HistoricalNodeQuery,
} from "../domain/historical-catalog.repository";
import type { createHistoricalPresenter } from "./historical-catalog.mappers";
import { DomainError } from "../../../core/errors/domain-error";
export class PublicHistoricalService {
  constructor(
    readonly repository: HistoricalEvidenceRepository,
    readonly present: ReturnType<typeof createHistoricalPresenter>,
  ) {}
  private async event(id: string) {
    const node = HistoricalEntityDetailSchema.parse(
      await this.present("entity", id),
    );
    if (
      !node.readiness.ready ||
      !node.historicalPhase?.period ||
      !node.reviewedAt
    )
      throw new DomainError(404, "NOT_FOUND", "Sự kiện chưa công khai");
    return PublicHistoricalEventSchema.parse({
      id: node.id,
      slug: node.slug,
      name: node.name,
      summary: node.summary,
      time: node.time,
      timeLabel: node.timeLabel,
      parent: {
        phase: { id: node.historicalPhase.id, name: node.historicalPhase.name },
        period: node.historicalPhase.period,
      },
      reviewedAt: node.reviewedAt,
      citations: node.citations.map((c) => ({
        locator: c.locator,
        excerpt: c.excerpt,
        source: c.source,
      })),
    });
  }
  async getEvent(slug: string) {
    const result = await this.repository.listPublicEvents({
      page: 1,
      limit: 1,
      slug,
    });
    if (!result.ids[0])
      throw new DomainError(404, "NOT_FOUND", "Sự kiện chưa công khai");
    return this.event(result.ids[0]);
  }
  async listEvents(query: HistoricalNodeQuery) {
    const result = await this.repository.listPublicEvents(query);
    return {
      items: await Promise.all(result.ids.map((id) => this.event(id))),
      total: result.total,
      page: query.page,
      limit: query.limit,
    };
  }
}
